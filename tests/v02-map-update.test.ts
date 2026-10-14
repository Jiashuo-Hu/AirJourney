import test from "node:test";
import assert from "node:assert/strict";
import {
  airportHoverCode,
  fadeLabel,
  selectLabels,
  validViewport,
} from "../src/map-label-layout";
test("hover codes are supplied three-letter strings, never airport names or ICAO", () => {
  assert.equal(airportHoverCode({ iata: "hnd", code: "RJTT" }), "HND");
  assert.equal(airportHoverCode({ iata: "ABCD", code: "RJTT" }), undefined);
  assert.equal(airportHoverCode({ code: "lhr" }), "LHR");
  assert.equal(airportHoverCode({}), undefined);
});
import { assertLocationsLocked, lockedReference } from "../src/location-lock";
import { initialState } from "../src/seed";
import type { Flight, Reference } from "../src/types";
test("viewport guard rejects a zero GPU buffer even when CSS canvas is large", () => {
  assert.equal(validViewport(1042, 863, 0, 1726, false), false);
  assert.equal(validViewport(0, 863, 2084, 1726, false), false);
  assert.equal(validViewport(1042, 863, 2084, 1726, true), false);
  assert.equal(validViewport(1042, 863, 2084, 1726, false), true);
  assert.equal(validViewport(Infinity, 863, 2084, 1726, false), false);
});
test("label fading progresses smoothly in both directions and honors reduced motion", () => {
  const a = fadeLabel(0, 1, 30);
  assert.ok(a > 0 && a < 1);
  assert.ok(fadeLabel(a, 1, 30) > a);
  const b = fadeLabel(1, 0, 30);
  assert.ok(b > 0 && b < 1);
  assert.ok(fadeLabel(b, 0, 30) < b);
  assert.equal(fadeLabel(0, 1, 20, true), 1);
  assert.equal(fadeLabel(1, 0, 20, true), 0);
});
test("collision layout retains higher priority countries and unobstructed names", () => {
  const box = (id: string, x: number, priority: number) => ({
    id,
    x,
    y: 100,
    width: 100,
    height: 22,
    priority,
    visible: true,
  });
  const kept = selectLabels([
    box("major", 100, 100),
    box("minor", 110, 20),
    box("clear", 300, 20),
  ]);
  assert.deepEqual([...kept], ["major", "clear"]);
  assert.equal(
    selectLabels([{ ...box("back", 100, 100), visible: false }]).size,
    0,
  );
});
test("existing airport coordinates cannot be changed or extended by normal mutations", () => {
  const s = initialState(),
    n = structuredClone(s);
  n.library.Airports[0].lat = 0;
  assert.throws(() => assertLocationsLocked(s, n, new Map()), /locked/);
  n.library.Airports = s.library.Airports.map((r) => ({ ...r }));
  n.library.Airports.push({ id: "manual", name: "New", lat: 1, lon: 2 });
  assert.throws(() => assertLocationsLocked(s, n, new Map()), /locked/);
});
test("supplied airport metadata remains editable with frozen location provenance", () => {
  const s = initialState(),
    n = structuredClone(s);
  n.library.Airports[0].name = "My name";
  assert.doesNotThrow(() => assertLocationsLocked(s, n, new Map()));
  const r: Reference = {
    ...s.library.Airports[0],
    locationKind: "airport",
    locationSource: "Static source",
  };
  const e = lockedReference(
    { ...r, lat: 1, locationKind: "manual", locationSource: "fake" },
    r,
  );
  assert.equal(e.lat, r.lat);
  assert.equal(e.locationKind, "airport");
  assert.equal(e.locationSource, "Static source");
});
const flight = (from: Reference, to: Reference): Flight => ({
  id: "f",
  created: "",
  updated: "",
  number: "",
  from,
  to,
  departure: { date: "", time: "", zone: "" },
  arrival: { date: "", time: "", zone: "" },
  unit: "km",
  status: "Recorded",
  tags: [],
  notes: "",
  fields: {},
  color: "",
  visible: true,
});
test("new flight endpoints require given coordinates while historical edits are retained", () => {
  const s = initialState(),
    p: Reference = { id: "oa-test", name: "Given", lat: 20, lon: 30 },
    n = structuredClone(s);
  n.flights = [flight(p, p)];
  assert.doesNotThrow(() => assertLocationsLocked(s, n, new Map([[p.id, p]])));
  n.flights[0].from = { ...p, lat: 21 };
  assert.throws(
    () => assertLocationsLocked(s, n, new Map([[p.id, p]])),
    /supplied airport/,
  );
  const old = initialState();
  old.flights = [flight({ ...p, id: "legacy", lat: 21 }, p)];
  const edit = structuredClone(old);
  edit.flights[0].number = "Edited";
  assert.doesNotThrow(() => assertLocationsLocked(old, edit, new Map()));
});
