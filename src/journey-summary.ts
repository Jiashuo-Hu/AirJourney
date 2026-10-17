import type { Flight, Place, Reference } from "./types";
import { recordedMeters } from "./domain";

const text = (s = "") => s.normalize("NFKC").trim().toLocaleLowerCase();
export const departureYear = (f: Flight) =>
  /^(\d{4})-\d{2}-\d{2}$/.exec(f.departure.date)?.[1] || "";
export function flightYears(flights: Flight[], trash = false) {
  return [
    ...new Set(
      flights
        .filter((f) => Boolean(f.deleted) === trash)
        .map(departureYear)
        .filter(Boolean),
    ),
  ]
    .sort()
    .reverse();
}
export const inYear = (f: Flight, year: string) =>
  year === "All" || departureYear(f) === year;

// Join explicit IDs and reliable identifiers, never airline code alone (codes can be reused).
function identities<T>(rows: T[], keys: (r: T) => string[]) {
  const parent = new Map<string, string>();
  const root = (k: string): string => {
    if (!parent.has(k)) parent.set(k, k);
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    while (parent.get(k) !== k) {
      const next = parent.get(k)!;
      parent.set(k, r);
      k = next;
    }
    return r;
  };
  for (const row of rows) {
    const ks = keys(row);
    for (const k of ks.slice(1)) parent.set(root(k), root(ks[0]));
  }
  return (r: T) => {
    const k = keys(r)[0];
    return k ? root(k) : undefined;
  };
}
const airportKeys = (p: Place) =>
  !p.name.trim()
    ? []
    : ([
        p.id && "id:" + p.id,
        (p.iata || p.code || p.ident || p.icao) &&
          "code:" + text(p.iata || p.code || p.ident || p.icao),
        // Named legacy places without identifiers remain usable; don't equate different cities.
        !p.id &&
          !p.code &&
          !p.iata &&
          "name:" + [p.name, p.city, p.region].map(text).join("|"),
      ].filter(Boolean) as string[]);
const airlineKeys = (r: Reference) =>
  !r.name.trim()
    ? []
    : ([
        r.id && "id:" + r.id,
        r.brandKey && "brand:" + r.brandKey,
        "name:" + text(r.name) + "|" + text(r.code),
      ].filter(Boolean) as string[]);
export function summarize(flights: Flight[]) {
  const active = flights.filter((f) => !f.deleted);
  const completed = active.filter((f) => f.status === "Recorded");
  const places = completed.flatMap((f) => [f.from, f.to]);
  const airportId = identities(places, airportKeys);
  const carriers = completed.flatMap((f) => (f.airline ? [f.airline] : []));
  const airlineId = identities(carriers, airlineKeys);
  const meters = completed.map(recordedMeters);
  const routes = new Map<string, { label: string; count: number }>();
  let routesMissing = 0;
  for (const f of completed) {
    const a = airportId(f.from),
      b = airportId(f.to);
    if (!a || !b) {
      routesMissing++;
      continue;
    }
    const endpoints = [
      { key: a, p: f.from },
      { key: b, p: f.to },
    ].sort((x, y) => x.key.localeCompare(y.key));
    const key = JSON.stringify(endpoints.map((e) => e.key));
    const row = routes.get(key) || {
      label: endpoints
        .map((e) => e.p.iata || e.p.code || e.p.name)
        .join(" ↔ "),
      count: 0,
    };
    row.count++;
    routes.set(key, row);
  }
  return {
    completed: completed.length,
    planned: active.filter((f) => f.status === "Planned").length,
    drafts: active.filter((f) => f.status === "Draft").length,
    meters: meters.reduce<number>((sum, n) => sum + (n ?? 0), 0),
    distanceMissing: meters.filter((n) => n === null).length,
    estimates: completed.filter(
      (f, i) => f.distance === undefined && meters[i] !== null,
    ).length,
    airports: new Set(places.map(airportId).filter(Boolean)).size,
    airlines: new Set(carriers.map(airlineId).filter(Boolean)).size,
    airportRecordsMissing: completed.filter(
      (f) => !airportId(f.from) || !airportId(f.to),
    ).length,
    airlineRecordsMissing: completed.filter(
      (f) => !f.airline || !airlineId(f.airline),
    ).length,
    routesMissing,
    routes: [...routes.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    ),
  };
}
