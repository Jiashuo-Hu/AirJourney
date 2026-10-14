import type { CesiumWidget } from "@cesium/engine";
import { validViewport } from "./map-label-layout";
export type MapDiagnostics = {
  frames: number;
  skippedFrames: number;
  rebuilds: number;
  errors: string[];
  lastViewport: number[];
  state: string;
  drawnFrames?: number;
};
export function attachMapLoop(
  v: CesiumWidget,
  host: HTMLElement,
  d: MapDiagnostics,
  labels: (elapsed: number) => void,
  failed: (e: unknown) => void,
  recovered: () => void,
) {
  const gl = v.canvas.getContext("webgl2") || v.canvas.getContext("webgl");
  if (!gl) throw Error("WebGL is unavailable.");
  let stopped = false,
    paused = false,
    frame = 0,
    last = performance.now(),
    size = "",
    stable = 0,
    zeroSince = 0,
    first = true;
  const issue = (e: unknown) => {
    if (stopped || paused) return;
    paused = true;
    d.state = "recovering";
    d.errors.push(String(e));
    failed(e);
  };
  const lost = (e: Event) => {
    e.preventDefault();
    issue("WebGL context lost");
  };
  v.canvas.addEventListener("webglcontextlost", lost);
  const removeError = v.scene.renderError.addEventListener((_scene, error) =>
    issue(error),
  );
  const removeDraw = v.scene.postRender.addEventListener(() => {
    d.drawnFrames = (d.drawnFrames || 0) + 1;
  });
  v.scene.rethrowRenderErrors = true;
  function tick(now: number) {
    if (stopped || v.isDestroyed()) return;
    frame = requestAnimationFrame(tick);
    if (paused) return;
    const elapsed = now - last;
    last = now;
    const width = host.clientWidth,
      height = host.clientHeight;
    const next = width + "x" + height + "@" + devicePixelRatio;
    stable = next === size ? stable + 1 : 0;
    size = next;
    if (width < 1 || height < 1 || stable < 1) {
      d.skippedFrames++;
      d.state = "waiting for viewport";
      return;
    }
    if (gl!.isContextLost()) {
      issue("WebGL context lost");
      return;
    }
    try {
      // Cap framebuffer allocation while retaining normal DPR rendering. Disable
      // separate multisample targets in the widget to reduce GPU memory pressure.
      const dpr = Math.max(1, devicePixelRatio || 1),
        pixels = width * height * dpr * dpr;
      const scale = Math.min(
        1,
        Math.sqrt(4_000_000 / pixels),
        4096 / (width * dpr),
        4096 / (height * dpr),
      );
      if (Math.abs(v.resolutionScale - scale) > 0.001)
        v.resolutionScale = scale;
      v.resize();
      const bw = gl!.drawingBufferWidth,
        bh = gl!.drawingBufferHeight;
      d.lastViewport = [width, height, bw, bh];
      if (!validViewport(width, height, bw, bh, gl!.isContextLost())) {
        d.skippedFrames++;
        d.state = "waiting for drawing buffer";
        if (!zeroSince) zeroSince = now;
        else if (now - zeroSince > 1000)
          issue("WebGL drawing buffer remained empty");
        return;
      }
      zeroSince = 0;
      d.state = "running";
      v.render();
      labels(elapsed);
      d.frames++;
      if (first) {
        first = false;
        recovered();
      }
    } catch (e) {
      issue(e);
    }
  }
  frame = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    removeError();
    removeDraw();
    v.canvas.removeEventListener("webglcontextlost", lost);
  };
}
