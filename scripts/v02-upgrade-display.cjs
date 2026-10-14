const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { _electron } = require(
  process.env.AIRJOURNEY_PLAYWRIGHT ||
    "C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const initSql = require("sql.js"),
  { unzipSync, strFromU8 } = require("fflate");
const exe = path.resolve(
    process.argv[2] || "release/v0.2/win-unpacked/AirJourney.exe",
  ),
  out = path.resolve(process.argv[3] || "evidence/v0.2/upgrade-display");
fs.mkdirSync(out, { recursive: true });
const profile = path.join(out, "profile");
fs.mkdirSync(profile, { recursive: true });
const results = [];
let app, p;
async function open(scale) {
  const env = {
    ...process.env,
    AIRJOURNEY_TEST_DIR: profile,
    AIRJOURNEY_SMOKE: "1",
    AIRJOURNEY_UI_TEST: "1",
  };
  delete env.AIRJOURNEY_BENCHMARK;
  delete env.ELECTRON_RUN_AS_NODE;
  app = await _electron.launch({
    executablePath: exe,
    args: ["--force-device-scale-factor=" + scale],
    env,
  });
  p = await app.firstWindow();
  await p.getByRole("button", { name: "Flights", exact: true }).waitFor();
  await p.waitForFunction(
    () => window.__ajTestGlobe?.imageryLayers.length === 1,
  );
  await p.waitForTimeout(1000);
}
const button = async (n) => {
  await p.getByRole("button", { name: n, exact: true }).click();
  await p.waitForTimeout(250);
};
const load = () => p.evaluate(() => window.airjourney.load());
(async () => {
  try {
    const sql = await initSql({
      locateFile: (n) => require.resolve("sql.js/dist/" + n),
    });
    for (const legacy of ["v00", "v01"]) {
      const source = path.resolve(`tests/fixtures/${legacy}-journal.sqlite`),
        db = new sql.Database(fs.readFileSync(source));
      const original = JSON.parse(
        db.exec("SELECT json FROM state WHERE id=1")[0].values[0][0],
      );
      db.close();
      fs.copyFileSync(source, path.join(profile, "airjourney.sqlite"));
      await open(1.5);
      assert.deepEqual(await load(), original);
      results.push({
        name:
          legacy + " SQLite schema 1 opens in v0.2 with every object unchanged",
        status: "PASS",
        records: original.flights.length,
      });
      await p.locator(".flight-select").first().click();
      await button("Edit flight");
      await p.getByLabel("Flight number").fill("V02-UPGRADE-EDIT");
      await button("Save flight");
      const edited = await load();
      assert.ok(edited.flights.some((f) => f.number === "V02-UPGRADE-EDIT"));
      await app.close();
      app = null;
      await open(1.5);
      assert.deepEqual(await load(), edited);
      results.push({
        name: legacy + " record edit in v0.2 survives actual process restart",
        status: "PASS",
      });
      const backup = path.resolve(`tests/fixtures/${legacy}-state.airjourney`);
      const expected = JSON.parse(
        strFromU8(unzipSync(fs.readFileSync(backup))["data.json"]),
      );
      fs.copyFileSync(backup, path.join(profile, "import-next.bin"));
      await button("Settings");
      await button("Data & backup");
      await button("Import backup");
      await p
        .getByLabel("Conflict policy")
        .selectOption("Replace entire personal library");
      await button("Confirm import");
      await p.waitForTimeout(400);
      assert.deepEqual(await load(), expected);
      results.push({
        name:
          legacy +
          " portable backup restores into v0.2 without changing original fields / SVG / settings",
        status: "PASS",
      });
      await app.close();
      app = null;
    }
    for (const scale of [1, 1.5, 2, 3]) {
      await open(scale);
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].setContentSize(1024, 720),
      );
      await p.waitForTimeout(1200);
      const info = await p.evaluate(() => {
        const c = __ajTestGlobe.canvas;
        return {
          dpr: devicePixelRatio,
          ratio: c.width / c.clientWidth,
          expectedRatio: Math.min(
            devicePixelRatio,
            Math.sqrt(4000000 / (c.clientWidth * c.clientHeight)),
            4096 / c.clientWidth,
            4096 / c.clientHeight,
          ),
          width: innerWidth,
          height: innerHeight,
          horizontalOverflow:
            document.documentElement.scrollWidth > innerWidth + 1,
          buttons: [...document.querySelectorAll(".map-tools button")].map(
            (b) => {
              const r = b.getBoundingClientRect();
              return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
            },
          ),
        };
      });
      assert.ok(Math.abs(info.dpr - scale) < 0.02);
      assert.ok(Math.abs(info.ratio - info.expectedRatio) < 0.02);
      assert.equal(info.horizontalOverflow, false);
      assert.ok(
        info.buttons.every(
          (r) =>
            r.x >= 0 &&
            r.y >= 0 &&
            r.right <= info.width &&
            r.bottom <= info.height,
        ),
      );
      await p.screenshot({
        path: path.join(out, "display-" + Math.round(scale * 100) + ".png"),
      });
      results.push({
        name:
          "1024x720 app layout / render ratio at simulated " +
          Math.round(scale * 100) +
          "%",
        status: "PASS",
        detail: info,
      });
      await app.close();
      app = null;
    }
  } catch (e) {
    console.error(e);
    results.push({
      name: "stopped at failure",
      status: "FAIL",
      error: String(e.stack),
    });
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(
        {
          version: "v0.2",
          exe,
          results,
          systemDpiActuallyChanged: false,
          scaleMethod:
            "Electron force-device-scale-factor; software display verification",
        },
        null,
        2,
      ),
    );
  }
})();
