// Pixel sizing affects rendering only; airport coordinates and route distances
// are never changed to accommodate a marker.
export function airportMarkerPixels(
  base: number,
  routeWidth: number,
  selected: boolean,
) {
  return Math.min(22, Math.max(6, base, routeWidth + 4) + (selected ? 2 : 0));
}
// Contrast against the user's normal route colour, without relying on black outlines.
export function selectedRouteColor(hex: string) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return luminance > 0.55 ? "#173c88" : "#ffd16b";
}
