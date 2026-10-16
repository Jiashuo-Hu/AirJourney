import { attachMapLoop, type MapDiagnostics } from "./map-runtime";
import { airportMarkerPixels } from "./map-style";
import {
  airportHoverCode,
  fadeLabel,
  selectLabels,
  type LabelBox,
} from "./map-label-layout";
import { useEffect, useMemo, useRef, useState } from "react";
import * as C from "@cesium/engine";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Flight, Settings } from "./types";
import { hasLocation, distance } from "./domain";
import {
  endpointKey,
  groupRoutes,
  laneRoute,
  routeLanes,
  routeWidth,
} from "./route-layout";
import mapLabels from "./map-labels.json";
(window as any).CESIUM_BASE_URL = "./cesium/";
C.Ion.defaultAccessToken = "";
C.CreditDisplay.cesiumCredit = new C.Credit(
  "CesiumJS · local resources",
  false,
);
export function Globe({
  flights,
  selected,
  settings,
  onSelect,
  onHome,
  onView,
  onRepeatMode,
  focusRequest,
}: {
  flights: Flight[];
  selected: string | null;
  settings: Settings;
  onSelect: (id: string) => void;
  onHome: (v: number[]) => void;
  onView: (v: number[]) => void;
  onRepeatMode: (mode: "thick" | "separate") => void;
  focusRequest: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    viewer = useRef<C.CesiumWidget | null>(null),
    clicks = useRef({ onSelect, onView }),
    [error, setError] = useState(""),
    [ready, setReady] = useState(0),
    [group, setGroup] = useState<string[]>([]),
    [hoverCount, setHoverCount] = useState(0),
    [generation, setGeneration] = useState(0);
  const savedCamera = useRef<
      | { position: number[]; heading: number; pitch: number; roll: number }
      | undefined
    >(undefined),
    hoverIds = useRef<string[]>([]),
    nodes = useRef(new Map<string, HTMLSpanElement>()),
    alpha = useRef(new Map<string, number>()),
    failures = useRef<number[]>([]),
    lastFocus = useRef<{ selected: string | null; request: number } | null>(
      null,
    ),
    labelUpdate = useRef((elapsed: number) => {}),
    diagnostic = useRef<MapDiagnostics>({
      frames: 0,
      skippedFrames: 0,
      rebuilds: 0,
      errors: [],
      lastViewport: [],
      state: "starting",
    });
  const geometryKey = JSON.stringify(
    flights.map((f) => ({
      id: f.id,
      from: f.from,
      to: f.to,
      visible: f.visible,
      color: f.color,
    })),
  );
  const labels = useMemo(() => {
    const ports = new Map<
      string,
      {
        id: string;
        text: string;
        lon: number;
        lat: number;
        ids: string[];
        airport: boolean;
        priority: number;
      }
    >();
    for (const f of flights.filter((f) => f.visible))
      for (const p of [f.from, f.to]) {
        const code = airportHoverCode(p);
        if (!hasLocation(p) || !code) continue;
        const id = "airport-" + p.id + "@" + p.lon + "," + p.lat;
        const e = ports.get(id) || {
          id,
          text: code.toUpperCase(),
          lon: p.lon!,
          lat: p.lat!,
          ids: [],
          airport: true,
          priority: 1000,
        };
        e.ids.push(f.id);
        ports.set(id, e);
      }
    return [
      ...ports.values(),
      ...mapLabels.map((p) => ({
        id: "country-" + p.name,
        text: p.name,
        lon: p.lon,
        lat: p.lat,
        ids: [],
        airport: false,
        priority: p.priority,
      })),
    ];
  }, [geometryKey]);
  labelUpdate.current = (elapsed) => {
    const v = viewer.current;
    if (!v) return;
    const cam = C.Cartesian3.normalize(v.camera.positionWC, new C.Cartesian3()),
      horizon = 6378137 / C.Cartesian3.magnitude(v.camera.positionWC) + 0.02;
    const boxes: LabelBox[] = [],
      airportBoxes: LabelBox[] = [],
      positions = new Map<string, { x: number; y: number }>(),
      desired = new Set<string>();
    for (const d of labels) {
      const node = nodes.current.get(d.id);
      if (!node) continue;
      const pos = C.Cartesian3.fromDegrees(d.lon, d.lat, 8000),
        front =
          C.Cartesian3.dot(
            C.Cartesian3.normalize(pos, new C.Cartesian3()),
            cam,
          ) > horizon;
      const p = v.scene.cartesianToCanvasCoordinates(pos);
      const visible =
        !!p &&
        front &&
        p.x > (node.offsetWidth || 40) / 2 + 8 &&
        p.x < v.canvas.clientWidth - (node.offsetWidth || 40) / 2 - 8 &&
        p.y > 12 &&
        p.y < v.canvas.clientHeight - 12 &&
        settings.labels;
      if (!p) continue;
      let x = p.x,
        y = p.y;
      const b = {
        id: d.id,
        x,
        y,
        width: node.offsetWidth || d.text.length * 8 + 14,
        height: 22,
        priority: d.priority,
        visible,
      };
      if (d.airport) {
        b.visible =
          visible && d.ids.some((id) => hoverIds.current.includes(id));
        y -= 22;
        for (
          let n = 0;
          n < 5 &&
          airportBoxes.some(
            (a) =>
              Math.abs(a.x - x) < (a.width + b.width) / 2 + 6 &&
              Math.abs(a.y - y) < 24,
          );
          n++
        )
          y += 26;
        b.x = x;
        b.y = y;
        if (b.visible) {
          airportBoxes.push(b);
          desired.add(d.id);
        }
      } else boxes.push(b);
      positions.set(d.id, { x, y });
    }
    const kept = selectLabels([...airportBoxes, ...boxes]);
    for (const id of kept) desired.add(id);
    for (const d of labels) {
      const n = nodes.current.get(d.id);
      if (!n) continue;
      const a = fadeLabel(
        alpha.current.get(d.id) || 0,
        desired.has(d.id) ? 1 : 0,
        elapsed,
        settings.reducedMotion,
      );
      alpha.current.set(d.id, a);
      n.style.opacity = String(a);
      n.dataset.alpha = a.toFixed(3);
      n.style.visibility = a > 0 ? "visible" : "hidden";
      const pos = positions.get(d.id);
      if (pos) {
        n.style.left = pos.x + "px";
        n.style.top = pos.y + "px";
      }
    }
  };
  clicks.current = { onSelect, onView };
  useEffect(() => {
    let v: C.CesiumWidget | undefined,
      disposed = false;
    let clickTimer: ReturnType<typeof setTimeout> | undefined;
    let removeWheel: (() => void) | undefined;
    let stopLoop: (() => void) | undefined;
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
    let hoverTime = 0;
    try {
      v = new C.CesiumWidget(host.current!, {
        baseLayer: false,
        useDefaultRenderLoop: false,
        showRenderLoopErrors: false,
        msaaSamples: 4,
        terrainProvider: new C.EllipsoidTerrainProvider(),
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        skyBox: false,
        skyAtmosphere: new C.SkyAtmosphere(),
        useBrowserRecommendedResolution: false,
        contextOptions: { webgl: { antialias: true } },
      });
      viewer.current = v;
      if (window.airjourney?.testing) (window as any).__ajTestGlobe = v;
      v.scene.backgroundColor = C.Color.fromCssColorString("#0c1725");
      v.scene.globe.baseColor = C.Color.fromCssColorString("#2b4b60");
      v.scene.globe.enableLighting = false;
      v.scene.msaaSamples = 4;
      v.scene.postProcessStages.fxaa.enabled = true;
      v.scene.globe.maximumScreenSpaceError = 1;
      v.scene.globe.tileCacheSize = 180;
      v.scene.screenSpaceCameraController.minimumZoomDistance = 1500000;
      v.scene.screenSpaceCameraController.maximumZoomDistance = 40000000;
      const controller = v.scene.screenSpaceCameraController;
      controller.zoomEventTypes = [
        C.CameraEventType.RIGHT_DRAG,
        C.CameraEventType.PINCH,
      ];
      controller.tiltEventTypes = [
        C.CameraEventType.MIDDLE_DRAG,
        {
          eventType: C.CameraEventType.LEFT_DRAG,
          modifier: C.KeyboardEventModifier.CTRL,
        },
      ];
      controller.inertiaZoom = 0;
      function zoom(factor: number) {
        if (!v) return;
        v.camera.cancelFlight();
        const height = v.camera.positionCartographic.height;
        const next = Math.max(1500000, Math.min(40000000, height * factor));
        if (next < height) v.camera.zoomIn(height - next);
        else v.camera.zoomOut(next - height);
        v.scene.requestRender();
      }
      const wheel = (event: WheelEvent) => {
        event.preventDefault();
        if (!event.deltaY) return;
        const pixels =
          event.deltaY *
          (event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? v!.canvas.clientHeight
              : 1);
        zoom(
          Math.exp(
            Math.max(-300, Math.min(300, pixels)) *
              (event.ctrlKey ? 0.006 : 0.0018),
          ),
        );
      };
      v.canvas.addEventListener("wheel", wheel, { passive: false });
      removeWheel = () => v?.canvas.removeEventListener("wheel", wheel);
      const doubleClick = (out = false) => {
        if (clickTimer) clearTimeout(clickTimer);
        zoom(out ? 1.5 : 0.65);
      };
      v.screenSpaceEventHandler.setInputAction(
        () => doubleClick(),
        C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
      );
      v.screenSpaceEventHandler.setInputAction(
        () => doubleClick(true),
        C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
        C.KeyboardEventModifier.SHIFT,
      );
      // Ellipsoid-only imagery: avoid terrain LOD depth noise hiding low routes.
      // Cesium still occludes primitives on the opposite side of the globe.
      v.scene.globe.depthTestAgainstTerrain = false;
      const start =
        savedCamera.current?.position ||
        (settings.remember && settings.lastView
          ? settings.lastView
          : settings.home);
      v.camera.setView({
        destination: C.Cartesian3.fromDegrees(start[0], start[1], start[2]),
        orientation: savedCamera.current
          ? {
              heading: savedCamera.current.heading,
              pitch: savedCamera.current.pitch,
              roll: savedCamera.current.roll,
            }
          : undefined,
      });
      v.screenSpaceEventHandler.setInputAction((evt: any) => {
        const api = clicks.current;
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          if (
            disposed ||
            v!.isDestroyed() ||
            diagnostic.current.state !== "running"
          )
            return;
          const picked = v!.scene.pick(evt.position),
            ids = picked?.id?.properties?.flightIds?.getValue();
          if (ids?.length) {
            if (ids.length > 1) setGroup(ids);
            else api.onSelect(ids[0]);
          }
        }, 250);
      }, C.ScreenSpaceEventType.LEFT_CLICK);
      const failure = (err: unknown) => {
        if (disposed || recoveryTimer) return;
        const message = String(err);
        if (diagnostic.current.errors.at(-1) !== message)
          diagnostic.current.errors.push(message);
        const p = v!.camera.positionCartographic;
        savedCamera.current = {
          position: [
            C.Math.toDegrees(p.longitude),
            C.Math.toDegrees(p.latitude),
            Math.max(1500000, p.height),
          ],
          heading: v!.camera.heading,
          pitch: v!.camera.pitch,
          roll: v!.camera.roll,
        };
        const now = Date.now();
        failures.current = failures.current.filter((t) => now - t < 30000);
        setError(
          "Map paused. " +
            (failures.current.length < 2
              ? "Recovering…"
              : "Use Restart map to try again."),
        );
        if (failures.current.length < 2) {
          failures.current.push(now);
          recoveryTimer = setTimeout(() => {
            if (!disposed) {
              diagnostic.current.rebuilds++;
              setGeneration((g) => g + 1);
            }
          }, 200);
        }
      };
      stopLoop = attachMapLoop(
        v,
        host.current!,
        diagnostic.current,
        (dt) => labelUpdate.current(dt),
        failure,
        () => setError(""),
      );
      v.screenSpaceEventHandler.setInputAction((evt: any) => {
        if (diagnostic.current.state !== "running") return;
        if (performance.now() - hoverTime < 50) return;
        hoverTime = performance.now();
        try {
          const p = v!.scene
            .drillPick(evt.endPosition, 8)
            .find(
              (hit) =>
                hit?.id?.id?.startsWith("route-") ||
                hit?.id?.id?.startsWith("direction-"),
            );
          hoverIds.current = p ? p.id.properties.flightIds.getValue() : [];
          setHoverCount(p?.id?.properties?.routeCount?.getValue() || 0);
        } catch (e) {
          hoverIds.current = [];
          failure(e);
        }
      }, C.ScreenSpaceEventType.MOUSE_MOVE);
      v.canvas.addEventListener("mouseleave", () => {
        hoverIds.current = [];
        setHoverCount(0);
      });
      if (window.airjourney?.testing)
        (window as any).__ajMapDiagnostics = diagnostic.current;
      setReady((x) => x + 1);
    } catch (e) {
      setError("Globe unavailable. Check local resources / GPU. " + String(e));
    }
    return () => {
      disposed = true;
      if (clickTimer) clearTimeout(clickTimer);
      stopLoop?.();
      if (recoveryTimer) clearTimeout(recoveryTimer);
      removeWheel?.();
      const gl =
        v?.canvas.getContext("webgl2") || v?.canvas.getContext("webgl");
      const release = gl?.getExtension("WEBGL_lose_context");
      if (v && !v.isDestroyed()) v.destroy();
      if (gl && !gl.isContextLost()) release?.loseContext();
      hoverIds.current = [];
      viewer.current = null;
    };
  }, [generation]);
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    v.entities.removeAll();
    hoverIds.current = [];
    setHoverCount(0);
    const endpointStyles = new Map<string, {width: number; color: C.Color; selected: boolean}>();
    for (const fs of groupRoutes(flights)) {
      for (const lane of routeLanes(
        fs,
        settings.repeatRoutes === "separate",
        selected,
      )) {
        const list = lane.flights;
        const f = list.find((f) => f.id === selected) || list[0],
          picked = list.some((f) => f.id === selected),
          color = C.Color.fromCssColorString(
            f.color || settings.routeColor,
          ).withAlpha(
            selected && !picked ? settings.opacity * 0.35 : settings.opacity,
          );
        const positions = laneRoute(
          f.from,
          f.to,
          lane.offset,
          settings.routeHeight,
        );
        const coords = positions.flat();
        const width =
          settings.repeatRoutes === "separate"
            ? settings.width + (picked ? 2 : 0)
            : routeWidth(settings.width, fs.length, picked);
        for (const p of [f.from, f.to]) {
          const key = endpointKey(p), previous = endpointStyles.get(key);
          endpointStyles.set(key, {
            width: Math.max(width, previous?.width || 0),
            color: picked || (!previous?.selected && width >= (previous?.width || 0)) ? color : previous!.color,
            selected: picked || !!previous?.selected,
          });
        }
        v.entities.add({
          id: "route-" + f.id,
          polyline: {
            positions: C.Cartesian3.fromDegreesArrayHeights(coords),
            width,
            arcType: C.ArcType.NONE,
            material: new C.ColorMaterialProperty(color),
          },
          properties: {
            flightIds: list.map((f) => f.id),
            routeCount: fs.length,
            laneOffset: lane.offset,
            selected: picked,
          },
        });
        for (const reverse of [false, true]) {
          const directionFlights = list.filter(
            (x) => (endpointKey(x.from) !== endpointKey(f.from)) === reverse,
          );
          if (!directionFlights.length) continue;
          const directed = reverse ? [...positions].reverse() : positions;
          v.entities.add({
            id: "direction-" + (reverse ? "return-" : "") + f.id,
            polyline: {
              positions: C.Cartesian3.fromDegreesArrayHeights(
                directed
                  .slice(
                    Math.floor(directed.length * 0.5),
                    Math.floor(directed.length * 0.62) + 1,
                  )
                  .map(([lon, lat, height]) => [lon, lat, height + 500])
                  .flat(),
              ),
              width: Math.max(8, width + 3),
              arcType: C.ArcType.NONE,
              material: new C.PolylineArrowMaterialProperty(color),
            },
            properties: {
              flightIds: directionFlights.map((f) => f.id),
              routeCount: fs.length,
              directionFrom:
                directionFlights[0].from.code || directionFlights[0].from.name,
              directionTo:
                directionFlights[0].to.code || directionFlights[0].to.name,
            },
          });
        }
      }
    }
    const ports = new Map<string, { p: Flight["from"]; ids: string[] }>();
    for (const f of flights.filter((f) => f.visible)) {
      for (const p of [f.from, f.to]) {
        if (!hasLocation(p)) continue;
        const x = ports.get(endpointKey(p)) || { p, ids: [] };
        if (!x.ids.includes(f.id)) x.ids.push(f.id);
        ports.set(endpointKey(p), x);
      }
    }
    for (const [key, { p, ids }] of ports.entries())
      v.entities.add({
        id: v.entities.getById("point-" + p.id)
          ? "point-" + key
          : "point-" + p.id,
        position: C.Cartesian3.fromDegrees(p.lon!, p.lat!, 4000),
        point: {
          pixelSize: airportMarkerPixels(settings.markerSize, endpointStyles.get(key)?.width || 0, ids.includes(selected || "")),
          color:
            p.locationKind === "approximate"
              ? C.Color.fromCssColorString("#f4b44e")
              : (endpointStyles.get(key)?.color || C.Color.fromCssColorString(settings.routeColor)).withAlpha(1),
          outlineColor: C.Color.WHITE.withAlpha(ids.includes(selected || "") ? 1 : 0.88),
          outlineWidth: ids.includes(selected || "") ? 2.5 : 1.5,
          scaleByDistance: new C.NearFarScalar(1500000, 1.1, 30000000, 0.85),
        },
        properties: { flightIds: ids },
      });
    v.scene.requestRender();
    // Polyline geometry is prepared asynchronously. Keep frames flowing briefly
    // after rebuilding so the final primitive also reaches the static scene.
    const until = performance.now() + 3000;
    const remove = v.scene.postRender.addEventListener(() => {
      if (performance.now() < until) v.scene.requestRender();
    });
    const timer = setTimeout(remove, 3100);
    return () => {
      clearTimeout(timer);
      remove();
    };
  }, [
    geometryKey,
    selected,
    settings.routeColor,
    settings.routeHeight,
    settings.repeatRoutes,
    settings.opacity,
    settings.width,
    settings.markerSize,
    settings.labels,
    ready,
  ]);
  useEffect(() => {
    if (
      savedCamera.current &&
      lastFocus.current?.selected === selected &&
      lastFocus.current.request === focusRequest
    )
      return;
    lastFocus.current = { selected, request: focusRequest };
    const v = viewer.current,
      f = flights.find((f) => f.id === selected);
    if (v && f && hasLocation(f.from) && hasLocation(f.to)) {
      const e = v.entities.values.find(
        (e) =>
          e.id.startsWith("route-") &&
          e.properties?.flightIds?.getValue().includes(f.id),
      );
      if (e)
        v.flyTo(e, {
          duration: settings.reducedMotion ? 0 : 0.7,
          offset: new C.HeadingPitchRange(
            0,
            -Math.PI / 2,
            Math.max(3500000, (distance(f.from, f.to) || 0) * 0.9),
          ),
        });
    }
  }, [selected, focusRequest, ready]);
  useEffect(() => {
    const v = viewer.current;
    if (!v || !settings.remember) return;
    return v.camera.moveEnd.addEventListener(() => {
      const p = v.camera.positionCartographic;
      clicks.current.onView([
        C.Math.toDegrees(p.longitude),
        C.Math.toDegrees(p.latitude),
        Math.max(500000, Math.min(40000000, p.height)),
      ]);
    });
  }, [settings.remember, ready]);
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    let canceled = false;
    const imagery = settings.mapImage
      ? C.SingleTileImageryProvider.fromUrl(settings.mapImage, {
          credit: settings.mapImage
            ? "User supplied local imagery"
            : "Natural Earth II · public domain",
        })
      : Promise.resolve(
          new C.UrlTemplateImageryProvider({
            url: "./maps/naturalearth/{z}/{x}/{y}.jpg",
            tilingScheme: new C.GeographicTilingScheme(),
            tileWidth: 512,
            tileHeight: 512,
            maximumLevel: 3,
            credit: "Natural Earth II · local 8K tile pyramid",
          }),
        );
    imagery
      .then((provider) => {
        if (!canceled && !v.isDestroyed()) {
          v.imageryLayers.removeAll();
          v.imageryLayers.addImageryProvider(provider);
          v.scene.requestRender();
        }
      })
      .catch(async (e) => {
        if (canceled || v.isDestroyed()) return;
        if (settings.mapImage) {
          setError("Local map image could not be loaded. " + String(e));
          return;
        }
        try {
          const provider = await C.SingleTileImageryProvider.fromUrl(
            "./maps/naturalearth-4096.jpg",
          );
          if (!canceled && !v.isDestroyed()) {
            v.imageryLayers.removeAll();
            v.imageryLayers.addImageryProvider(provider);
            v.scene.requestRender();
          }
        } catch {
          setError(
            "Bundled map imagery is missing. Flight management still works.",
          );
        }
      });
    return () => {
      canceled = true;
    };
  }, [settings.mapImage, ready]);
  function restartMap() {
    const v = viewer.current;
    if (v && !v.isDestroyed()) {
      const p = v.camera.positionCartographic;
      savedCamera.current = {
        position: [
          C.Math.toDegrees(p.longitude),
          C.Math.toDegrees(p.latitude),
          p.height,
        ],
        heading: v.camera.heading,
        pitch: v.camera.pitch,
        roll: v.camera.roll,
      };
    }
    failures.current = [];
    diagnostic.current.rebuilds++;
    setGeneration((g) => g + 1);
  }
  function reset() {
    const v = viewer.current;
    if (v)
      v.camera.flyTo({
        destination: C.Cartesian3.fromDegrees(
          ...(settings.home as [number, number, number]),
        ),
        duration: settings.reducedMotion ? 0 : 0.8,
      });
  }
  return (
    <section className="globe" aria-label="Local three dimensional globe">
      <div ref={host} className="canvas" />
      <div className="globe-labels" aria-hidden="true">
        {labels.map((d) => (
          <span
            key={d.id}
            data-label-id={d.id}
            data-kind={d.airport ? "airport" : "country"}
            className={d.airport ? "airport-hover-label" : "country-map-label"}
            ref={(n) => {
              if (n) nodes.current.set(d.id, n);
              else nodes.current.delete(d.id);
            }}
          >
            {d.text}
          </span>
        ))}
      </div>
      {error && (
        <div className="map-error" role="alert">
          {error}{" "}
          <button
            onClick={() => {
              restartMap();
            }}
          >
            Restart map
          </button>
        </div>
      )}
      <div className="map-tools">
        <label className="repeat-mode">
          Repeated routes
          <select
            aria-label="Map repeated routes"
            value={settings.repeatRoutes || "thick"}
            onChange={(e) =>
              onRepeatMode(e.target.value as "thick" | "separate")
            }
          >
            <option value="thick">Thicker by count</option>
            <option value="separate">Separate lines</option>
          </select>
        </label>
        <button onClick={reset}>↺ Reset view</button>
        <button
          aria-label="Zoom in"
          onClick={() => {
            viewer.current?.camera.zoomIn(
              Math.min(
                viewer.current.camera.positionCartographic.height * 0.25,
                Math.max(
                  0,
                  viewer.current.camera.positionCartographic.height - 1500000,
                ),
              ),
            );
            viewer.current?.scene.requestRender();
          }}
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => {
            viewer.current?.camera.zoomOut(
              Math.min(
                viewer.current.camera.positionCartographic.height * 0.25,
                Math.max(
                  0,
                  40000000 - viewer.current.camera.positionCartographic.height,
                ),
              ),
            );
            viewer.current?.scene.requestRender();
          }}
        >
          −
        </button>
        <details className="map-more">
          <summary aria-label="More map controls">•••</summary>
          <div className="map-menu">
            <button
              onClick={() => {
                const p = viewer.current?.camera.positionCartographic;
                if (p)
                  onHome([
                    C.Math.toDegrees(p.longitude),
                    C.Math.toDegrees(p.latitude),
                    p.height,
                  ]);
              }}
            >
              Save home view
            </button>
            <p>Drag to rotate · Scroll / pinch to zoom</p>
            <button onClick={restartMap}>Restart map</button>
            <p>
              Double-click to zoom in
              <br />
              Shift + double-click to zoom out
            </p>
            <p>
              Illustrative routes · WGS84
              <br />
              Natural Earth II · local imagery
            </p>
          </div>
        </details>
      </div>
      {hoverCount > 1 && (
        <div className="route-count" role="status">
          {hoverCount.toLocaleString("en-US")} flights on this airport pair
        </div>
      )}
      {group.length > 0 && (
        <div className="route-popover">
          <div className="row">
            <strong>{group.length} flights at this location / route</strong>
            <button onClick={() => setGroup([])}>Close</button>
          </div>
          {group.map((id) => {
            const f = flights.find((f) => f.id === id);
            return (
              f && (
                <button
                  key={id}
                  onClick={() => {
                    onSelect(id);
                    setGroup([]);
                  }}
                >
                  {f.number || "Unnamed flight"} · {f.from.code || f.from.name}{" "}
                  → {f.to.code || f.to.name} · {f.departure.date || "Undated"}
                </button>
              )
            );
          })}
        </div>
      )}
    </section>
  );
}
