import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/seed";
import { serialMutations } from "../src/state-updates";
import {
  withPrecision,
  timePrecision,
  parseTags,
  route,
  distance,
  validateState,
  defaults,
} from "../src/domain";
import { backup, parseBackup } from "../src/storage";

test("AF-03 queued independent settings merge after delayed successful saves", async () => {
  let current = initialState();
  current.settings.theme = "Light";
  current.settings.units = "miles";
  let release!: () => void;
  const first = new Promise<void>((resolve) => (release = resolve));
  let writes = 0;
  const enqueue = serialMutations(
    () => current,
    async () => {
      if (++writes === 1) await first;
    },
    (next) => (current = next),
  );
  const a = enqueue((s) => ({
    ...s,
    settings: { ...s.settings, theme: "Dark" },
  }));
  const b = enqueue((s) => ({
    ...s,
    settings: { ...s.settings, units: "km" },
  }));
  release();
  await Promise.all([a, b]);
  assert.equal(current.settings.theme, "Dark");
  assert.equal(current.settings.units, "km");
});
test("AF-03 failed save is not published and later operations retain last successful state", async () => {
  let current = initialState();
  let attempt = 0;
  const enqueue = serialMutations(
    () => current,
    async () => {
      if (++attempt === 2) throw Error("write failure");
    },
    (next) => (current = next),
  );
  await enqueue((s) => ({ ...s, tags: ["keep"] }));
  await assert.rejects(enqueue((s) => ({ ...s, tags: ["discard"] })));
  await enqueue((s) => ({ ...s, settings: { ...s.settings, theme: "Dark" } }));
  assert.deepEqual(current.tags, ["keep"]);
  assert.equal(current.settings.theme, "Dark");
});
test("AF-01 empty precision intent survives backup; changing intent clears only unsuitable values", async () => {
  const t = { date: "", time: "", zone: "+08:00" };
  assert.equal(
    timePrecision(withPrecision(t, "Date and time")),
    "Date and time",
  );
  const full = { date: "2024-01-15", time: "10:00", zone: "+08:00" };
  assert.deepEqual(withPrecision(full, "Date only"), {
    date: "2024-01-15",
    time: "",
    zone: "+08:00",
    precision: "Date only",
  });
  assert.deepEqual(withPrecision(full, "Unknown"), {
    date: "",
    time: "",
    zone: "+08:00",
    precision: "Unknown",
  });
  const s = initialState();
  const f = {
    id: "intent",
    created: "",
    updated: "",
    number: "",
    from: { id: "a", name: "" },
    to: { id: "b", name: "" },
    departure: withPrecision(t, "Date and time"),
    arrival: withPrecision(t, "Date only"),
    unit: "km" as const,
    status: "Draft" as const,
    tags: [],
    notes: "",
    fields: {},
    color: "",
    visible: true,
  };
  s.flights.push(f);
  const result = await parseBackup(await backup(s));
  assert.deepEqual(result.flights[0], f);
});
test("AF-02 tags trim empty separators and deduplicate without changing names", () => {
  assert.deepEqual(parseTags("alpha, beta, 中文,  spaced tag  ,alpha,,中文,"), [
    "alpha",
    "beta",
    "中文",
    "spaced tag",
  ]);
  assert.deepEqual(parseTags(""), []);
});
test("v0.0 schema 1 remains accepted with absent precision and route lift", () => {
  const s = initialState();
  delete s.settings.routeHeight;
  assert.equal(validateState(s), s);
  assert.equal(
    timePrecision({ date: "2024-01-15", time: "", zone: "" }),
    "Date only",
  );
  assert.equal(timePrecision({ date: "", time: "", zone: "" }), "Unknown");
});
test("near-surface routes stay clear of ellipsoid, preserve endpoints and independent WGS84 distance", () => {
  const a = { id: "a", name: "PEK", lat: 40.0801, lon: 116.5846 },
    b = { id: "b", name: "LHR", lat: 51.4706, lon: -0.461941 };
  const near = route(a, b),
    high = route(a, b, 100000);
  assert.ok(near.length > 97);
  assert.ok(Math.max(...near.map((p) => p[2])) <= defaults.routeHeight + 4000);
  assert.ok(near.every((p) => p[2] >= 4000));
  assert.ok(
    Math.max(...high.map((p) => p[2])) > Math.max(...near.map((p) => p[2])),
  );
  assert.ok(Math.abs(near[0][0] - a.lon) < 1e-8);
  assert.ok(Math.abs(near.at(-1)![1] - b.lat) < 1e-8);
  const meters = distance(a, b);
  route(a, b, 0);
  assert.equal(distance(a, b), meters);
});
