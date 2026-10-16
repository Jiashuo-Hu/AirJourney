// Pixel sizing affects rendering only; airport coordinates and route distances
// are never changed to accommodate a marker.
export function airportMarkerPixels(base: number, routeWidth: number, selected: boolean) {
  return Math.min(22, Math.max(6, base, routeWidth + 4) + (selected ? 2 : 0));
}
