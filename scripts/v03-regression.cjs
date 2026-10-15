// Actual application integration; isolated synthetic records, never a real profile.
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const { _electron } = require(
  process.env.AIRJOURNEY_PLAYWRIGHT ||
    "C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const initSql = require("sql.js");
const exe = path.resolve(
    process.argv[2] || "release/v0.3/win-unpacked/AirJourney.exe",
  ),
  out = path.resolve(process.argv[3] || "evidence/v0.3/regression"),
  profile = path.join(out, "profile");
fs.mkdirSync(profile, { recursive: true });
const results = [],
  errors = [];
let app, p, SQL, original;
const load = () => p.evaluate(() => window.airjourney.load()),
  wait = (ms) => p.waitForTimeout(ms);
const button = async (name) => {
  await p.getByRole("button", { name, exact: true }).click();
  await wait(150);
};
const shot = (name) => p.screenshot({ path: path.join(out, name + ".png") });
const test = async (name, fn) => {
  const detail = await fn();
  results.push({ name, status: "PASS", detail });
  console.log("PASS", name);
};
async function open(testing = true) {
  const env = {
    ...process.env,
    AIRJOURNEY_TEST_DIR: profile,
    AIRJOURNEY_SMOKE: "1",
    AIRJOURNEY_UI_TEST: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.AIRJOURNEY_BENCHMARK;
  if (!testing) {
    delete env.AIRJOURNEY_SMOKE;
    delete env.AIRJOURNEY_UI_TEST;
  }
  app = await _electron.launch({
    executablePath: exe,
    env,
    args: ["--force-device-scale-factor=1.5"],
  });
  p = await app.firstWindow();
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.getByRole("button", { name: "+ Add flight", exact: true }).waitFor();
  if (testing)
    await p.waitForFunction(
      () =>
        window.__ajMapDiagnostics?.state === "running" &&
        __ajTestGlobe.scene.globe.tilesLoaded,
    );
  await wait(1400);
}
async function persistFixture(s) {
  const db = new SQL.Database();
  db.run("CREATE TABLE state(id INTEGER PRIMARY KEY,json TEXT NOT NULL)");
  db.run("INSERT INTO state VALUES(1,?)", [JSON.stringify(s)]);
  fs.writeFileSync(
    path.join(profile, "airjourney.sqlite"),
    Buffer.from(db.export()),
  );
  db.close();
}
async function mode(value) {
  await p
    .getByRole("combobox", { name: "Map repeated routes", exact: true })
    .selectOption(value);
  await p.waitForFunction(
    (v) =>
      document.querySelector('[aria-label="Map repeated routes"]').value === v,
    value,
  );
  await wait(1400);
  assert.equal((await load()).settings.repeatRoutes, value);
}
const routes = () =>
  p.evaluate(() =>
    __ajTestGlobe.entities.values
      .filter((e) => e.id.startsWith("route-"))
      .map((e) => ({
        id: e.id,
        ids: e.properties.flightIds.getValue(),
        count: e.properties.routeCount.getValue(),
        offset: e.properties.laneOffset.getValue(),
        selected: e.properties.selected.getValue(),
        width: e.polyline.width.getValue(),
        points: e.polyline.positions.getValue().map((p) => [p.x, p.y, p.z]),
      })),
  );
async function pickFlight(name) {
  const card = p.locator(".flight-select").filter({ hasText: name });
  if ((await card.getAttribute("aria-pressed")) !== "true") await card.click();
  await wait(1000);
  return card;
}
async function hoverRoute() {
  const xy = await p.evaluate(() => {
    const v = __ajTestGlobe,
      e = v.entities.values.find((e) => e.id.startsWith("route-")),
      pts = e.polyline.positions.getValue(),
      q = v.scene.cartesianToCanvasCoordinates(
        pts[Math.floor(pts.length * 0.35)],
      );
    return { x: q.x, y: q.y };
  });
  const b = await p.locator("canvas").boundingBox();
  await p.mouse.move(b.x + xy.x, b.y + xy.y);
  await wait(700);
}
(async () => {
  try {
    SQL = await initSql({
      locateFile: (f) => require.resolve("sql.js/dist/" + f),
    });
    const db = new SQL.Database(
      fs.readFileSync("tests/fixtures/v01-journal.sqlite"),
    );
    original = JSON.parse(
      db.exec("SELECT json FROM state WHERE id=1")[0].values[0][0],
    );
    db.close();
    const template = structuredClone(
      original.flights.find(
        (f) => f.from.code === "PEK" && f.to.code === "LHR",
      ) || original.flights[0],
    );
    const make = (i, reverse = false, prefix = "REPEAT") => ({
      ...structuredClone(template),
      id: "v03-" + String(i).padStart(5, "0"),
      number: prefix + "-" + String(i).padStart(4, "0"),
      from: structuredClone(reverse ? template.to : template.from),
      to: structuredClone(reverse ? template.from : template.to),
      deleted: undefined,
      visible: true,
      notes: "Synthetic v0.3 repeat fixture",
      distance: 1234.5,
      unit: "km",
    });
    const start = structuredClone(original);
    start.settings.reducedMotion = true;
    delete start.settings.repeatRoutes;
    start.flights = [make(0), make(1, true), make(2)];
    start.library.Airlines.push({
      id: "personal-v03",
      name: "Personal Preserved Airline",
      code: "9X",
      aliases: "My private carrier",
      source: "Custom",
    });
    await persistFixture(start);
    await open();
    await test("v0.1 schema and personal references open unchanged in v0.3", async () => {
      assert.deepEqual(await load(), JSON.parse(JSON.stringify(start)));
      assert.equal(await app.evaluate(({ app }) => app.getVersion()), "0.3.0");
    });
    await test("default thick mode combines both directions and exposes count", async () => {
      const rs = await routes();
      assert.equal(rs.length, 1);
      assert.equal(rs[0].count, 3);
      assert.ok(rs[0].width > start.settings.width);
      const arrows = await p.evaluate(() =>
        __ajTestGlobe.entities.values
          .filter((e) => e.id.startsWith("direction-"))
          .map((e) => ({
            from: e.properties.directionFrom.getValue(),
            to: e.properties.directionTo.getValue(),
            ids: e.properties.flightIds.getValue(),
          })),
      );
      assert.equal(arrows.length, 2);
      assert.deepEqual(arrows.map((e) => e.ids.length).sort(), [1, 2]);
      return { width: rs[0].width, arrows };
    });
    await test("odd split has exact central arc and a symmetric pair", async () => {
      await mode("separate");
      const rs = await routes();
      assert.equal(rs.length, 3);
      const os = rs.map((r) => r.offset).sort((a, b) => a - b);
      assert.equal(os[1], 0);
      assert.ok(Math.abs(os[0] + os[2]) < 1e-7);
      const first = rs[0].points;
      assert.ok(
        rs.every(
          (r) =>
            r.points[0].every((v, i) => Math.abs(v - first[0][i]) < 1e-4) ||
            r.points.at(-1).every((v, i) => Math.abs(v - first[0][i]) < 1e-4),
        ),
      );
      await shot("01-odd-split");
      return os;
    });
    await test("click select, same click deselect, switch and map highlights stay synchronized", async () => {
      const before = await load();
      await p.getByRole("textbox", { name: "Search flights" }).fill("REPEAT");
      const c = await pickFlight("REPEAT-0000");
      assert.equal(await p.locator(".flight-card.selected").count(), 1);
      assert.equal((await routes()).filter((r) => r.selected).length, 1);
      await c.click();
      await wait(500);
      assert.equal(await p.locator(".flight-card.selected").count(), 0);
      assert.equal((await routes()).filter((r) => r.selected).length, 0);
      assert.equal(
        await p.getByRole("textbox", { name: "Search flights" }).inputValue(),
        "REPEAT",
      );
      assert.deepEqual(await load(), before);
      await pickFlight("REPEAT-0001");
      await p
        .locator(".flight-select")
        .filter({ hasText: "REPEAT-0002" })
        .click();
      await wait(400);
      assert.equal(
        await p
          .locator(".flight-card.selected .flight-select")
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.ok(
        (await p.locator(".flight-card.selected").innerText()).includes(
          "REPEAT-0002",
        ),
      );
      await p.getByRole("textbox", { name: "Search flights" }).fill("");
    });
    await test("editing is independent of toggle; duplicate yields even symmetric split", async () => {
      await pickFlight("REPEAT-0002");
      await button("Edit flight");
      await p
        .getByRole("textbox", { name: "Flight number", exact: true })
        .fill("REPEAT-EDITED");
      await button("Save flight");
      assert.ok(
        (await load()).flights.some((f) => f.number === "REPEAT-EDITED"),
      );
      await button("Duplicate");
      await wait(1200);
      const rs = await routes(),
        os = rs.map((r) => r.offset).sort((a, b) => a - b);
      assert.equal(rs.length, 4);
      assert.ok(!os.includes(0));
      assert.ok(
        Math.abs(os[0] + os[3]) < 1e-6 && Math.abs(os[1] + os[2]) < 1e-6,
      );
      assert.ok((await load()).flights.every((f) => f.distance === 1234.5));
      await shot("02-even-split");
      return os;
    });
    await test("hover thick route shows total and endpoint codes; actual map pick opens all flights", async () => {
      await mode("thick");
      await pickFlight("REPEAT-0000");
      await hoverRoute();
      assert.ok(
        (await p.locator(".route-count").innerText()).includes("4 flights"),
      );
      const visible = await p
        .locator("[data-kind=airport]")
        .evaluateAll((ns) =>
          ns
            .filter((n) => Number(n.dataset.alpha) > 0.9)
            .map((n) => n.textContent),
        );
      assert.ok(visible.length >= 2);
      await p.evaluate(() => {
        const v = __ajTestGlobe,
          e = v.entities.values.find((e) => e.id.startsWith("route-")),
          pts = e.polyline.positions.getValue(),
          q = v.scene.cartesianToCanvasCoordinates(
            pts[Math.floor(pts.length * 0.35)],
          );
        v.screenSpaceEventHandler.getInputAction(2)({ position: q });
      });
      await p.waitForFunction(
        () => document.querySelectorAll(".route-popover>button").length === 4,
      );
      await p.locator(".route-popover>button").last().click();
      await wait(400);
      assert.equal(await p.locator(".route-popover").count(), 0);
      await shot("03-count-hover");
    });
    await test("repeat mode and all data survive real process restart", async () => {
      await mode("separate");
      const saved = await load();
      await app.close();
      await open();
      assert.deepEqual(await load(), saved);
      assert.equal(
        await p
          .getByRole("combobox", { name: "Map repeated routes", exact: true })
          .inputValue(),
        "separate",
      );
    });
    await test("airline numeric code/name search, A-Z browse and SVG options", async () => {
      await button("+ Add flight");
      const input = p.getByRole("combobox", {
        name: "Search airlines",
        exact: true,
      });
      await input.fill("6E");
      await wait(300);
      assert.ok(
        (await p.locator(".airline-options").innerText()).includes("IndiGo"),
      );
      await input.fill("Lufthansa");
      const exact = p
        .getByRole("option")
        .filter({ has: p.getByText("LH · Lufthansa", { exact: true }) })
        .first();
      await exact.waitFor();
      assert.ok(await exact.locator("img").count());
      await exact.click();
      assert.ok(
        (await p.locator(".airline-current").innerText()).includes("Lufthansa"),
      );
      await button("Browse A–Z");
      await p.getByRole("button", { name: "Z", exact: true }).click();
      assert.ok(
        (await p.locator(".airline-options strong").allTextContents()).every(
          (t) =>
            t.split(" · ").slice(1).join(" · ").toLowerCase().startsWith("z"),
        ),
      );
      await input.fill("Aero Oy");
      await wait(200);
      assert.ok(
        (await p.locator(".airline-options").innerText()).includes(
          "Historical names: Aero",
        ),
      );
      await input.fill("My private carrier");
      await wait(200);
      assert.ok(
        (await p.locator(".airline-options").innerText()).includes(
          "Personal Preserved Airline",
        ),
      );
      await shot("04-airline-picker");
      await input.press("Escape");
      await button("Cancel");
      if (await p.getByRole("button", { name: "Confirm", exact: true }).count())
        await button("Confirm");
    });
    await test("airline library searches global catalogue, preserves personal records and full mark preview", async () => {
      await button("Library");
      await button("Airlines");
      await p
        .getByRole("textbox", { name: "Search Library" })
        .fill("China Eastern");
      await p
        .locator(".reference-row")
        .filter({ hasText: "China Eastern Airlines" })
        .first()
        .click();
      assert.ok(await p.locator(".logo-preview img").count());
      await p.getByText("Bundled full logo", { exact: true }).click();
      assert.ok(await p.locator(".brand-full img").count());
      await shot("05-brand-variants");
      await button("Cancel");
      await button("Flights");
    });
    await test("all 20 supplied airline choices render and save portable SVG snapshots", async () => {
      const brands = JSON.parse(
        fs.readFileSync("src/airline-brand-assets.json", "utf8"),
      );
      await pickFlight("REPEAT-0000");
      for (const brand of Object.values(brands)) {
        console.log("CHECK BRAND", brand.code, brand.name);
        await button("Edit flight");
        const search = p.getByRole("combobox", { name: "Search airlines", exact: true });
        await search.click();
        await search.fill("");
        await search.pressSequentially(brand.name, { delay: 25 });
        const choice = p
          .getByRole("option")
          .filter({
            has: p.getByText(brand.code + " · " + brand.name, { exact: true }),
          })
          .first();
        await choice.click();
        await p.waitForFunction(() => {
          const n = document.querySelector(".airline-current img");
          return n?.complete && n.naturalWidth > 0;
        });
        assert.equal(await p.locator(".airline-current img").getAttribute("src"), brand.symbol || brand.full);
        await p.locator(".airline-current").scrollIntoViewIfNeeded();
        if (brand.code === "SQ") await shot("05c-singapore-symbol");
        if (brand.code === "EK") await shot("05d-emirates-symbol");
        if (brand.code === "NH") await shot("05e-ana-symbol");
        await button("Save flight");
        const f = (await load()).flights.find(
          (f) => f.number === "REPEAT-0000",
        );
        assert.equal(f.airline.code, brand.code);
        assert.equal(f.airline.logo, brand.symbol || brand.full);
      }
      await shot("05b-all-brands-saved");
      return { savedBrands: Object.keys(brands).length };
    });
    await test("app header uses the single transparent canonical logo", async () => {
      const icon = await p.locator(".brandmark").evaluate((n) => ({
        src: n.getAttribute("src"),
        complete: n.complete,
        width: n.naturalWidth,
      }));
      assert.equal(icon.src, "./app-logo.svg");
      assert.ok(icon.complete && icon.width === 256);
      const handle = await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]
          .getNativeWindowHandle()
          .readBigUInt64LE()
          .toString(),
      );
      fs.writeFileSync(
        path.join(out, "native-window.json"),
        JSON.stringify({
          handle,
          exe,
          version: "0.3.0",
          pid: app.process().pid,
        }),
      );
      const probe = require("node:child_process").spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          path.resolve("scripts/verify-app-icon.ps1"),
          "-Executable",
          exe,
          "-WindowHandle",
          handle,
          "-OutDir",
          path.join(out, "native-icons"),
        ],
        { encoding: "utf8", timeout: 20000 },
      );
      assert.equal(probe.status, 0, probe.stderr || probe.stdout);
      const native = JSON.parse(
        fs
          .readFileSync(
            path.join(out, "native-icons/native-icon-report.json"),
            "utf8",
          )
          .replace(/^\uFEFF/, ""),
      );
      assert.ok(native.fileVersion.startsWith("0.3.0"));
      assert.equal(native.records.length, 4);
      assert.ok(native.records.every((r) => r.cornerAlpha === 0));
      return icon;
    });
    const saved = await load();
    for (const n of [100, 1000, 1001])
      await test(
        n +
          " repeated flights preserve IDs, bounded symmetry, selection and render loop",
        async () => {
          await app.close();
          const s = structuredClone(saved);
          s.flights = Array.from({ length: n }, (_, i) =>
            make(i, i % 2 === 1, "MASS"),
          );
          await persistFixture(s);
          const began = Date.now();
          await open();
          const rs = await routes();
          assert.equal(rs.length, Math.min(n, n % 2 ? 241 : 240));
          assert.equal(new Set(rs.flatMap((r) => r.ids)).size, n);
          assert.ok(rs.every((r) => r.count === n));
          const os = rs.map((r) => r.offset).sort((a, b) => a - b);
          assert.ok(Math.abs(os[0] + os.at(-1)) < 1e-6);
          assert.equal(os.includes(0), !!(n % 2));
          await pickFlight("MASS-" + String(n - 1).padStart(4, "0"));
          assert.equal((await routes()).filter((r) => r.selected).length, 1);
          assert.deepEqual(
            (await load()).flights,
            JSON.parse(JSON.stringify(s.flights)),
          );
          assert.deepEqual(
            await p.evaluate(() => __ajMapDiagnostics.errors),
            [],
          );
          if (n === 1000) await shot("06-thousand-split");
          return {
            visualLanes: rs.length,
            records: n,
            elapsedMs: Date.now() - began,
          };
        },
      );
    await test("backup export/restore retains mode, airline snapshot and personal data", async () => {
      await button("Settings");
      await button("Data & backup");
      await button("Export backup");
      const files = fs
        .readdirSync(profile)
        .filter((n) => n.endsWith(".airjourney"));
      assert.ok(files.length);
      const name = files.at(-1);
      fs.copyFileSync(
        path.join(profile, name),
        path.join(profile, "import-next.bin"),
      );
      const before = await load();
      await button("Import backup");
      await p
        .getByLabel("Conflict policy")
        .selectOption("Replace entire personal library");
      await button("Confirm import");
      if (await p.getByRole("button", { name: "Confirm", exact: true }).count())
        await button("Confirm");
      await wait(800);
      assert.deepEqual(await load(), before);
    });
    await test("minimum window layout and normal-mode select/deselect remain usable", async () => {
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].setSize(1024, 720),
      );
      await button("Flights");
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await shot("07-minimum");
      await app.close();
      await open(false);
      const c = p.locator(".flight-select").first();
      await c.click();
      assert.equal(await c.getAttribute("aria-pressed"), "true");
      await c.click();
      assert.equal(await c.getAttribute("aria-pressed"), "false");
      assert.equal(await p.locator(".map-error").count(), 0);
      await shot("08-normal-mode");
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(
        {
          version: "0.3.0",
          results,
          pageErrors: errors,
          syntheticFixtures: true,
          physicalWindowsDpiChanged: false,
        },
        null,
        2,
      ),
    );
    await app.close();
    console.log("COMPLETE", results.length);
  } catch (e) {
    if (p) fs.writeFileSync(path.join(out, "failure-dom.json"), JSON.stringify(await p.evaluate(() => ({picker: document.querySelector('.airline-picker')?.textContent, images: [...document.querySelectorAll('.airline-current img')].map(n=>({complete:n.complete,width:n.naturalWidth,srcPrefix:n.getAttribute('src')?.slice(0,80)}))})).catch(()=>null),null,2));
    fs.writeFileSync(path.join(out, "failure.txt"), String(e.stack));
    if (p) await shot("failure").catch(() => {});
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(
        { results, pageErrors: errors, failure: String(e.stack) },
        null,
        2,
      ),
    );
    await app?.close().catch(() => {});
    console.error(e);
    process.exitCode = 1;
  }
})();
