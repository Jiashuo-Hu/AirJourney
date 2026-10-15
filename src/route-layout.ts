import geodesic from "geographiclib-geodesic";
import type { Flight, Place } from "./types";
import { distance, hasLocation, route } from "./domain";

// Include saved coordinates: old snapshots sharing an airport ID may differ.
export const endpointKey = (p: Place) =>
  `${(p.iata || p.code || p.ident || p.id).toUpperCase()}@${p.lat},${p.lon}`;
export function groupRoutes(flights: Flight[]) {
  const groups = new Map<string, Flight[]>();
  for (const f of flights) {
    if (!f.visible || f.deleted || !hasLocation(f.from) || !hasLocation(f.to))
      continue;
    const key = [endpointKey(f.from), endpointKey(f.to)].sort().join("|");
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(f);
  }
  return [...groups.values()].map((fs) =>
    fs.sort((a, b) => a.id.localeCompare(b.id)),
  );
}
export function routeWidth(base: number, count: number, selected = false) {
  return Math.min(
    16,
    base + Math.log2(Math.max(1, count)) * 1.5 + (selected ? 2 : 0),
  );
}
// The whole fan stays bounded; spacing shrinks as the number of flights rises.
export function laneOffset(index: number, count: number, meters: number) {
  if (count < 2) return 0;
  const span = Math.min(60000, Math.max(0, meters) * 0.025);
  return ((index - (count - 1) / 2) / ((count - 1) / 2)) * span;
}
export function routeLanes(
  fs: Flight[],
  separate: boolean,
  selected: string | null,
) {
  if (!separate) return [{ flights: fs, offset: 0 }];
  // Large groups intentionally overlap in bounded visual lanes. Every ID stays
  // pickable through its lane's list; odd groups always retain the central lane.
  const count = Math.min(fs.length, fs.length % 2 ? 241 : 240);
  const buckets = Array.from({ length: count }, () => [] as Flight[]);
  fs.forEach((f, i) =>
    buckets[Math.round((i * (count - 1)) / Math.max(1, fs.length - 1))].push(f),
  );
  const meters = distance(fs[0].from, fs[0].to) || 0;
  return buckets.map((flights, i) => ({
    flights,
    offset: laneOffset(i, count, meters),
  }));
}
export function laneRoute(
  from: Place,
  to: Place,
  offset: number,
  height?: number,
) {
  const reversed = endpointKey(from) > endpointKey(to);
  const a = reversed ? to : from,
    b = reversed ? from : to;
  const meters = distance(a, b);
  if (meters === null) return [];
  // A zero-length route has no shortest-arc direction. Keep both endpoints fixed.
  if (meters < 1)
    return [
      [a.lon!, a.lat!, 4000],
      [b.lon!, b.lat!, 4000],
    ];
  const center = route(a, b, height);
  const g = geodesic.Geodesic.WGS84;
  const azimuth = g.Inverse(a.lat, a.lon, b.lat, b.lon).azi1;
  const positions = center.map(([lon, lat, z], i) => {
    if (i === 0) return [a.lon!, a.lat!, z];
    if (i === center.length - 1) return [b.lon!, b.lat!, z];
    if (!offset) return [lon, lat, z];
    const t = i / (center.length - 1);
    const tangent = g.Direct(a.lat, a.lon, azimuth, meters * t).azi2;
    const p = g.Direct(lat, lon, tangent + 90, offset * Math.sin(Math.PI * t));
    return [p.lon2, p.lat2, z];
  });
  return reversed ? positions.reverse() : positions;
}
