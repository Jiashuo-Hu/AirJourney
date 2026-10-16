import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  groupRoutes,
  laneOffset,
  laneRoute,
  routeLanes,
  routeWidth,
} from "../src/route-layout";
import { AirlineSearch, airlineLogo, brands } from "../src/airlines";
import { initialState } from "../src/seed";
import {
  distance,
  recordedMeters,
  safeSvg,
  validateState,
} from "../src/domain";
import type { Flight, Reference } from "../src/types";
const a = { id: "A", code: "AAA", name: "A", lat: 0, lon: 10 },
  b = { id: "B", code: "BBB", name: "B", lat: 0, lon: 60 };
const flight = (i: number, reverse = false): Flight => ({
  id: String(i).padStart(6, "0"),
  number: "F" + i,
  created: "",
  updated: "",
  from: reverse ? b : a,
  to: reverse ? a : b,
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
test("repeated airport pairs combine both directions without merging differing historical coordinates", () => {
  const f = flight(3);
  f.to = { ...b, lat: 1 };
  assert.deepEqual(
    groupRoutes([flight(1), flight(2, true), f]).map((g) => g.length),
    [2, 1],
  );
  const hidden = flight(4);
  hidden.visible = false;
  assert.equal(groupRoutes([hidden]).length, 0);
});
test("odd/even lane patterns are symmetric, centered, bounded and become denser", () => {
  for (const n of [1, 2, 3, 4, 5, 100, 101, 1000, 1001]) {
    const values = Array.from({ length: n }, (_, i) => laneOffset(i, n, 2e7));
    for (let i = 0; i < n; i++)
      assert.ok(Math.abs(values[i] + values[n - 1 - i]) < 1e-8);
    assert.ok(Math.max(...values) <= 60000);
    assert.equal(values.includes(0), !!(n % 2));
  }
  assert.ok(
    laneOffset(1, 1000, 2e7) - laneOffset(0, 1000, 2e7) <
      laneOffset(1, 100, 2e7) - laneOffset(0, 100, 2e7),
  );
  assert.equal(laneOffset(0, 2, 1000), -25);
});
test("display offsets keep exact endpoints and reverse direction; no record or distance changes", () => {
  const fs = [flight(1), flight(2, true)],
    before = JSON.stringify(fs),
    meters = recordedMeters(fs[0]);
  const plus = laneRoute(a, b, 30000),
    minus = laneRoute(a, b, -30000),
    rev = laneRoute(b, a, 30000);
  assert.deepEqual(plus, rev.reverse());
  assert.deepEqual(plus[0].slice(0, 2), [a.lon, a.lat]);
  assert.deepEqual(plus.at(-1)!.slice(0, 2), [b.lon, b.lat]);
  const mid = Math.floor(plus.length / 2);
  assert.ok(Math.abs(plus[mid][1] + minus[mid][1]) < 1e-8);
  assert.ok(plus[mid][1] !== 0);
  assert.equal(JSON.stringify(fs), before);
  assert.equal(recordedMeters(fs[0]), meters);
});
test("antimeridian, polar and near-antipodal offset routes remain finite", () => {
  for (const [p, q] of [
    [
      { ...a, lat: 35, lon: 170 },
      { ...b, lat: 40, lon: -170 },
    ],
    [
      { ...a, lat: 88, lon: 0 },
      { ...b, lat: 87, lon: 150 },
    ],
    [
      { ...a, lat: 0, lon: 0 },
      { ...b, lat: 0.001, lon: 179.999 },
    ],
  ]) {
    const r = laneRoute(p, q, 60000);
    assert.ok(r.flat().every(Number.isFinite));
    assert.deepEqual(r[0].slice(0, 2), [p.lon, p.lat]);
    assert.deepEqual(r.at(-1)!.slice(0, 2), [q.lon, q.lat]);
  }
  const same = laneRoute(a, a, 500);
  assert.deepEqual(same[0], same.at(-1));
});
test("1000+ records retain every ID and direction in bounded overlapping lanes", () => {
  for (const n of [1, 2, 3, 4, 99, 100, 1000, 1001]) {
    const fs = Array.from({ length: n }, (_, i) => flight(i, i % 2 === 1));
    const lanes = routeLanes(fs, true, fs[n - 1].id);
    assert.equal(lanes.length, Math.min(n, n % 2 ? 241 : 240));
    assert.equal(
      new Set(lanes.flatMap((l) => l.flights.map((f) => f.id))).size,
      n,
    );
    assert.ok(lanes.every((l) => l.flights.length));
    assert.equal(
      lanes.some((l) => l.offset === 0),
      !!(n % 2),
    );
  }
  assert.equal(routeLanes([flight(1), flight(2)], false, null).length, 1);
});
test("count-dependent width is monotonic and caps selected/unselected lines at 16px", () => {
  assert.equal(routeWidth(4, 1), 4);
  assert.ok(routeWidth(4, 4) > routeWidth(4, 2));
  assert.equal(routeWidth(6, 10000, true), 16);
});
const base = JSON.parse(
  fs.readFileSync("public/data/airlines-global.json", "utf8"),
) as Reference[];
test("airline resource has unique IDs, valid optional alphanumeric codes and explicit unknown status", () => {
  assert.ok(base.length > 7000);
  assert.equal(new Set(base.map((r) => r.id)).size, base.length);
  assert.ok(base.every((r) => !r.code || /^[A-Z0-9]{2}$/.test(r.code)));
  assert.ok(base.some((r) => !r.code));
  assert.ok(base.some((r) => r.airlineStatus === "unknown"));
  assert.ok(base.some((r) => r.airlineStatus === "inactive"));
  assert.ok(base.some((r) => r.airlineStatus === "active"));
});
test("airline search supports numeric codes, name, historical alias, alphabet browsing and source status", () => {
  const index = new AirlineSearch(base);
  assert.equal(index.search("United Airlines").results[0].name, "United Airlines");
  assert.ok(index.search("6E").results.some((r) => r.code === "6E"));
  assert.ok(index.search("China Eastern").results.some((r) => r.code === "MU"));
  assert.ok(index.search("Aero Oy").results.some((r) => r.name === "Finnair"));
  assert.ok(
    index
      .search("", 30, 0, false, "Z")
      .results.every((r) => r.name.toLowerCase().startsWith("z")),
  );
  assert.ok(
    index
      .search("", 30, 0, false, "", "inactive")
      .results.every((r) => r.airlineStatus === "inactive"),
  );
  const page1 = index.search("", 30, 0),
    page2 = index.search("", 30, 30);
  assert.equal(
    new Set([...page1.results, ...page2.results].map((r) => r.id)).size,
    60,
  );
});
test("shared airline codes stay distinct; personal names, SVGs and hidden choices take precedence", () => {
  const rows: Reference[] = [
    { id: "x", name: "Old One", code: "9X", airlineStatus: "inactive" },
    { id: "y", name: "New One", code: "9X", airlineStatus: "active" },
  ];
  const index = new AirlineSearch(rows, [
    { id: "personal", name: "My airline", code: "9X" },
  ]);
  assert.equal(index.search("9X").total, 3);
  const before = JSON.stringify(rows),
    hidden = new AirlineSearch(rows, [
      { ...rows[0], name: "Personal name", hidden: true },
    ]);
  assert.equal(hidden.search("9X").total, 1);
  assert.equal(JSON.stringify(rows), before);
  const svg = safeSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>',
  );
  assert.equal(
    airlineLogo({ id: "p", name: "Lufthansa", code: "LH", logo: svg }),
    svg,
  );
  assert.equal(
    airlineLogo({ id: "p", name: "Lufthansa", code: "LH", logoPolicy: "none" }),
    undefined,
  );
});
test("every bundled airline mark is portable vector; missing code/logo never invented", () => {
  assert.ok(Object.keys(brands).length >= 110);
  let symbols = 0;
  for (const b of Object.values(brands)) {
    for (const img of [b.full, b.symbol].filter(Boolean)) {
      const raw = Buffer.from(img!.split(",")[1], "base64").toString();
      assert.equal(safeSvg(raw), img);
      assert.ok(!/<image\b/i.test(raw));
    }
    if (b.symbol) symbols++;
  }
  assert.ok(symbols >= 33);
  assert.equal(
    airlineLogo({ id: "custom", name: "Unknown airline" }),
    undefined,
  );
});

test("Singapore default uses the complete bird without wordmark; full/custom snapshots remain intact", () => {
  const b = brands.singapore;
  assert.ok(b.symbol);
  const svg = Buffer.from(b.symbol!.split(",")[1], "base64").toString();
  assert.equal((svg.match(/<path\b/g) || []).length, 2);
  assert.ok(!svg.includes("#1d4886"), "blue wordmark contours must be absent");
  const row: Reference = { id: "old-sq", name: b.name, code: b.code, logo: b.full };
  const before = JSON.stringify(row);
  assert.equal(airlineLogo(row), b.symbol);
  assert.equal(JSON.stringify(row), before);
  assert.equal(airlineLogo({ ...row, logoPolicy: "custom" }), b.full);
  assert.equal(airlineLogo({ ...row, logoPolicy: "none" }), undefined);
  assert.notEqual(b.symbol, b.full);
});

test("Emirates and ANA display the requested graphic variants while full/custom marks remain available", () => {
  for (const key of ["emirates", "ana"]) {
    const b = brands[key];
    assert.ok(b.symbol);
    assert.notEqual(b.symbol, b.full);
    const row: Reference = { id: key, name: b.name, code: b.code, logo: b.full };
    const before = JSON.stringify(row);
    assert.equal(airlineLogo(row), b.symbol);
    assert.equal(airlineLogo({ ...row, logoPolicy: "custom" }), b.full);
    assert.equal(JSON.stringify(row), before);
  }
  const nh = Buffer.from(brands.ana.symbol!.split(",")[1], "base64").toString();
  assert.equal((nh.replace(/<defs\b[^>]*>[\s\S]*?<\/defs>/g, "").match(/<path\b/g) || []).length, 2);
});
test("schema 1 keeps old records byte-for-byte and optional repeat preference survives backup validation", () => {
  const s = initialState();
  s.flights = [flight(1), flight(2, true)];
  delete s.settings.repeatRoutes;
  const before = JSON.stringify(s);
  validateState(s);
  assert.equal(JSON.stringify(s), before);
  s.settings.repeatRoutes = "separate";
  assert.equal(
    validateState(structuredClone(s)).settings.repeatRoutes,
    "separate",
  );
  s.settings.repeatRoutes = "bad" as any;
  assert.throws(() => validateState(s), /repeated-route/);
});
