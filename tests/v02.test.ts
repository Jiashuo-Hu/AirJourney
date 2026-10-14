import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { AirportSearch, locationLabel } from "../src/airports";
import { initialState } from "../src/seed";
import { validatePlace, applyPlaceSnapshot, hasLocation } from "../src/domain";
import { referenceCSV, parseReferenceCSV } from "../src/library-csv";
import { backup, parseBackup } from "../src/storage";
import type { Reference } from "../src/types";
const base: Reference[] = JSON.parse(
  fs.readFileSync("public/data/airports-global.json", "utf8"),
);
const meta = JSON.parse(
  fs.readFileSync("public/data/airports-global-manifest.json", "utf8"),
);
const index = new AirportSearch(base);
test("global resource coverage, identifiers and coordinate metadata match manifest", () => {
  assert.equal(base.length, meta.records);
  assert.ok(base.length > 80000);
  assert.equal(new Set(base.map((r) => r.id)).size, base.length);
  assert.equal(new Set(base.map((r) => r.ident)).size, base.length);
  assert.equal(new Set(base.map((r) => r.countryCode)).size, 247);
  base.forEach((r) => {
    validatePlace(r, true);
    assert.ok(hasLocation(r));
    assert.equal(r.locationKind, "airport");
  });
});
test("global search finds IATA, ICAO, city/country, accent-insensitive and multi-token names", () => {
  for (const code of ["JFK", "FAOR", "NZAA", "SCEL", "WSSS", "NAN", "KEF"]) {
    const r = index.search(code).results[0];
    assert.ok([r.code, r.iata, r.icao, r.ident].includes(code), code);
  }
  assert.ok(index.search("sao paulo brazil").total > 0);
  assert.ok(index.search("München").total > 0);
  assert.ok(index.search("Fiji").total > 0);
  assert.equal(index.search("not-an-airport-xyz123").total, 0);
  assert.ok(index.search("").results.length <= 40);
});
test("personal overrides suppress only the matching base; hidden values stay hidden", () => {
  const old = base.find((r) => r.iata === "JFK")!;
  const custom = { ...old, name: "My JFK", lat: 41, source: "User edited" };
  const merged = new AirportSearch(base, [custom]);
  assert.equal(merged.search("JFK").results[0].name, "My JFK");
  assert.equal(merged.entries.filter((r) => r.id === old.id).length, 1);
  const hidden = new AirportSearch(base, [{ ...custom, hidden: true }]);
  assert.ok(!hidden.search("JFK").results.some((r) => r.id === old.id));
  assert.ok(
    hidden.search("JFK", 40, 0, true).results.some((r) => r.id === old.id),
  );
});
test("shared codes and custom duplicate records are not conflated", () => {
  const a = { id: "a", name: "Airport A", code: "DUP" };
  const b = { id: "b", name: "Airport B", code: "DUP" };
  const own = { id: "custom", name: "My DUP", code: "DUP" };
  assert.equal(new AirportSearch([a, b], [own]).search("DUP").total, 3);
});
test("legacy seed identities take precedence without inflating the personal database", () => {
  const s = initialState(),
    saved = JSON.stringify(s);
  const merged = new AirportSearch(base, s.library.Airports);
  assert.equal(merged.search("PVG").results[0].id, "airport-PVG");
  assert.equal(merged.search("KJFK").results[0].id, "airport-JFK");
  assert.equal(merged.search("KJFK").results[0].icao, "KJFK");
  const pending = { id: "mine", name: "Pending JFK", code: "JFK" };
  assert.equal(
    new AirportSearch(base, [pending]).search("KJFK").results[0].lat,
    undefined,
  );
  assert.equal(
    merged.search("PVG").results.filter((r) => r.code === "PVG").length,
    1,
  );
  assert.equal(JSON.stringify(s), saved);
  assert.equal(s.library.Airports.length, 15);
});
test("approximate and unknown locations cannot silently become airport coordinates", () => {
  const p: Reference = {
    id: "city",
    name: "City fallback",
    lat: 48.8,
    lon: 2.3,
    locationKind: "approximate",
    locationSource: "Test city",
  };
  assert.equal(locationLabel(p), "Approximate city location");
  assert.equal(
    locationLabel({ id: "unknown", name: "Unknown" }),
    "Needs location",
  );
  assert.throws(() =>
    validatePlace({ id: "bad", name: "Bad", locationKind: "approximate" }),
  );
  const manual = {
    ...p,
    lat: 49,
    locationKind: "manual" as const,
    locationSource: "User",
    overrides: ["lat", "lon"],
  };
  assert.equal(
    applyPlaceSnapshot(manual, { ...p, lat: 40 }).locationKind,
    "manual",
  );
  assert.equal(applyPlaceSnapshot(manual, { ...p, lat: 40 }).lat, 49);
});
test("backup and Library CSV preserve approximate provenance and personal data", async () => {
  const s = initialState();
  const p: Reference = {
    id: "city",
    name: "Approx",
    lat: 48.8,
    lon: 2.3,
    locationKind: "approximate",
    locationSource: "GeoNames city test",
    countryCode: "FR",
    city: "Paris",
  };
  s.library.Airports.push(p);
  assert.deepEqual(await parseBackup(await backup(s)), s);
  const csv = parseReferenceCSV(referenceCSV([p]))[0];
  assert.equal(csv.locationKind, p.locationKind);
  assert.equal(csv.locationSource, p.locationSource);
  assert.equal(csv.lat, p.lat);
});
test("bounded pagination visits remaining matching records without duplicates", () => {
  const first = index.search("France", 60, 0),
    next = index.search("France", 60, 60);
  assert.ok(first.total > 120);
  assert.equal(first.results.length, 60);
  assert.equal(next.results.length, 60);
  assert.equal(
    new Set([...first.results, ...next.results].map((r) => r.id)).size,
    120,
  );
});
