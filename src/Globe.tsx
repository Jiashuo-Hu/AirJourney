import { useEffect, useRef, useState } from "react";
import * as C from "@cesium/engine";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Flight, Settings } from "./types";
import { hasLocation, route, distance } from "./domain";
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
  picking,
  onPick,
  onHome,
  onView,
  focusRequest,
}: {
  flights: Flight[];
  selected: string | null;
  settings: Settings;
  onSelect: (id: string) => void;
  picking: boolean;
  onPick: (lat: number, lon: number) => void;
  onHome: (v: number[]) => void;
  onView: (v: number[]) => void;
  focusRequest: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    viewer = useRef<C.CesiumWidget | null>(null),
    clicks = useRef({ onSelect, onPick, picking, onView }),
    [error, setError] = useState(""),
    [ready, setReady] = useState(0),
    [group, setGroup] = useState<string[]>([]);
  clicks.current = { onSelect, onPick, picking, onView };
  useEffect(() => {
    let v: C.CesiumWidget | undefined,
      disposed = false;
    let clickTimer: ReturnType<typeof setTimeout> | undefined;
    let removeWheel: (() => void) | undefined;
    try {
      v = new C.CesiumWidget(host.current!, {
        baseLayer: false,
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
        if (!clicks.current.picking) zoom(out ? 1.5 : 0.65);
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
        settings.remember && settings.lastView
          ? settings.lastView
          : settings.home;
      v.camera.setView({
        destination: C.Cartesian3.fromDegrees(start[0], start[1], start[2]),
      });
      v.screenSpaceEventHandler.setInputAction((evt: any) => {
        const api = clicks.current;
        if (api.picking) {
          const p = v!.camera.pickEllipsoid(evt.position);
          if (p) {
            const loc = C.Cartographic.fromCartesian(p);
            api.onPick(
              C.Math.toDegrees(loc.latitude),
              C.Math.toDegrees(loc.longitude),
            );
          }
          return;
        }
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          const picked = v!.scene.pick(evt.position),
            ids = picked?.id?.properties?.flightIds?.getValue();
          if (ids?.length) {
            if (ids.length > 1) setGroup(ids);
            else api.onSelect(ids[0]);
          }
        }, 250);
      }, C.ScreenSpaceEventType.LEFT_CLICK);
      v.scene.renderError.addEventListener((_scene, err) =>
        setError(
          "Globe rendering unavailable. Flight management still works. " +
            String(err),
        ),
      );
      setReady((x) => x + 1);
    } catch (e) {
      setError("Globe unavailable. Check local resources / GPU. " + String(e));
    }
    return () => {
      disposed = true;
      if (clickTimer) clearTimeout(clickTimer);
      removeWheel?.();
      if (v && !v.isDestroyed()) v.destroy();
      viewer.current = null;
    };
  }, []);
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    v.entities.removeAll();
    function labelVisibility(lon: number, lat: number) {
      const normal = C.Cartesian3.normalize(
        C.Cartesian3.fromDegrees(lon, lat),
        new C.Cartesian3(),
      );
      const cameraNormal = new C.Cartesian3();
      return new C.CallbackProperty(
        () =>
          C.Cartesian3.dot(
            normal,
            C.Cartesian3.normalize(v!.camera.positionWC, cameraNormal),
          ) >
          6378137 / C.Cartesian3.magnitude(v!.camera.positionWC) + 0.02,
        false,
      );
    }
    const groups = new Map<string, Flight[]>();
    for (const f of flights) {
      if (!f.visible || !hasLocation(f.from) || !hasLocation(f.to)) continue;
      const key = [f.from.id, f.to.id].sort().join("|");
      groups.set(key, [...(groups.get(key) || []), f]);
    }
    for (const fs of groups.values()) {
      const f = fs.find((f) => f.id === selected) || fs[0],
        picked = fs.some((f) => f.id === selected),
        color = C.Color.fromCssColorString(
          f.color || settings.routeColor,
        ).withAlpha(
          selected && !picked ? settings.opacity * 0.35 : settings.opacity,
        );
      const coords = route(f.from, f.to, settings.routeHeight).flat();
      v.entities.add({
        id: "route-" + f.id,
        polyline: {
          positions: C.Cartesian3.fromDegreesArrayHeights(coords),
          width: settings.width + (picked ? 2 : 0),
          arcType: C.ArcType.NONE,
          material: new C.PolylineOutlineMaterialProperty({
            color,
            outlineColor: C.Color.fromCssColorString("#102438").withAlpha(
              color.alpha * 0.8,
            ),
            outlineWidth: 1,
          }),
        },
        properties: { flightIds: fs.map((f) => f.id) },
      });
      const positions = route(f.from, f.to, settings.routeHeight);
      v.entities.add({
        id: "direction-" + f.id,
        polyline: {
          positions: C.Cartesian3.fromDegreesArrayHeights(
            positions
              .slice(
                Math.floor(positions.length * 0.5),
                Math.floor(positions.length * 0.62) + 1,
              )
              .map(([lon, lat, height]) => [lon, lat, height + 500])
              .flat(),
          ),
          width: Math.max(8, settings.width + 4 + (picked ? 2 : 0)),
          arcType: C.ArcType.NONE,
          material: new C.PolylineArrowMaterialProperty(color),
        },
        properties: { flightIds: fs.map((f) => f.id) },
      });
    }
    const ports = new Map<string, { p: Flight["from"]; ids: string[] }>();
    for (const f of flights.filter(
      (f) => f.visible && hasLocation(f.from) && hasLocation(f.to),
    )) {
      for (const p of [f.from, f.to]) {
        const x = ports.get(p.id) || { p, ids: [] };
        if (!x.ids.includes(f.id)) x.ids.push(f.id);
        ports.set(p.id, x);
      }
    }
    for (const { p, ids } of ports.values())
      v.entities.add({
        id: "point-" + p.id,
        position: C.Cartesian3.fromDegrees(p.lon!, p.lat!, 5000),
        point: {
          pixelSize: settings.markerSize,
          color: C.Color.WHITE,
          outlineColor: C.Color.fromCssColorString(settings.routeColor),
          outlineWidth: 2,
        },
        label: settings.labels
          ? {
              text: p.code || p.name,
              show: labelVisibility(p.lon!, p.lat!),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              font: "600 28px Inter",
              fillColor: C.Color.WHITE,
              showBackground: true,
              backgroundColor:
                C.Color.fromCssColorString("#102438").withAlpha(0.94),
              pixelOffset: new C.Cartesian2(10, -16),
              distanceDisplayCondition: new C.DistanceDisplayCondition(
                0,
                16000000,
              ),
              scale: 0.5,
            }
          : undefined,
        properties: { flightIds: ids },
      });
    if (settings.labels)
      for (const place of mapLabels)
        v.entities.add({
          id: "label-" + place.name,
          position: C.Cartesian3.fromDegrees(place.lon, place.lat, 8000),
          label: {
            text: place.name,
            show: labelVisibility(place.lon, place.lat),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            font: "600 28px Inter",
            fillColor: C.Color.WHITE,
            outlineColor: C.Color.fromCssColorString("#102438"),
            outlineWidth: 4,
            scale: 0.5,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            distanceDisplayCondition: new C.DistanceDisplayCondition(
              1000000,
              28000000,
            ),
          },
        });
    v.scene.requestRender();
  }, [flights, selected, settings, ready]);
  useEffect(() => {
    const v = viewer.current,
      f = flights.find((f) => f.id === selected);
    if (v && f && hasLocation(f.from) && hasLocation(f.to)) {
      const e = v.entities.getById("route-" + f.id);
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
        if (!canceled) {
          v.imageryLayers.removeAll();
          v.imageryLayers.addImageryProvider(provider);
          v.scene.requestRender();
        }
      })
      .catch(async (e) => {
        if (settings.mapImage) {
          setError("Local map image could not be loaded. " + String(e));
          return;
        }
        try {
          const provider = await C.SingleTileImageryProvider.fromUrl(
            "./maps/naturalearth-4096.jpg",
          );
          if (!canceled) {
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
    <section
      className={"globe " + (picking ? "picking" : "")}
      aria-label="Local three dimensional globe"
    >
      <div ref={host} className="canvas" />
      {error && (
        <div className="map-error" role="alert">
          {error}
        </div>
      )}
      <div className="globe-heading">
        <span className="eyebrow">YOUR WORLD, CONNECTED</span>
        <h1>
          Every journey
          <br />
          has a place.
        </h1>
        <span>Local globe · Your own flight records</span>
      </div>
      <div className="map-tools">
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
      </div>
      <div className="map-help" aria-label="Map controls">
        Drag to rotate · Scroll / pinch to zoom
        <br />
        Double-click to zoom in · Shift + double-click to zoom out
      </div>
      {picking && (
        <div className="pick-banner">
          Click the globe to preview a location.
        </div>
      )}
      <div className="map-footer">
        <span>
          <i /> Route illustration · WGS84
        </span>
        <span>Natural Earth II · Local 8K detail · Regional view</span>
      </div>
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
