import test from "node:test";
import assert from "node:assert/strict";
import type { Flight } from "../src/types";
import { summarize, flightYears, inYear } from "../src/journey-summary";
import { distance } from "../src/domain";
import { selectedRouteColor } from "../src/map-style";
import { attachMapLoop } from "../src/map-runtime";
const a = { id: "a", name: "Alpha", code: "AAA", lat: 0, lon: 0 };
const b = { id: "b", name: "Beta", code: "BBB", lat: 10, lon: 10 };
const f = (id: string, patch: Partial<Flight> = {}): Flight => ({
  id,
  created: "",
  updated: "",
  number: id,
  from: a,
  to: b,
  departure: { date: "2024-01-01", time: "", zone: "" },
  arrival: { date: "", time: "", zone: "" },
  unit: "km",
  status: "Recorded",
  tags: [],
  notes: "",
  fields: {},
  color: "",
  visible: true,
  ...patch,
});
test("completed/planned/draft/trash separation; hidden routes count and repeated flights each count", () => {
  const s = summarize([
    f("1"),
    f("2", { visible: false }),
    f("p", { status: "Planned" }),
    f("d", { status: "Draft" }),
    f("x", { deleted: "yes" }),
  ]);
  assert.equal(s.completed, 2);
  assert.equal(s.planned, 1);
  assert.equal(s.drafts, 1);
  assert.equal(s.routes[0].count, 2);
});
test("distance is manual or derived once, including manual zero and mixed units; missing is omitted", () => {
  const s = summarize([
    f("1", { distance: 0 }),
    f("2", { distance: 10, unit: "miles" }),
    f("3"),
    f("4", { from: { id: "u", name: "Unknown" } }),
  ]);
  assert.ok(Math.abs(s.meters - (16093.44 + distance(a, b)!)) < 1e-6);
  assert.equal(s.estimates, 1);
  assert.equal(s.distanceMissing, 1);
});
test("airport aliases share explicit ID/code even when coordinates differ; return directions combine", () => {
  const s = summarize([
    f("1"),
    f("2", { from: { ...b, id: "old-b", lat: 11 }, to: { ...a, id: "old-a" } }),
    f("3", { from: { ...a, code: undefined }, to: b }),
  ]);
  assert.equal(s.airports, 2);
  assert.equal(s.routes.length, 1);
  assert.equal(s.routes[0].count, 3);
});
test("airline IDs/name-code deduplicate, reused code alone does not; unknown identities excluded", () => {
  const s = summarize([
    f("1", { airline: { id: "x", name: "Air One", code: "A1" } }),
    f("2", { airline: { id: "old-x", name: "air one", code: "A1" } }),
    f("3", { airline: { id: "z", name: "Different Air", code: "A1" } }),
    f("4"),
  ]);
  assert.equal(s.airlines, 2);
  assert.equal(s.airlineRecordsMissing, 1);
});
test("known endpoints count even if other endpoint missing; no invented route ranking", () => {
  const s = summarize([f("1", { to: { id: "unknown", name: "" } })]);
  assert.equal(s.airports, 1);
  assert.equal(s.airportRecordsMissing, 1);
  assert.equal(s.routes.length, 0);
  assert.equal(s.routesMissing, 1);
});
test("ten thousand legacy airport aliases deduplicate without recursive stack growth", () => {
  const flights = Array.from({ length: 10000 }, (_, i) =>
    f(String(i), {
      distance: 1,
      from: { ...a, id: "a-" + i },
      to: { ...b, id: "b-" + i },
    }),
  );
  const s = summarize(flights);
  assert.equal(s.completed, 10000);
  assert.equal(s.airports, 2);
  assert.equal(s.routes.length, 1);
  assert.equal(s.routes[0].count, 10000);
  assert.equal(s.meters, 10000000);
});
test("years are local departure dates, descending, include planned and undated only in All", () => {
  const fs = [
    f("1", {
      departure: { date: "2024-01-01", time: "00:05", zone: "+14:00" },
    }),
    f("2", {
      departure: { date: "2025-12-31", time: "23:59", zone: "-12:00" },
      status: "Planned",
    }),
    f("3", { departure: { date: "", time: "", zone: "" } }),
    f("4", {
      departure: { date: "2026-01-01", time: "", zone: "" },
      deleted: "yes",
    }),
  ];
  assert.deepEqual(flightYears(fs), ["2025", "2024"]);
  assert.equal(fs.filter((f) => inYear(f, "All")).length, 4);
  assert.equal(inYear(fs[2], "2024"), false);
  assert.equal(inYear(fs[0], "2024"), true);
  assert.deepEqual(flightYears(fs, true), ["2026"]);
  assert.deepEqual(flightYears(fs.slice(0, 1)), ["2024"]);
});
test("selected route gets a distinct highlight for dark, light and saturated user colors", () => {
  for (const c of [
    "#000000",
    "#ffffff",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffd16b",
    "#173c88",
  ])
    assert.notEqual(selectedRouteColor(c), c);
});
test("positive animated viewports render every frame, no stable-size wait; zero viewports safely resume", () => {
  const oldRAF = globalThis.requestAnimationFrame,
    oldCAF = globalThis.cancelAnimationFrame;
  const oldDpr = Object.getOwnPropertyDescriptor(
    globalThis,
    "devicePixelRatio",
  );
  let next: FrameRequestCallback = () => {},
    draws = 0,
    requests = 0;
  globalThis.requestAnimationFrame = (cb) => {
    next = cb;
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};
  Object.defineProperty(globalThis, "devicePixelRatio", {
    configurable: true,
    value: 1,
  });
  const gl = {
    drawingBufferWidth: 100,
    drawingBufferHeight: 100,
    isContextLost: () => false,
  };
  const host = { clientWidth: 100, clientHeight: 100 };
  const event = { addEventListener: () => () => {} };
  const v = {
    canvas: {
      getContext: () => gl,
      addEventListener() {},
      removeEventListener() {},
    },
    scene: {
      renderError: event,
      postRender: event,
      requestRender: () => requests++,
    },
    isDestroyed: () => false,
    resolutionScale: 1,
    resize() {
      gl.drawingBufferWidth = host.clientWidth;
      gl.drawingBufferHeight = host.clientHeight;
    },
    render() {
      draws++;
    },
  };
  const d = {
    frames: 0,
    skippedFrames: 0,
    rebuilds: 0,
    errors: [],
    lastViewport: [],
    state: "starting",
  };
  try {
    const stop = attachMapLoop(
      v as any,
      host as any,
      d,
      () => {},
      (e) => {
        throw e;
      },
      () => {},
    );
    for (let i = 0; i < 12; i++) {
      host.clientWidth += 5;
      next(performance.now() + i * 16);
    }
    assert.equal(draws, 12);
    assert.equal(d.skippedFrames, 0);
    assert.equal(requests, 12);
    host.clientWidth = 0;
    next(performance.now() + 200);
    assert.equal(draws, 12);
    host.clientWidth = 240;
    next(performance.now() + 216);
    assert.equal(draws, 13);
    assert.equal(d.state, "running");
    stop();
  } finally {
    globalThis.requestAnimationFrame = oldRAF;
    globalThis.cancelAnimationFrame = oldCAF;
    if (oldDpr) Object.defineProperty(globalThis, "devicePixelRatio", oldDpr);
    else delete (globalThis as any).devicePixelRatio;
  }
});
