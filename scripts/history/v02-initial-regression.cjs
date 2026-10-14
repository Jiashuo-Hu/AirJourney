// Run against a real packaged executable, with isolated synthetic data only.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { _electron } = require(
  process.env.AIRJOURNEY_PLAYWRIGHT ||
    "C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const exe = path.resolve(
  process.argv[2] || "release/v0.2/win-unpacked/AirJourney.exe",
);
const out = path.resolve(process.argv[3] || "evidence/v0.2/regression");
fs.mkdirSync(out, { recursive: true });
const results = [],
  errors = [],
  profile = path.join(out, "profile");
let app, p;
const env = {
  ...process.env,
  AIRJOURNEY_TEST_DIR: profile,
  AIRJOURNEY_SMOKE: "1",
  AIRJOURNEY_UI_TEST: "1",
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.AIRJOURNEY_BENCHMARK;
const pause = (ms) => p.waitForTimeout(ms);
const button = async (text) => {
  await p.getByRole("button", { name: text, exact: true }).click();
  await pause(220);
};
const field = (label, i = 0) =>
  p
    .locator("label")
    .filter({
      hasText: new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    })
    .locator("input,select,textarea")
    .nth(i);
const state = () => p.evaluate(() => window.airjourney.load());
const shot = (name) => p.screenshot({ path: path.join(out, name + ".png") });
const test = async (name, fn) => {
  const detail = await fn();
  results.push({ name, status: "PASS", detail });
  console.log("PASS", name);
};
async function open(testing = true) {
  const launchEnv = { ...env };
  if (!testing) {
    delete launchEnv.AIRJOURNEY_SMOKE;
    delete launchEnv.AIRJOURNEY_UI_TEST;
  }
  app = await _electron.launch({
    executablePath: exe,
    env: launchEnv,
    args: ["--force-device-scale-factor=1.5"],
  });
  p = await app.firstWindow();
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.getByRole("button", { name: "+ Add flight", exact: true }).waitFor();
  await p.waitForFunction(() => document.fonts.check("600 14px Inter"));
  if (testing)
    await p.waitForFunction(
      () => window.__ajTestGlobe?.scene.globe.tilesLoaded,
      { timeout: 60000 },
    );
  await pause(1200);
}
async function airport(side, q) {
  const input = p.getByRole("combobox", { name: `Search ${side} airports` });
  await input.fill(q);
  await p
    .getByRole("listbox", {
      name:
        side === "departure"
          ? "Departure airport results"
          : "Arrival airport results",
    })
    .getByRole("option")
    .first()
    .click();
}
async function details(summary) {
  const s = p.getByText(summary, { exact: true });
  if (await s.evaluate((n) => !n.parentElement.open)) await s.click();
}
(async () => {
  try {
    await open();
    await test("v0.2 version / simplified empty layout / local catalogue", async () => {
      assert.ok((await p.locator(".brand").innerText()).includes("v0.2"));
      assert.equal(
        await p
          .locator(".globe-heading,.map-footer,.map-help,.map-count")
          .count(),
        0,
      );
      const rows = await p.evaluate(async () => {
        const r = await fetch("./data/airports-global.json");
        return (await r.json()).length;
      });
      assert.equal(rows, 86242);
      await shot("01-empty-light");
      return { localAirportRows: rows };
    });
    await button("+ Add flight");
    await test("bounded airport picker / IATA and ICAO / exact code priority", async () => {
      await p
        .getByRole("combobox", { name: "Search departure airports" })
        .fill("KJFK");
      const options = p
        .getByRole("listbox", { name: "Departure airport results" })
        .getByRole("option");
      assert.ok((await options.count()) <= 30);
      assert.ok((await options.first().innerText()).includes("JFK"));
      await options.first().click();
      assert.equal(
        await field("Airport / place name").inputValue(),
        "John F. Kennedy International Airport",
      );
      await airport("arrival", "WSSS");
      await field("Flight number").fill("V02-EXACT");
    });
    await test("city / country / accented-name search and keyboard selection", async () => {
      const input = p.getByRole("combobox", {
        name: "Search departure airports",
      });
      await input.fill("sao paulo brazil");
      await p
        .getByRole("listbox", { name: "Departure airport results" })
        .getByRole("option")
        .first()
        .waitFor();
      assert.ok(
        (await p
          .getByRole("listbox", { name: "Departure airport results" })
          .getByRole("option")
          .count()) > 0,
      );
      await input.press("Escape");
      await input.fill("München");
      await p
        .getByRole("listbox", { name: "Departure airport results" })
        .getByRole("option")
        .first()
        .waitFor();
      assert.ok(
        (await p
          .getByRole("listbox", { name: "Departure airport results" })
          .getByRole("option")
          .count()) > 0,
      );
      await input.press("Escape");
      await input.fill("KJFK");
      await input.press("Enter");
      assert.ok(
        (await field("Airport / place name").inputValue()).includes("Kennedy"),
      );
    });
    await test("advanced location/details collapsed; fields remain reachable", async () => {
      assert.equal(
        await p
          .getByText("Location & codes", { exact: true })
          .first()
          .evaluate((n) => n.parentElement.open),
        false,
      );
      assert.equal(
        await p
          .getByText("More details", { exact: true })
          .evaluate((n) => n.parentElement.open),
        false,
      );
      await p.getByText("Location & codes", { exact: true }).first().click();
      assert.equal(await field("Latitude").inputValue(), "40.639447");
      await p.getByText("Location & codes", { exact: true }).first().click();
    });
    await button("Save flight");
    await pause(5000);
    const first = (await state()).flights[0];
    await test("airport coordinates create route without importing 86242 rows into personal DB", async () => {
      const s = await state();
      assert.equal(s.flights.length, 1);
      assert.equal(s.library.Airports.length, 15);
      assert.equal(s.flights[0].from.locationKind, "airport");
      assert.equal(s.flights[0].from.iata, "JFK");
      assert.equal(s.flights[0].to.icao, "WSSS");
      const info = await p.evaluate(
        (id) => ({
          route: !!__ajTestGlobe.entities.getById("route-" + id),
          points: __ajTestGlobe.entities.values.filter((e) =>
            e.id.startsWith("point-"),
          ).length,
        }),
        first.id,
      );
      assert.ok(info.route);
      assert.equal(info.points, 2);
      await shot("02-exact-route");
      return info;
    });
    await test("new global airports outside the legacy seed create local routes without timezone guesses", async () => {
      await button("+ Add flight");
      await field("Flight number").fill("V02-GLOBAL");
      await airport("departure", "FAOR");
      await airport("arrival", "NZWN");
      await button("Save flight");
      await pause(5000);
      const s = await state(),
        f = s.flights.find((f) => f.number === "V02-GLOBAL");
      assert.ok(f.from.id.startsWith("oa-"));
      assert.ok(f.to.id.startsWith("oa-"));
      assert.equal(f.from.countryCode, "ZA");
      assert.equal(f.to.countryCode, "NZ");
      assert.equal(f.departure.zone, "");
      assert.equal(f.arrival.zone, "");
      assert.equal(s.library.Airports.length, 15);
      assert.ok(
        await p.evaluate(
          (id) => !!__ajTestGlobe.entities.getById("route-" + id),
          f.id,
        ),
      );
      await shot("02b-new-global-route");
      return {
        from: f.from.ident,
        to: f.to.ident,
        personalRows: s.library.Airports.length,
      };
    });
    await test("Library full catalogue search is paginated", async () => {
      await button("Library");
      await p.getByLabel("Search Library").fill("France");
      await pause(200);
      assert.equal(await p.locator(".reference-row").count(), 60);
      const name = await p.locator(".reference-row").first().innerText();
      await button("Next");
      assert.notEqual(
        await p.locator(".reference-row").first().innerText(),
        name,
      );
      await button("Previous");
      await p.getByLabel("Search Library").fill("NZAA");
      assert.ok(
        (await p.locator(".reference-row").first().innerText()).includes(
          "Auckland",
        ),
      );
    });
    await test("personal airport override has priority; historical flight snapshot unchanged", async () => {
      await p.getByLabel("Search Library").fill("KJFK");
      await p.locator(".reference-row").first().click();
      await field("Name").fill("My JFK terminal");
      await button("Apply to future selections");
      const s = await state();
      assert.equal(s.flights[0].from.name, first.from.name);
      assert.ok(
        s.library.Airports.some(
          (r) => r.id === first.from.id && r.name === "My JFK terminal",
        ),
      );
      await button("Flights");
      await button("+ Add flight");
      await airport("departure", "KJFK");
      assert.equal(
        await field("Airport / place name").inputValue(),
        "My JFK terminal",
      );
      await button("Cancel");
      await button("Confirm");
    });
    await test("Library category switching preserves unsaved draft", async () => {
      await button("Library");
      await button("+ Add new");
      await field("Name").fill("V02-LIB-DRAFT");
      await button("Airlines");
      await button("Airports");
      assert.equal(await field("Name").inputValue(), "V02-LIB-DRAFT");
      await button("Cancel");
    });
    await test("create and select explicit approximate-city reference", async () => {
      await button("+ Add new");
      await field("Name").fill("Approximate Paris test airport");
      await field("City").fill("Paris");
      await field("Region display name").fill("France");
      await field("Latitude").fill("48.85341");
      await field("Longitude").fill("2.3488");
      await field("Location type").selectOption("approximate");
      await field("Location source").fill(
        "Synthetic test using GeoNames Paris city 2988507; not an actual airport",
      );
      await button("Apply to future selections");
      await button("Flights");
      await button("+ Add flight");
      await field("Flight number").fill("V02-APPROX");
      await airport("departure", "Approximate Paris test airport");
      await airport("arrival", "LHR");
      await button("Save flight");
      await pause(5000);
      assert.ok(
        (await p.locator(".flight-detail").innerText()).includes(
          "Approximate city location",
        ),
      );
    });
    await test("approximate location has distinct marker and label, recorded in snapshot", async () => {
      const s = await state(),
        f = s.flights.find((f) => f.number === "V02-APPROX");
      assert.equal(f.from.locationKind, "approximate");
      assert.equal(f.from.lat, 48.85341);
      const marker = await p.evaluate((id) => {
        const e = __ajTestGlobe.entities.getById("point-" + id);
        return {
          text: e.label.text.getValue(),
          color: e.point.color.getValue().toCssColorString(),
          route: __ajTestGlobe.entities.values.some((e) =>
            e.id.startsWith("route-"),
          ),
        };
      }, f.from.id);
      assert.ok(marker.text.startsWith("≈"));
      assert.notEqual(marker.color, "rgb(255,255,255)");
      assert.ok(marker.route);
      await shot("03-approximate-route");
      return marker;
    });
    await test("unlocated custom record is saved; known endpoint remains on globe", async () => {
      await button("+ Add flight");
      await field("Flight number").fill("V02-UNKNOWN");
      await field("Airport / place name").fill("Pending location test");
      await airport("arrival", "LHR");
      await button("Save flight");
      await pause(5000);
      const s = await state(),
        f = s.flights.find((f) => f.number === "V02-UNKNOWN");
      assert.equal(f.from.lat, undefined);
      assert.ok(
        (await p.locator(".flight-detail").innerText()).includes(
          "Needs location",
        ),
      );
      assert.equal(
        await p.evaluate(
          (id) => !!__ajTestGlobe.entities.getById("route-" + id),
          f.id,
        ),
        false,
      );
      assert.ok(
        await p.evaluate(
          (id) => !!__ajTestGlobe.entities.getById("point-" + id),
          f.to.id,
        ),
      );
    });
    await test("flight editing, tags and empty precision survive compact form", async () => {
      await button("Edit flight");
      await field("Flight number").fill("V02-UNKNOWN-EDITED");
      await field("Precision").selectOption("Date and time");
      assert.equal(await field("Precision").inputValue(), "Date and time");
      await details("More details");
      await field("Tags (comma separated)").pressSequentially("one,two,中文");
      await button("Save flight");
      await pause(600);
      const f = (await state()).flights.find(
        (f) => f.number === "V02-UNKNOWN-EDITED",
      );
      assert.deepEqual(f.tags, ["one", "two", "中文"]);
      assert.equal(f.departure.date, "");
      assert.equal(f.departure.precision, "Date and time");
    });
    await test("settings folded groups and adjacent saves persist; map menu reachable", async () => {
      await button("Settings");
      assert.equal(
        await p
          .getByText("Formats & accessibility", { exact: true })
          .evaluate((n) => n.parentElement.open),
        false,
      );
      await details("Formats & accessibility");
      await field("Clock").selectOption("12h");
      await field("Distance unit").selectOption("miles");
      await field("Theme").selectOption("Dark");
      await pause(800);
      const s = await state();
      assert.equal(s.settings.clock, "12h");
      assert.equal(s.settings.units, "miles");
      assert.equal(s.settings.theme, "Dark");
      await p.getByLabel("More map controls").click();
      await button("Save home view");
      await p.getByLabel("More map controls").click();
      await button("Map");
      assert.equal(
        await p
          .getByText("Advanced route style", { exact: true })
          .evaluate((n) => n.parentElement.open),
        false,
      );
      assert.equal(
        await p
          .getByText("Imagery & starting view", { exact: true })
          .evaluate((n) => n.parentElement.open),
        false,
      );
      await shot("04-settings-dark");
    });
    await test("sidebar hide/show and map/list selection remain available", async () => {
      await button("Flights");
      await button("◧ Hide sidebar");
      assert.equal(await p.locator("aside").isVisible(), false);
      await button("◨ Show sidebar");
      assert.equal(await p.locator("aside").isVisible(), true);
      await p
        .locator(".flight-select")
        .filter({ hasText: "V02-APPROX" })
        .click();
      await pause(5000);
      const f = (await state()).flights.find((f) => f.number === "V02-APPROX");
      const xy = await p.evaluate((id) => {
        const e = __ajTestGlobe.entities.getById("point-" + id);
        const v = __ajTestGlobe;
        const pos = e.position.getValue();
        const p = v.scene.cartesianToCanvasCoordinates(pos);
        const b = v.canvas.getBoundingClientRect();
        return { x: b.x + p.x, y: b.y + p.y };
      }, f.from.id);
      await p.mouse.click(xy.x, xy.y);
      await pause(500);
      assert.ok(
        (await p.locator(".flight-detail").innerText()).includes(
          "Approximate Paris",
        ),
      );
    });
    await test("actual UI backup export / preview / complete restoration", async () => {
      const before = await state();
      await button("Settings");
      await button("Data & backup");
      await button("Export backup");
      await pause(300);
      const file = path.join(profile, "AirJourney-v0.2.airjourney");
      assert.ok(fs.existsSync(file));
      fs.copyFileSync(file, path.join(profile, "import-next.bin"));
      await button("Import backup");
      await field("Conflict policy").selectOption(
        "Replace entire personal library",
      );
      await button("Confirm import");
      await pause(700);
      assert.deepEqual(await state(), before);
    });
    const before = await state();
    await app.close();
    await open();
    await test("actual process restart retains flights, custom overrides, location precision and settings", async () => {
      assert.deepEqual(await state(), before);
      await p
        .locator(".flight-select")
        .filter({ hasText: "V02-APPROX" })
        .click();
      await pause(5000);
      await shot("05-restart-dark");
    });
    await app.close();
    await open(false);
    await test("normal mode exact route remains visible after Clock change without camera input", async () => {
      assert.equal(await p.evaluate(() => !!window.__ajTestGlobe), false);
      await p
        .locator(".flight-select")
        .filter({ hasText: "V02-APPROX" })
        .click();
      await pause(6000);
      await shot("06-static-before");
      await button("Settings");
      await details("Formats & accessibility");
      await field("Clock").selectOption("24h");
      await button("Flights");
      await pause(5000);
      await shot("07-static-after-clock");
      assert.equal(
        await p.locator(".flight-select").count(),
        before.flights.length,
      );
      assert.equal((await state()).settings.clock, "24h");
      return {
        screenshotsRequireVisualReview: true,
        noCameraInput: true,
        testingHook: false,
      };
    });
    assert.deepEqual(errors, []);
  } catch (e) {
    results.push({
      name: "suite failure",
      status: "FAIL",
      error: String(e),
      stack: e.stack,
    });
    console.error(e);
    if (p) await shot("failure").catch(() => {});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(
        {
          exe,
          results,
          errors,
          physicalTouchpadTested: false,
          systemDpiChanged: false,
        },
        null,
        2,
      ),
    );
    if (app) await app.close().catch(() => {});
  }
})();
