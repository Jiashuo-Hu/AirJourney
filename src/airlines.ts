import type { Reference } from "./types";
import assets from "./airline-brand-assets.json";
import oldLogos from "./bundled-logos.json";
export const airlineText = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
export const airlineStatus = (r: Reference) =>
  r.airlineStatus === "active"
    ? "Active · checked"
    : r.airlineStatus === "inactive"
      ? "Inactive · source"
      : "Status unverified";
type Brand = { name: string; code: string; symbol?: string; full?: string };
export const brands = assets as Record<string, Brand>;
export function brandFor(r?: Reference) {
  if (!r) return undefined;
  return (
    (r.brandKey && brands[r.brandKey]) ||
    Object.values(brands).find(
      (b) => airlineText(b.name) === airlineText(r.name) && b.code === r.code,
    )
  );
}
export function airlineLogo(r?: Reference) {
  if (!r || r.logoPolicy === "none") return undefined;
  const brand = brandFor(r);
  // Old SQ/EK/NH choices saved full lockups before symbols were supplied.
  // Correct that exact default for display, while retaining custom SVGs and the
  // stored snapshot. The full lockup remains available in the library.
  if (brand && ["SQ", "EK", "NH"].includes(brand.code) && brand.symbol && r.logo === brand.full && r.logoPolicy !== "custom")
    return brand.symbol;
  // Preserve all personal SVGs. Only replace the exact old bundled LH default.
  if (
    r.logo &&
    !(
      r.logo === oldLogos.lufthansa &&
      brand?.code === "LH" &&
      r.source === "Bundled"
    )
  )
    return r.logo;
  return brand?.symbol || brand?.full || r.logo;
}
const textCache = new WeakMap<Reference, string>();
const searchable = (r: Reference) => {
  let t = textCache.get(r);
  if (!t) {
    t = airlineText(
      [
        r.name,
        r.code,
        r.iata,
        r.icao,
        r.aliases,
        r.historicalAliases,
        r.region,
        r.codeNote,
      ].join(" "),
    );
    textCache.set(r, t);
  }
  return t;
};
export class AirlineSearch {
  readonly entries: Reference[];
  readonly byId: Map<string, Reference>;
  readonly baseById: Map<string, Reference>;
  constructor(base: Reference[], personal: Reference[] = []) {
    this.baseById = new Map(base.map((r) => [r.id, r]));
    const names = new Map<string, Reference[]>();
    for (const r of base) {
      const k = airlineText(r.name) + "|" + (r.code || "");
      names.set(k, [...(names.get(k) || []), r]);
    }
    const replaced = new Set(personal.map((r) => r.id));
    const merged = personal.map((r) => {
      const candidates = names.get(airlineText(r.name) + "|" + (r.code || ""));
      const match =
        this.baseById.get(r.id) ||
        (candidates?.length === 1 ? candidates[0] : undefined);
      if (!match) return r;
      replaced.add(match.id);
      // Enrich choices only, never mutate personal state or saved flight snapshots.
      const display = { ...match, ...r };
      textCache.set(display, searchable(r) + " " + searchable(match));
      return display;
    });
    this.entries = [...merged, ...base.filter((r) => !replaced.has(r.id))].sort(
      (a, b) =>
        airlineText(a.name).localeCompare(airlineText(b.name), "en") ||
        a.id.localeCompare(b.id),
    );
    this.byId = new Map(this.entries.map((r) => [r.id, r]));
  }
  search(
    query: string,
    limit = 30,
    offset = 0,
    hidden = false,
    letter = "",
    status = "all",
  ) {
    const q = airlineText(query),
      tokens = q.split(/\s+/).filter(Boolean),
      hits: Reference[][] = [[], []];
    let total = 0;
    for (const r of this.entries) {
      if (
        (r.hidden && !hidden) ||
        (letter && !airlineText(r.name).startsWith(letter.toLowerCase())) ||
        (status !== "all" && (r.airlineStatus || "unknown") !== status)
      )
        continue;
      if (tokens.some((t) => !searchable(r).includes(t))) continue;
      total++;
      const rank =
        q && [r.code, r.icao, r.name].some((c) => airlineText(c || "") === q) ? 0 : 1;
      if (hits[rank].length < offset + limit) hits[rank].push(r);
    }
    return { total, results: hits.flat().slice(offset, offset + limit) };
  }
}
let promise: Promise<Reference[]> | undefined;
export const loadAirlineCatalog = () =>
  (promise ??= fetch("./data/airlines-global.json").then(async (r) => {
    if (!r.ok) throw Error("Bundled airline catalogue unavailable.");
    const rows = (await r.json()) as Reference[];
    if (!Array.isArray(rows) || rows.some((x) => !x.id || !x.name))
      throw Error("Invalid airline catalogue.");
    return rows.map((x) => ({ ...x, logo: airlineLogo(x) }));
  }));
