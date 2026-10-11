// Drives the actual packaged application in an isolated profile; not a Vite preview.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { _electron } = require(
  process.env.AIRJOURNEY_PLAYWRIGHT ||
    "C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const exe = path.resolve(
  process.argv[2] || "release/v0.1/win-unpacked/AirJourney.exe",
);
const out = path.resolve(process.argv[3] || "evidence/v0.1/regression");
fs.mkdirSync(out, { recursive: true });
const profile = path.join(out, "profile"),
  results = [],
  errors = [];
const env = {
  ...process.env,
  AIRJOURNEY_TEST_DIR: profile,
  AIRJOURNEY_SMOKE: "1",
  AIRJOURNEY_UI_TEST: "1",
};
delete env.AIRJOURNEY_BENCHMARK;
delete env.ELECTRON_RUN_AS_NODE;
let app, p;
const wait = (ms) => p.waitForTimeout(ms);
const button = async (n) => {
  await p.getByRole("button", { name: n, exact: true }).click();
  await wait(180);
};
const load = () => p.evaluate(() => window.airjourney.load());
const field = (text, index = 0) =>
  p
    .locator("label")
    .filter({
      hasText: new RegExp("^" + text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    })
    .locator("input,select,textarea")
    .nth(index);
const shot = (name) => p.screenshot({ path: path.join(out, name + ".png") });
const height = () =>
  p.evaluate(() => __ajTestGlobe.camera.positionCartographic.height);
const test = async (name, fn) => {
  const detail = await fn();
  results.push({ name, status: "PASS", detail });
  console.log("PASS", name);
};
async function open() {
  app = await _electron.launch({
    executablePath: exe,
    args: ["--force-device-scale-factor=1.5"],
    env,
  });
  p = await app.firstWindow();
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.getByRole("button", { name: "Flights", exact: true }).waitFor();
  await p.waitForFunction(
    () => window.__ajTestGlobe?.imageryLayers.length === 1,
  );
  await p.waitForFunction(() => __ajTestGlobe.scene.globe.tilesLoaded, {
    timeout: 30000,
  });
}
(async () => {
  try {
    await open();
    await test("v0.1 display / local 8K tiles / DPR 150% rendering", async () => {
      const info = await p.evaluate(() => {
        const v = __ajTestGlobe,
          c = v.canvas,
          provider = v.imageryLayers.get(0).imageryProvider;
        return {
          title: document.title,
          text:
            document.querySelector(".brand")?.textContent ||
            document.querySelector("header")?.textContent,
          dpr: devicePixelRatio,
          ratio: c.width / c.clientWidth,
          width: provider.tileWidth,
          levels: provider.maximumLevel,
          fontReady: document.fonts.check("600 14px Inter"),
        };
      });
      assert.ok(info.text.includes("v0.1"));
      assert.ok(Math.abs(info.ratio - info.dpr) < 0.02);
      assert.equal(info.width, 512);
      assert.equal(info.levels, 3);
      assert.ok(info.fontReady);
      return info;
    });
    await button("+ Add flight");
    const precision = field("Precision");
    await precision.selectOption("Date and time");
    await field("Precision", 1).selectOption("Date only");
    await wait(100);
    await test("AF-01 empty precision retains intent without inventing values", async () => {
      assert.equal(await precision.inputValue(), "Date and time");
      assert.equal(await field("Date").inputValue(), "");
      assert.equal(await field("Local time").inputValue(), "");
    });
    await p.locator(".editor details").evaluate((n) => (n.open = true));
    await field("Status").selectOption("Draft");
    await field("Flight number").fill("V01-INTENT");
    const tags = field("Tags \\(comma separated\\)");
    // Use label text rather than parsed tags for keystrokes, including the trailing comma.
    const tagInput = p.getByLabel("Tags (comma separated)");
    await tagInput.pressSequentially("alpha,");
    await test("AF-02 separator survives individual keystrokes", async () => {
      assert.equal(await tagInput.inputValue(), "alpha,");
    });
    await tagInput.pressSequentially("beta, 中文, alpha, spaced tag");
    await button("Save flight");
    await wait(300);
    const intent = (await load()).flights.find(
      (f) => f.number === "V01-INTENT",
    );
    await test("AF-01 / AF-02 save empty intent and normalized multilingual tags", async () => {
      assert.equal(intent.departure.precision, "Date and time");
      assert.equal(intent.departure.date, "");
      assert.equal(intent.departure.time, "");
      assert.equal(intent.arrival.precision, "Date only");
      assert.deepEqual(intent.tags, ["alpha", "beta", "中文", "spaced tag"]);
    });
    await button("Edit flight");
    assert.equal(await field("Precision").inputValue(), "Date and time");
    await field("Precision").selectOption("Date only");
    await field("Date").fill("2024-01-15");
    await field("Precision").selectOption("Date and time");
    await field("Local time").fill("10:00");
    await field("Precision").selectOption("Date only");
    await test("AF-01 downgrade clears time, retains date, Unknown clears both", async () => {
      assert.equal(await field("Date").inputValue(), "2024-01-15");
      assert.equal(await field("Local time").inputValue(), "");
      await field("Precision").selectOption("Unknown");
      assert.equal(await field("Date").inputValue(), "");
      assert.equal(await field("Local time").inputValue(), "");
    });
    await field("Precision").selectOption("Date and time");
    await button("Save flight");
    await button("Edit flight");
    await p.locator(".editor details").evaluate((n) => (n.open = true));
    await tagInput.fill(" pasted, 中文, pasted,, ");
    await button("Save flight");
    await test("AF-02 whole-text input trims and deduplicates tags", async () =>
      assert.deepEqual(
        (await load()).flights.find((f) => f.id === intent.id).tags,
        ["pasted", "中文"],
      ));
    await button("Edit flight");
    await p.locator(".editor details").evaluate((n) => (n.open = true));
    await tagInput.fill("");
    await button("Save flight");
    await test("AF-02 clear tags / restore tags / text search", async () => {
      assert.deepEqual(
        (await load()).flights.find((f) => f.id === intent.id).tags,
        [],
      );
      await button("Edit flight");
      await p.locator(".editor details").evaluate((n) => (n.open = true));
      await tagInput.fill("alpha, beta, 中文, alpha, spaced tag");
      await button("Save flight");
      await p.locator("#flight-search").fill("中文");
      await wait(150);
      assert.equal(await p.locator(".flight-select").count(), 1);
      await p.locator("#flight-search").fill("");
    });
    await button("Settings");
    await field("Theme").selectOption("Light");
    await wait(200);
    await field("Distance unit").selectOption("miles");
    await wait(200);
    await p.evaluate(() => {
      for (const [label, val] of [
        ["Theme", "Dark"],
        ["Distance unit", "km"],
      ]) {
        const l = [...document.querySelectorAll("label")].find(
            (n) => n.firstChild?.textContent.trim() === label,
          ),
          n = l.querySelector("select");
        Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          "value",
        ).set.call(n, val);
        n.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await wait(600);
    await test("AF-03 same-turn Theme and unit changes both persist", async () => {
      const s = await load();
      assert.equal(s.settings.theme, "Dark");
      assert.equal(s.settings.units, "km");
    });
    await button("Map");
    await p.evaluate(() => {
      const ranges = [
        ...document.querySelectorAll(".settings input[type=range]"),
      ];
      for (const [n, val] of [
        [
          ranges.find((n) => n.getAttribute("aria-label") === "Route lift"),
          "20000",
        ],
        [
          ranges.find((n) =>
            n.parentElement.textContent.trim().startsWith("Route width"),
          ),
          "5",
        ],
        [
          ranges.find((n) =>
            n.parentElement.textContent.trim().startsWith("Route opacity"),
          ),
          "0.9",
        ],
      ]) {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        ).set.call(n, val);
        n.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await wait(600);
    await test("AF-03 rapid adjacent map sliders preserve every change", async () => {
      const s = await load();
      assert.equal(s.settings.routeHeight, 20000);
      assert.equal(s.settings.width, 5);
      assert.equal(s.settings.opacity, 0.9);
    });
    await button("Reset map style");
    await wait(250);
    await button("Library");
    const kinds = ["Airports", "Airlines", "Alliances", "Aircraft"];
    for (let i = 0; i < kinds.length; i++) {
      const kind = kinds[i],
        other = kinds[(i + 1) % 4],
        id = "v01-import-" + kind;
      await button(kind);
      fs.writeFileSync(
        path.join(profile, "import-next.bin"),
        JSON.stringify({
          kind,
          entries: [
            {
              id,
              name: "V01 " + kind,
              source: "Custom",
              ...(kind === "Airports" ? { lat: 30, lon: 120 } : {}),
            },
          ],
        }),
      );
      const before = (await load()).flights;
      await button("Import");
      await p.getByText("Import preview · " + kind, { exact: true }).waitFor();
      await button(other);
      await test(
        "AF-04 " + kind + " preview remains bound after category switch",
        async () => {
          assert.ok(
            await p
              .getByText("Import preview · " + kind, { exact: true })
              .isVisible(),
          );
          await button("Confirm import");
          await wait(250);
          const s = await load();
          assert.ok(s.library[kind].some((r) => r.id === id));
          assert.ok(!s.library[other].some((r) => r.id === id));
          assert.deepEqual(s.flights, before);
        },
      );
    }
    await button("Airports");
    const beforeCancel = await load();
    fs.writeFileSync(
      path.join(profile, "import-next.bin"),
      JSON.stringify({
        kind: "Airports",
        entries: [{ id: "cancelled-preview", name: "Cancel me" }],
      }),
    );
    await button("Import");
    await button("Airlines");
    await button("Cancel");
    await test("AF-04 switched preview cancel never changes data", async () =>
      assert.deepEqual(await load(), beforeCancel));
    await button("Airports");
    fs.writeFileSync(
      path.join(profile, "import-next.bin"),
      JSON.stringify({
        kind: "Airports",
        entries: [
          {
            id: "v01-import-Airports",
            name: "Conflict replacement",
            lat: 31,
            lon: 121,
          },
        ],
      }),
    );
    await button("Import");
    await button("Confirm import");
    await wait(250);
    assert.equal(
      (await load()).library.Airports.find(
        (r) => r.id === "v01-import-Airports",
      ).name,
      "V01 Airports",
    );
    await button("Import");
    await p.getByLabel("Replace conflicting Library entries").check();
    await button("Airlines");
    await button("Confirm import");
    await wait(250);
    await test("AF-04 keep / replace matching IDs affects only bound category", async () =>
      assert.equal(
        (await load()).library.Airports.find(
          (r) => r.id === "v01-import-Airports",
        ).name,
        "Conflict replacement",
      ));
    await button("Flights");
    await button("+ Add flight");
    await field("Flight number").fill("V01-ROUTE");
    await field("Choose local airport").selectOption("airport-PEK");
    await field("Choose local airport", 1).selectOption("airport-LHR");
    await button("Save flight");
    await wait(1200);
    await test("new recorded route / near-ground height / clearer width / distance", async () => {
      const s = await load(),
        f = s.flights.find((f) => f.number === "V01-ROUTE");
      assert.ok(f);
      const info = await p.evaluate(() => {
        const v = __ajTestGlobe,
          e = v.entities.values.find((e) => e.id.startsWith("route-")),
          p = e.polyline.positions.getValue();
        return {
          maxHeight: Math.max(
            ...p.map(
              (p) => v.scene.globe.ellipsoid.cartesianToCartographic(p).height,
            ),
          ),
          minHeight: Math.min(
            ...p.map(
              (p) => v.scene.globe.ellipsoid.cartesianToCartographic(p).height,
            ),
          ),
          width: e.polyline.width.getValue(),
          labelFonts: v.entities.values
            .filter((e) => e.label)
            .map((e) => e.label.font.getValue()),
          visibleSamples: p
            .filter((_, i) => i > 10 && i < p.length - 10 && i % 20 === 0)
            .filter((q) => {
              const pt = v.scene.cartesianToCanvasCoordinates(q);
              return (
                pt && v.scene.pick(pt)?.id?.id?.match(/^(route|direction)-/)
              );
            }).length,
        };
      });
      assert.ok(info.maxHeight < 16001);
      assert.ok(info.minHeight >= 3999);
      assert.ok(info.width >= 4);
      assert.ok(info.visibleSamples >= 3);
      assert.ok(info.labelFonts.every((f) => f.includes("28px")));
      return info;
    });
    await shot("01-route-dark-150");
    await button("Settings");
    await field("Theme").selectOption("Light");
    await wait(300);
    await button("Flights");
    await shot("02-route-light-150");
    await p.evaluate(() => {
      const v = __ajTestGlobe,
        opposite = v.camera.positionWC.clone();
      opposite.x = -opposite.x;
      opposite.y = -opposite.y;
      opposite.z = -opposite.z;
      v.camera.setView({
        destination: opposite,
        orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
      });
      __ajTestGlobe.scene.requestRender();
    });
    await wait(400);
    await test("opposite hemisphere route stays occluded by ellipsoid", async () => {
      const count = await p.evaluate(() => {
        const v = __ajTestGlobe,
          e = v.entities.values.find((e) => e.id.startsWith("route-"));
        return e.polyline.positions
          .getValue()
          .filter((_, i) => i % 20 === 0)
          .filter((q) => {
            const pt = v.scene.cartesianToCanvasCoordinates(q);
            return (
              pt &&
              pt.x >= 0 &&
              pt.x < v.canvas.clientWidth &&
              pt.y >= 0 &&
              pt.y < v.canvas.clientHeight &&
              v.scene.pick(pt)?.id?.id?.match(/^(route|direction)-/)
            );
          }).length;
      });
      assert.equal(count, 0);
      return { visibleSamples: count };
    });
    await button("↺ Reset view");
    await wait(900);
    await p.locator(".flight-select").filter({ hasText: "V01-ROUTE" }).click();
    await wait(900);
    const canvas = p.locator(".cesium-widget canvas");
    const box = await canvas.boundingBox(),
      x = box.x + box.width * 0.52,
      y = box.y + box.height * 0.48;
    await p.mouse.move(x, y);
    const beforeWheel = await height();
    await p.mouse.wheel(0, -180);
    await wait(300);
    const inWheel = await height();
    await p.mouse.wheel(0, 180);
    await wait(300);
    await test("packaged mouse wheel zoom in and out", async () => {
      assert.ok(inWheel < beforeWheel);
      assert.ok((await height()) > inWheel);
      return { before: beforeWheel, in: inWheel, out: await height() };
    });
    await p.keyboard.down("Control");
    const pinchBefore = await height();
    await p.mouse.wheel(0, -45);
    await p.keyboard.up("Control");
    await wait(250);
    await test("synthetic precision-touchpad ctrl+wheel zoom path", async () => {
      assert.ok((await height()) < pinchBefore);
      return {
        hardwareTested: false,
        before: pinchBefore,
        after: await height(),
      };
    });
    const beforeDouble = await height();
    await p.mouse.dblclick(x, y, { delay: 70 });
    await wait(350);
    const afterDouble = await height();
    await p.keyboard.down("Shift");
    await p.mouse.dblclick(x, y, { delay: 70 });
    await p.keyboard.up("Shift");
    await wait(350);
    await test("double-click in / Shift-double-click out", async () => {
      assert.ok(afterDouble < beforeDouble);
      assert.ok((await height()) > afterDouble);
      return { before: beforeDouble, in: afterDouble, out: await height() };
    });
    const cdp = await p.context().newCDPSession(p);
    const touchBefore = await height();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 35, y, id: 1 },
        { x: x + 35, y, id: 2 },
      ],
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: x - 35 - i * 7, y, id: 1 },
          { x: x + 35 + i * 7, y, id: 2 },
        ],
      });
      await wait(20);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await wait(350);
    await test("synthetic two-contact pinch handled by native Cesium input", async () => {
      assert.ok(Math.abs((await height()) - touchBefore) > 100);
      return {
        hardwareTested: false,
        before: touchBefore,
        after: await height(),
      };
    });
    const rotation = await p.evaluate(() => ({
      x: __ajTestGlobe.camera.positionWC.x,
      y: __ajTestGlobe.camera.positionWC.y,
    }));
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + 100, y + 20, { steps: 12 });
    await p.mouse.up();
    await wait(350);
    await test("drag rotation remains usable alongside zoom", async () => {
      const q = await p.evaluate(() => ({
        x: __ajTestGlobe.camera.positionWC.x,
        y: __ajTestGlobe.camera.positionWC.y,
      }));
      assert.ok(Math.abs(q.x - rotation.x) + Math.abs(q.y - rotation.y) > 1000);
    });
    await button("↺ Reset view");
    await wait(1000);
    await shot("03-globe-overview");
    await p.locator(".flight-select").filter({ hasText: "V01-ROUTE" }).click();
    await wait(400);
    await button("Edit flight");
    await p
      .getByRole("button", { name: "Pick on globe", exact: true })
      .first()
      .click();
    const beforePickDouble = await height();
    await p.mouse.dblclick(x, y, { delay: 70 });
    await wait(300);
    await test("double-click during location preview does not zoom", async () => {
      assert.ok(Math.abs((await height()) - beforePickDouble) < 1);
      assert.ok(
        await p
          .getByRole("button", { name: "Confirm location", exact: true })
          .isVisible(),
      );
    });
    await p
      .locator(".location-prompt button")
      .filter({ hasText: "Cancel" })
      .click()
      .catch(async () => {
        const bs = p.getByRole("button", { name: "Cancel", exact: true });
        await bs.last().click();
      });
    await button("Cancel");
    await button("Confirm");
    const saved = await load();
    await button("Settings");
    await button("Data & backup");
    await button("Export backup");
    const backup = path.join(profile, "AirJourney-v0.1.airjourney");
    assert.ok(fs.existsSync(backup));
    fs.copyFileSync(backup, path.join(profile, "import-next.bin"));
    await button("Import backup");
    await p
      .getByLabel("Conflict policy")
      .selectOption("Replace entire personal library");
    await button("Confirm import");
    await wait(350);
    await test("v0.1 full backup / preview / restore preserves precision and personal state", async () =>
      assert.deepEqual(await load(), saved));
    await app.close();
    app = null;
    await open();
    await test("actual process restart retains all records, settings, tags and import categories", async () =>
      assert.deepEqual(await load(), saved));
    await button("Flights");
    await p.locator(".flight-select").filter({ hasText: "V01-INTENT" }).click();
    await button("Edit flight");
    assert.equal(await field("Precision").inputValue(), "Date and time");
    await button("Cancel");
    await button("Confirm");
    await shot("04-restart");
  } catch (e) {
    results.push({
      name: "stopped at failure",
      status: "FAIL",
      error: String(e.stack),
    });
    if (p) await shot("failure").catch(() => {});
    console.error(e);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(
        {
          version: "v0.1",
          exe,
          results,
          errors,
          inputMethod: "Playwright/CDP into actual packaged BrowserWindow",
          physicalTouchpadTested: false,
          scaleMethod:
            "Electron force-device-scale-factor=1.5; not Windows system DPI",
        },
        null,
        2,
      ),
    );
    if (app) await app.close();
  }
})();
