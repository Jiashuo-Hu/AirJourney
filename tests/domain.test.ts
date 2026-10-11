import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initialState } from "../src/seed";
import {
  csv,
  hasLocation,
  distance,
  duration,
  recordedMeters,
  resolveTime,
  route,
  safeSvg,
  validateFlight,
  validateState,
} from "../src/domain";
import { backup, parseBackup } from "../src/storage";
import { zipSync, strToU8 } from "fflate";
import { parseReferenceCSV, referenceCSV } from "../src/library-csv";
import { applyPlaceSnapshot, applyReference } from "../src/domain";
const t = (date = "", time = "", zone = "") => ({ date, time, zone });
const s = initialState(),
  a = s.library.Airports.find((v) => v.code === "PEK")!,
  b = s.library.Airports.find((v) => v.code === "LHR")!;
function f() {
  return {
    id: crypto.randomUUID(),
    created: "2026-10-10T00:00:00Z",
    updated: "2026-10-10T00:00:00Z",
    number: "AJ-TEST-999",
    from: { ...a },
    to: { ...b },
    departure: t(),
    arrival: t(),
    unit: "km" as const,
    status: "Recorded" as const,
    tags: [],
    notes: "",
    fields: {},
    color: "",
    visible: true,
  };
}
test("unknown and date-only preserve null; missing time zone never guesses", () => {
  assert.equal(resolveTime(t()).utc, null);
  assert.equal(resolveTime(t("2024-01-15")).utc, null);
  assert.equal(resolveTime(t("2024-01-15", "10:00")).utc, null);
  const x = f();
  x.from = { id: "custom", name: "Unlocated" };
  validateFlight(x);
  assert.equal(distance(x.from, x.to), null);
  assert.equal(duration(x), null);
});
test("FX03 PEK to LHR =12h, FX04 HND to LAX =9h", () => {
  const x = f();
  x.departure = t("2024-01-15", "10:00", "Asia/Shanghai");
  x.arrival = t("2024-01-15", "14:00", "Europe/London");
  assert.equal(resolveTime(x.departure).utc, "2024-01-15T02:00:00.000Z");
  assert.equal(duration(x), 720);
  x.departure = t("2024-01-15", "18:00", "Asia/Tokyo");
  x.arrival = t("2024-01-15", "10:00", "America/Los_Angeles");
  assert.equal(duration(x), 540);
});
test("DST gap / overlap unresolved, offsets explicit, invalid chronology preserved", () => {
  assert.equal(
    resolveTime(t("2024-03-10", "02:30", "America/New_York")).utc,
    null,
  );
  assert.equal(
    resolveTime(t("2024-11-03", "01:30", "America/New_York")).utc,
    null,
  );
  assert.equal(
    resolveTime(t("2024-11-03", "01:30", "-04:00")).utc,
    "2024-11-03T05:30:00.000Z",
  );
  assert.equal(
    resolveTime(t("2024-11-03", "01:30", "-05:00")).utc,
    "2024-11-03T06:30:00.000Z",
  );
  const x = f();
  x.departure = t("2024-01-15", "14:00", "UTC");
  x.arrival = t("2024-01-15", "10:00", "UTC");
  validateFlight(x);
  assert.equal(duration(x), null);
});
test("zero coordinate, zero distance and manual units stay distinct from unknown", () => {
  const p = { id: "zero", name: "Zero", lat: 0, lon: 0 };
  assert.ok(hasLocation(p));
  assert.equal(distance(p, p), 0);
  const x = f();
  Object.assign(x, { from: p, to: p, distance: 1000, unit: "miles" });
  assert.equal(recordedMeters(x), 1609344);
  assert.equal(distance(x.from, x.to), 0);
  assert.throws(() => validateFlight({ ...x, distance: -1 }));
  assert.throws(() => validateFlight({ ...x, from: { ...p, lat: 91 } }));
});
test("WGS84 published geodesic oracle Wellington–Salamanca 19959679.267m", () => {
  const d = distance(
    { id: "a", name: "a", lat: -41.32, lon: 174.81 },
    { id: "b", name: "b", lat: 40.96, lon: -5.5 },
  );
  assert.ok(Math.abs(d! - 19959679.267) < 0.001);
});
test("antimeridian / polar / antipodal / same-place route coordinates remain finite", () => {
  for (const [p, q] of [
    [
      { lat: -37.0081, lon: 174.792 },
      { lat: 33.9425, lon: -118.4081 },
    ],
    [
      { lat: 89, lon: -100 },
      { lat: 89, lon: 100 },
    ],
    [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 180 },
    ],
    [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0 },
    ],
  ]) {
    const points = route(
      { id: "a", name: "a", ...p },
      { id: "b", name: "b", ...q },
    );
    assert.ok(points.length >= 65);
    assert.ok(points.flat().every(Number.isFinite));
  }
});
test("safe SVG is vector only; bundled assets pass; dangerous SVG rejects", () => {
  for (const n of ["lufthansa", "star-alliance", "oneworld"])
    assert.ok(
      safeSvg(readFileSync(`public/logos/${n}.svg`, "utf8")).startsWith(
        "data:",
      ),
    );
  for (const bad of [
    "<script>alert(1)</script>",
    '<image href="data:image/png;base64,a"/>',
    '<path onclick="x()"/>',
    "<foreignObject/>",
    '<use href="https://x"/>',
    '<animate attributeName="href"/>',
  ])
    assert.throws(() =>
      safeSvg(`<svg viewBox="0 0 10 10"><path d="M0 0 L1 1"/>${bad}</svg>`),
    );
});
test("snapshot changes do not mutate existing flights; backups preserve all data and SVG", async () => {
  const state = initialState(),
    x = f();
  x.airline = structuredClone(
    state.library.Airlines.find((v) => v.code === "LH"),
  );
  x.notes = "中文\n=SUM(A1)";
  state.flights.push(x);
  state.fields.push({
    id: "f",
    label: "Seat",
    type: "text",
    options: "",
    hidden: true,
  });
  state.tags = ["Personal"];
  state.library.Airports[0].name = "Changed for future";
  assert.notEqual(state.flights[0].from.name, state.library.Airports[0].name);
  assert.deepEqual(await parseBackup(await backup(state)), state);
});
test("backup rejects corruption, unsupported schema, traversal, missing files; does not change source", async () => {
  const state = initialState(),
    bytes = await backup(state);
  await assert.rejects(parseBackup(bytes.slice(0, 100)));
  await assert.rejects(
    parseBackup(
      zipSync({
        "../data.json": strToU8("{}"),
        "manifest.json": strToU8("{}"),
      }),
    ),
  );
  assert.throws(() => validateState({ ...state, schema: 2 } as never));
  assert.deepEqual(state, initialState());
});
test("CSV quotes multiline, escapes formula injection, exports precision / manual / derived values", () => {
  const x = f();
  x.number = "=cmd()";
  x.notes = 'a,"b"\nc';
  const out = csv([x]);
  assert.ok(out.includes('"\'=cmd()"'));
  assert.ok(out.includes('"a,""b""\nc"'));
  assert.ok(out.includes('"calculated_m"'));
});
test("Library CSV imports explicit columns, multiline names and optional coordinates", () => {
  const x = { id: "custom", name: 'A, "place"\n名称', lat: 0, lon: 0 };
  const rows = parseReferenceCSV(referenceCSV([x]));
  assert.equal(rows[0].name, x.name);
  assert.equal(rows[0].lat, 0);
  assert.equal(rows[0].lon, 0);
  assert.equal(
    parseReferenceCSV("name,city\nCustom,Somewhere")[0].lat,
    undefined,
  );
  assert.throws(() => parseReferenceCSV("name,lat\nCustom,no"));
});
test("explicit Library updates preserve per-flight user coordinate / code overrides", () => {
  const previous = {
    ...a,
    lat: 0,
    lon: 0,
    code: "USER",
    overrides: ["lat", "code"],
  };
  const next = { ...a, lat: undefined, lon: undefined, code: "NEW" };
  const applied = applyPlaceSnapshot(previous, next);
  assert.equal(applied.lat, 0);
  assert.equal(applied.lon, 0);
  assert.equal(applied.code, "USER");
});
test("same text ID in different reference categories never overwrites an airport with an airline", () => {
  const flight = f();
  flight.airline = { id: flight.from.id, name: "Custom airline" };
  const updated = applyReference(flight, "Airlines", flight.airline, {
    ...flight.airline,
    name: "Renamed airline",
  });
  assert.deepEqual(updated.from, flight.from);
  assert.equal(updated.airline?.name, "Renamed airline");
});
test("backup schema rejects remote images, malformed time, invalid custom field and style", () => {
  for (const modify of [
    (s: any) => (s.library.Airlines[0].logo = "https://bad/logo.svg"),
    (s: any) =>
      (s.flights = [
        { ...f(), departure: { date: "2024-01-15", time: "10:00", zone: 8 } },
      ]),
    (s: any) => (s.fields = [{ id: "x", label: "x", type: "script" }]),
    (s: any) => (s.settings.width = 99),
  ]) {
    const state = initialState();
    modify(state);
    assert.throws(() => validateState(state));
  }
});
