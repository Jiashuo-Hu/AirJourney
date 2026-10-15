import geodesic from "geographiclib-geodesic";
import moment from "moment-timezone";
import type {
  Flight,
  Place,
  State,
  TimeSpec,
  Reference,
  TimePrecision,
} from "./types";
export function timePrecision(t: TimeSpec): TimePrecision {
  return (
    t.precision ?? (t.time ? "Date and time" : t.date ? "Date only" : "Unknown")
  );
}
export function withPrecision(t: TimeSpec, precision: TimePrecision): TimeSpec {
  return {
    ...t,
    precision,
    ...(precision === "Unknown"
      ? { date: "", time: "" }
      : precision === "Date only"
        ? { time: "" }
        : {}),
  };
}
export function parseTags(raw: string) {
  return [
    ...new Set(
      raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}
export function referenceUsedBy(f: Flight, kind: string, reference: Reference) {
  return kind === "Airports"
    ? [f.from.id, f.to.id].includes(reference.id)
    : kind === "Airlines"
      ? f.airline?.id === reference.id
      : kind === "Aircraft"
        ? f.aircraft?.id === reference.id
        : kind === "Alliances"
          ? f.alliance === reference.name
          : false;
}
export function applyReference(
  f: Flight,
  kind: string,
  previous: Reference,
  next: Reference,
): Flight {
  if (!referenceUsedBy(f, kind, previous)) return f;
  if (kind === "Airports")
    return {
      ...f,
      from: f.from.id === next.id ? applyPlaceSnapshot(f.from, next) : f.from,
      to: f.to.id === next.id ? applyPlaceSnapshot(f.to, next) : f.to,
    };
  if (kind === "Airlines") return { ...f, airline: structuredClone(next) };
  if (kind === "Aircraft") return { ...f, aircraft: structuredClone(next) };
  if (kind === "Alliances")
    return { ...f, alliance: next.name, allianceLogo: next.logo };
  return f;
}
export function applyPlaceSnapshot(previous: Place, next: Place): Place {
  const result = { ...structuredClone(next), overrides: previous.overrides };
  for (const field of previous.overrides || [])
    if (
      [
        "name",
        "code",
        "city",
        "region",
        "lat",
        "lon",
        "zone",
        "locationKind",
        "locationSource",
      ].includes(field)
    )
      (result as any)[field] = (previous as any)[field];
  if (previous.overrides?.some((k) => k === "lat" || k === "lon")) {
    result.lat = previous.lat;
    result.lon = previous.lon;
    result.locationKind = previous.locationKind;
    result.locationSource = previous.locationSource;
  }
  return result;
}
export function validatePlace(p: Place, requireName = false) {
  if (
    !p ||
    typeof p.id !== "string" ||
    !p.id ||
    typeof p.name !== "string" ||
    (requireName && !p.name.trim())
  )
    throw Error("Invalid place / reference.");
  for (const key of [
    "code",
    "city",
    "region",
    "zone",
    "aliases",
    "alliance",
    "manufacturer",
    "family",
    "source",
    "ident",
    "iata",
    "icao",
    "countryCode",
    "airportType",
    "locationSource",
    "statusSource",
    "historicalAliases",
    "brandKey",
    "sourceId",
    "codeNote",
  ])
    if ((p as any)[key] !== undefined && typeof (p as any)[key] !== "string")
      throw Error("Invalid reference text field.");
  if (
    (p as Reference).logoPolicy !== undefined &&
    !["none", "custom"].includes((p as Reference).logoPolicy!)
  )
    throw Error("Invalid logo preference.");
  if (
    (p as Reference).airlineStatus !== undefined &&
    !["active", "inactive", "unknown"].includes((p as Reference).airlineStatus!)
  )
    throw Error("Invalid airline status.");
  if (
    p.overrides &&
    (!Array.isArray(p.overrides) ||
      !p.overrides.every((k) =>
        [
          "name",
          "code",
          "city",
          "region",
          "lat",
          "lon",
          "zone",
          "locationKind",
          "locationSource",
        ].includes(k),
      ))
  )
    throw Error("Invalid snapshot overrides.");
  if (
    p.locationKind !== undefined &&
    !["airport", "approximate", "manual", "unlocated"].includes(p.locationKind)
  )
    throw Error("Invalid location kind.");
  if (
    (p.locationKind === "approximate" || p.locationKind === "airport") &&
    !hasLocation(p)
  )
    throw Error("Located reference requires coordinates.");
  if (p.locationKind === "unlocated" && hasLocation(p))
    throw Error("Unlocated reference must not contain coordinates.");
  if ((p.lat !== undefined || p.lon !== undefined) && !hasLocation(p))
    throw Error("Invalid coordinates.");
}
export const defaults = {
  theme: "System",
  accent: "#245fd6",
  units: "km" as const,
  dateFormat: "DD MMM YYYY",
  clock: "24h",
  density: "Comfortable",
  routeColor: "#74bcff",
  width: 4,
  routeHeight: 12000,
  repeatRoutes: "thick" as const,
  opacity: 0.85,
  markerSize: 7,
  labels: true,
  boundaries: false,
  reducedMotion: false,
  sidebarWidth: 380,
  home: [105, 25, 22000000],
  remember: false,
};
export function hasLocation(p: Place) {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Math.abs(p.lat!) <= 90 &&
    Math.abs(p.lon!) <= 180
  );
}
export function distance(a: Place, b: Place): number | null {
  return hasLocation(a) && hasLocation(b)
    ? geodesic.Geodesic.WGS84.Inverse(a.lat, a.lon, b.lat, b.lon).s12
    : null;
}
export function route(a: Place, b: Place, height = defaults.routeHeight) {
  if (!hasLocation(a) || !hasLocation(b)) return [];
  const g = geodesic.Geodesic.WGS84;
  const inv = g.Inverse(a.lat, a.lon, b.lat, b.lon);
  if (inv.s12 < 1)
    return Array.from({ length: 65 }, (_, i) => [
      a.lon! + 0.18 * Math.cos((i * Math.PI) / 32),
      a.lat! + 0.18 * Math.sin((i * Math.PI) / 32),
      4000,
    ]);
  const steps = Math.max(96, Math.ceil(inv.s12 / 35000));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps,
      p = g.Direct(a.lat, a.lon, inv.azi1, inv.s12 * t);
    return [
      p.lon2,
      p.lat2,
      Math.sin(Math.PI * t) * Math.min(inv.s12 * 0.01, height) + 4000,
    ];
  });
}
export function resolveTime(t: TimeSpec): {
  utc: string | null;
  status: string;
} {
  if (!t.date || !t.time)
    return { utc: null, status: t.date ? "Date only" : "Unknown" };
  const raw = `${t.date}T${t.time}`;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ||
    !moment(raw, "YYYY-MM-DDTHH:mm", true).isValid()
  )
    return { utc: null, status: "Time needs review" };
  if (/^[+-]\d{2}:\d{2}$/.test(t.zone)) {
    const [h, m] = t.zone.slice(1).split(":").map(Number);
    if (h > 14 || m > 59 || (h === 14 && m !== 0))
      return { utc: null, status: "Time needs review" };
    return {
      utc: new Date(
        Date.parse(raw + "Z") -
          (t.zone[0] === "-" ? -1 : 1) * (h * 60 + m) * 60000,
      ).toISOString(),
      status: "Resolved",
    };
  }
  const z = moment.tz.zone(t.zone);
  if (!z) return { utc: null, status: "Time needs review" };
  const base = Date.parse(raw + "Z");
  const candidates = [...new Set(z.offsets)]
    .map((o) => base + o * 60000)
    .filter((ms) => moment.tz(ms, t.zone).format("YYYY-MM-DDTHH:mm") === raw);
  return candidates.length === 1
    ? { utc: new Date(candidates[0]).toISOString(), status: "Resolved" }
    : { utc: null, status: "Time needs review" };
}
export function duration(f: Flight) {
  const a = resolveTime(f.departure),
    b = resolveTime(f.arrival);
  if (!a.utc || !b.utc) return null;
  const d = (Date.parse(b.utc) - Date.parse(a.utc)) / 60000;
  return d > 0 ? d : null;
}
export function recordedMeters(f: Flight) {
  return f.distance !== undefined
    ? f.distance * (f.unit === "miles" ? 1609.344 : 1000)
    : distance(f.from, f.to);
}
export function validateFlight(f: Flight) {
  if (f.status !== "Draft" && (!f.from.name.trim() || !f.to.name.trim()))
    throw Error(
      "Departure and arrival names are required. Use Draft for an incomplete record.",
    );
  for (const p of [f.from, f.to])
    if ((p.lat !== undefined || p.lon !== undefined) && !hasLocation(p))
      throw Error(
        "Coordinates must be a complete valid latitude / longitude pair.",
      );
  for (const n of [f.distance, f.duration])
    if (n !== undefined && (!Number.isFinite(n) || n < 0))
      throw Error("Distance and duration must be non-negative.");
  for (const t of [f.departure, f.arrival]) {
    if (
      t.precision !== undefined &&
      !["Unknown", "Date only", "Date and time"].includes(t.precision)
    )
      throw Error("Invalid time precision.");
    if (t.date && !moment(t.date, "YYYY-MM-DD", true).isValid())
      throw Error("Enter a valid date.");
    if (t.time && (!t.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)))
      throw Error("Enter a date and a valid time, or clear time.");
  }
}
export function safeSvg(raw: string) {
  if (
    raw.length > 2000000 ||
    !/<svg[\s>]/i.test(raw) ||
    !/viewBox\s*=/i.test(raw) ||
    !/<(?:path|rect|circle|ellipse|polygon|polyline|line)[\s>]/i.test(raw)
  )
    throw Error("A vector SVG with a viewBox and shapes is required.");
  if (
    /<\s*(?:\w+:)?(?:script|foreignObject|image|iframe|object|embed|style|use|a|animate|set|animateTransform)\b|\bon\w+\s*=|(?:href|src)\s*=|url\s*\(\s*(?!#)|<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|@import|expression\s*\(|\\|&#/i.test(
      raw,
    )
  )
    throw Error(
      "SVG rejected: scripts, embedded images, styles or external references are not allowed.",
    );
  if (typeof DOMParser !== "undefined") {
    const d = new DOMParser().parseFromString(raw, "image/svg+xml");
    if (d.querySelector("parsererror") || d.documentElement.localName !== "svg")
      throw Error("Invalid SVG XML.");
    const allowed = new Set([
      "svg",
      "g",
      "defs",
      "path",
      "rect",
      "circle",
      "ellipse",
      "polygon",
      "polyline",
      "line",
      "title",
      "desc",
      "linearGradient",
      "radialGradient",
      "stop",
      "clipPath",
      "mask",
    ]);
    for (const e of Array.from(d.querySelectorAll("*")))
      if (
        !allowed.has(e.localName) ||
        e.namespaceURI !== "http://www.w3.org/2000/svg"
      )
        throw Error("SVG contains unsupported elements.");
  }
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(raw)));
}
export function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function csv(flights: Flight[]) {
  const keys = [
    "id",
    "number",
    "departure",
    "arrival",
    "departure_date",
    "departure_time",
    "departure_zone",
    "departure_utc",
    "arrival_date",
    "arrival_time",
    "arrival_zone",
    "arrival_utc",
    "status",
    "recorded_distance",
    "original_unit",
    "calculated_m",
    "manual_duration_minutes",
    "calculated_duration_minutes",
    "airline",
    "aircraft",
    "alliance",
    "tags",
    "notes",
    "custom_fields",
  ];
  return [
    keys.map(csvCell).join(","),
    ...flights.map((f) =>
      [
        f.id,
        f.number,
        f.from.name,
        f.to.name,
        f.departure.date,
        f.departure.time,
        f.departure.zone,
        resolveTime(f.departure).utc,
        f.arrival.date,
        f.arrival.time,
        f.arrival.zone,
        resolveTime(f.arrival).utc,
        f.status,
        f.distance,
        f.unit,
        distance(f.from, f.to),
        f.duration,
        duration(f),
        f.airline?.name,
        f.aircraft?.name,
        f.alliance,
        f.tags.join(";"),
        f.notes,
        JSON.stringify(f.fields),
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}
export function validateState(s: State) {
  if (
    s?.schema !== 1 ||
    !Array.isArray(s.flights) ||
    s.flights.length > 100000 ||
    !s.library ||
    !s.settings ||
    !Array.isArray(s.fields) ||
    !Array.isArray(s.tags)
  )
    throw Error("Unsupported or invalid backup.");
  const ids = new Set<string>();
  for (const f of s.flights) {
    if (typeof f.id !== "string" || ids.has(f.id))
      throw Error("Invalid or duplicate record IDs.");
    ids.add(f.id);
    if (
      !f.from ||
      !f.to ||
      typeof f.from.name !== "string" ||
      typeof f.to.name !== "string" ||
      !f.departure ||
      !f.arrival ||
      !Array.isArray(f.tags) ||
      !f.fields ||
      typeof f.fields !== "object" ||
      typeof f.notes !== "string" ||
      !["Recorded", "Planned", "Draft"].includes(f.status) ||
      !["km", "miles"].includes(f.unit)
    )
      throw Error("Invalid flight structure.");
    for (const t of [f.departure, f.arrival])
      if (
        typeof t.date !== "string" ||
        typeof t.time !== "string" ||
        typeof t.zone !== "string"
      )
        throw Error("Invalid time specification.");
    if (
      !f.tags.every((t) => typeof t === "string") ||
      !Object.values(f.fields).every((v) => typeof v === "string") ||
      typeof f.color !== "string" ||
      (f.color !== "" && !/^#[\da-f]{6}$/i.test(f.color))
    )
      throw Error("Invalid tags, fields or route color.");
    validatePlace(f.from);
    validatePlace(f.to);
    if (f.airline) validatePlace(f.airline);
    if (f.aircraft) validatePlace(f.aircraft);
    validateFlight(f);
  }
  const fieldIds = new Set();
  for (const f of s.fields) {
    if (
      typeof f.id !== "string" ||
      fieldIds.has(f.id) ||
      typeof f.label !== "string" ||
      !["text", "number", "date", "select"].includes(f.type) ||
      typeof f.options !== "string" ||
      typeof f.hidden !== "boolean"
    )
      throw Error("Invalid personal field definition.");
    fieldIds.add(f.id);
  }
  if (!s.tags.every((t) => typeof t === "string")) throw Error("Invalid tags.");
  for (const key of ["Airports", "Airlines", "Alliances", "Aircraft"]) {
    const list = s.library[key];
    if (!Array.isArray(list) || list.length > 20000)
      throw Error("Invalid library.");
    const seen = new Set();
    for (const r of list) {
      if (
        typeof r.id !== "string" ||
        typeof r.name !== "string" ||
        seen.has(r.id)
      )
        throw Error("Invalid reference.");
      seen.add(r.id);
      validatePlace(r, true);
      if ((r.lat !== undefined || r.lon !== undefined) && !hasLocation(r))
        throw Error("Invalid library coordinates.");
    }
  }
  const p = s.settings;
  if (
    p.repeatRoutes !== undefined &&
    !["thick", "separate"].includes(p.repeatRoutes)
  )
    throw Error("Invalid repeated-route mode.");
  if (
    p.routeHeight !== undefined &&
    (!Number.isFinite(p.routeHeight) ||
      p.routeHeight < 0 ||
      p.routeHeight > 100000)
  )
    throw Error("Invalid route lift.");
  if (
    !["System", "Light", "Dark"].includes(p.theme) ||
    !["km", "miles"].includes(p.units) ||
    !/^#[\da-f]{6}$/i.test(p.accent) ||
    !/^#[\da-f]{6}$/i.test(p.routeColor) ||
    !Number.isFinite(p.width) ||
    p.width < 1 ||
    p.width > 6 ||
    !Number.isFinite(p.opacity) ||
    p.opacity < 0.25 ||
    p.opacity > 1 ||
    !Number.isFinite(p.markerSize) ||
    p.markerSize < 4 ||
    p.markerSize > 16 ||
    !Array.isArray(p.home) ||
    p.home.length !== 3 ||
    !p.home.every(Number.isFinite) ||
    Math.abs(p.home[0]) > 180 ||
    Math.abs(p.home[1]) > 90 ||
    p.home[2] < 500000 ||
    p.home[2] > 40000000 ||
    p.sidebarWidth < 300 ||
    p.sidebarWidth > 480
  )
    throw Error("Invalid appearance / map settings.");
  if (
    p.mapImage &&
    !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p.mapImage)
  )
    throw Error("Map image must be an embedded PNG or JPEG.");
  if (
    p.lastView &&
    (!Array.isArray(p.lastView) ||
      p.lastView.length !== 3 ||
      !p.lastView.every(Number.isFinite) ||
      Math.abs(p.lastView[0]) > 180 ||
      Math.abs(p.lastView[1]) > 90 ||
      p.lastView[2] < 500000 ||
      p.lastView[2] > 40000000)
  )
    throw Error("Invalid saved camera.");
  const scan = (v: any, key = ""): void => {
    if (
      /logo$/i.test(key) &&
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v.startsWith("data:image/svg+xml;base64,"))
    )
      throw Error("Logo must be a portable vector SVG.");
    if (typeof v === "string" && v.startsWith("data:image/svg+xml;base64,")) {
      safeSvg(decodeURIComponent(escape(atob(v.split(",")[1]))));
    } else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, value]) => scan(value, k));
  };
  scan(s);
  return s;
}
