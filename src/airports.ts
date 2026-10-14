import type { Place, Reference } from "./types";
import { hasLocation } from "./domain";
export const airportText = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
export function locationLabel(p: Place) {
  if (!hasLocation(p)) return "Needs location";
  if (p.locationKind === "approximate") return "Approximate city location";
  if (p.locationKind === "manual") return "User location";
  return "Airport coordinates";
}
const texts = new WeakMap<Reference, string>();
const baseCaches = new WeakMap<
  Reference[],
  { byId: Map<string, Reference>; unique: Map<string, Reference | null> }
>();
const searchable = (r: Reference) => {
  let text = texts.get(r);
  if (!text) {
    text = airportText(
      [
        r.name,
        r.code,
        r.ident,
        r.iata,
        r.icao,
        r.city,
        r.region,
        r.countryCode,
        r.aliases,
        r.airportType,
      ].join(" "),
    );
    texts.set(r, text);
  }
  return text;
};
export class AirportSearch {
  readonly entries: Reference[];
  readonly byId: Map<string, Reference>;
  readonly baseById: Map<string, Reference>;
  readonly canonicalFor: (r: Reference) => Reference | undefined;
  constructor(base: Reference[], personal: Reference[] = []) {
    let cache = baseCaches.get(base);
    if (!cache) {
      const unique = new Map<string, Reference | null>();
      for (const r of base)
        for (const c of [r.ident, r.icao, r.iata, r.code].filter(Boolean)) {
          const k = c!.toUpperCase();
          if (!unique.has(k)) unique.set(k, r);
          else if (unique.get(k)?.id !== r.id) unique.set(k, null);
        }
      cache = { unique, byId: new Map(base.map((r) => [r.id, r])) };
      baseCaches.set(base, cache);
    }
    this.baseById = cache.byId;
    const unique = cache.unique;
    this.canonicalFor = (r) =>
      cache!.byId.get(r.id) ||
      [r.ident, r.icao, r.iata, r.code]
        .filter(Boolean)
        .map((c) => unique.get(c!.toUpperCase()))
        .find(Boolean) ||
      undefined;
    const overridden = new Set(personal.map((r) => r.id));
    const personalEntries = personal.map((r) => {
      const match =
        cache!.byId.get(r.id) ||
        [r.ident, r.icao, r.iata, r.code]
          .filter(Boolean)
          .map((c) => unique.get(c!.toUpperCase()))
          .find(Boolean);
      if (match) overridden.add(match.id);
      if (!match) return r;
      // Add searchable identifiers; retain saved names and coordinates, including
      // intentional missing values. Selecting later makes a new explicit snapshot.
      const display = {
        ...r,
        ident: r.ident ?? match.ident,
        iata: r.iata ?? match.iata,
        icao: r.icao ?? match.icao,
        countryCode: r.countryCode ?? match.countryCode,
        airportType: r.airportType ?? match.airportType,
        locationKind:
          r.locationKind ??
          (hasLocation(r) && r.source === "Bundled" ? "airport" : undefined),
      };
      texts.set(display, searchable(r) + " " + searchable(match));
      return display;
    });
    this.entries = [
      ...personalEntries,
      ...base.filter((r) => !overridden.has(r.id)),
    ];
    this.byId = new Map(this.entries.map((r) => [r.id, r]));
    this.entries.forEach(searchable);
  }
  search(query: string, limit = 40, offset = 0, hidden = false) {
    const q = airportText(query),
      tokens = q.split(/\s+/).filter(Boolean);
    const buckets: Reference[][] = [[], [], []];
    let total = 0;
    for (const r of this.entries) {
      if (!hidden && r.hidden) continue;
      if (tokens.some((t) => !searchable(r).includes(t))) continue;
      total++;
      const codes = q
        ? [r.code, r.iata, r.icao, r.ident]
            .filter(Boolean)
            .map((c) => airportText(c!))
        : [];
      const rank =
        q && codes.includes(q)
          ? 0
          : q && codes.some((c) => c.startsWith(q))
            ? 1
            : 2;
      if (buckets[rank].length < offset + limit) buckets[rank].push(r);
    }
    return { total, results: buckets.flat().slice(offset, offset + limit) };
  }
}
let catalogPromise: Promise<Reference[]> | undefined;
export function loadAirportCatalog() {
  return (catalogPromise ??= fetch("./data/airports-global.json").then(
    async (response) => {
      if (!response.ok)
        throw Error("Bundled airport catalogue could not be loaded.");
      const rows = (await response.json()) as Reference[];
      if (!Array.isArray(rows) || rows.some((r) => !r.id || !r.name))
        throw Error("Invalid bundled airport catalogue.");
      return rows;
    },
  ));
}
