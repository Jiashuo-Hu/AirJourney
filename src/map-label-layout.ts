export type LabelBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
  visible: boolean;
};
export function airportHoverCode(p: { iata?: string; code?: string }) {
  const value = [p.iata, p.code].find((c) => /^[A-Z]{3}$/i.test(c || ""));
  return value?.toUpperCase();
}
export function selectLabels(boxes: LabelBox[], gap = 10) {
  const kept: LabelBox[] = [];
  for (const b of [...boxes]
    .filter((b) => b.visible && Number.isFinite(b.x + b.y))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))) {
    if (
      !kept.some(
        (k) =>
          Math.abs(k.x - b.x) < (k.width + b.width) / 2 + gap &&
          Math.abs(k.y - b.y) < (k.height + b.height) / 2 + gap,
      )
    )
      kept.push(b);
  }
  return new Set(kept.map((b) => b.id));
}
export function fadeLabel(
  value: number,
  target: number,
  elapsed: number,
  reduced = false,
) {
  if (reduced) return target;
  const result =
    value +
    (target - value) *
      (1 - Math.exp(-Math.max(0, Math.min(elapsed, 100)) / 95));
  return Math.abs(result - target) < 0.008 ? target : result;
}
export function validViewport(
  width: number,
  height: number,
  bufferWidth: number,
  bufferHeight: number,
  lost: boolean,
) {
  return (
    !lost &&
    [width, height, bufferWidth, bufferHeight].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  );
}
