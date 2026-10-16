// Actual packaged app; synthetic historical coordinates seeded before launch.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { _electron } = require(
  process.env.AIRJOURNEY_PLAYWRIGHT ||
    "C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const initSql = require("sql.js");
const exe = path.resolve(
    process.argv[2] || "release/v0.4/win-unpacked/AirJourney.exe",
  ),
  out = path.resolve(process.argv[3] || "evidence/v0.4/map-recovery");
fs.mkdirSync(out, { recursive: true });
const profile = path.join(out, "profile");
fs.mkdirSync(profile, { recursive: true });
const results = [],
  pageErrors = [];
let app, p;
const wait = (ms) => p.waitForTimeout(ms),
  load = () => p.evaluate(() => window.airjourney.load());
const button = async (name) => {
  await p.getByRole("button", { name, exact: true }).click();
  await wait(180);
};
const field = (name) =>
  p
    .locator("label")
    .filter({
      hasText: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    })
    .locator("input,select,textarea")
    .first();
const test = async (name, fn) => {
  const detail = await fn();
  results.push({ name, status: "PASS", detail });
  console.log("PASS", name);
};
const shot = (name) => p.screenshot({ path: path.join(out, name + ".png") });
const focus = async (name) => {
  await button("Flights");
  const card=p.locator(".flight-select").filter({ hasText: name }); if(await card.getAttribute("aria-pressed")!=="true")await card.click();
  await wait(1500);
};
async function open(testing = true) {
  const env = {
    ...process.env,
    AIRJOURNEY_TEST_DIR: profile,
    AIRJOURNEY_SMOKE: "1",
    AIRJOURNEY_UI_TEST: "1",
    AIRJOURNEY_BACKGROUND_TEST: "1",
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
    args: ["--force-device-scale-factor=2"],
  });
  p = await app.firstWindow();
  assert.ok(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().every(w=>!w.isVisible()&&!w.isFocused())),"Background test window unexpectedly visible/focused");
  p.on("pageerror", (e) => pageErrors.push(String(e)));
  await p.getByRole("button", { name: "+ Add flight", exact: true }).waitFor();
  if (testing)
    await p.waitForFunction(
      () =>
        window.__ajMapDiagnostics?.state === "running" &&
        __ajTestGlobe.scene.globe.tilesLoaded,
    );
  await wait(1200);
}
async function seed() {
  const SQL = await initSql({
    locateFile: (n) => require.resolve("sql.js/dist/" + n),
  });
  const old = new SQL.Database(
    fs.readFileSync("tests/fixtures/v00-journal.sqlite"),
  );
  const s = JSON.parse(
    old.exec("SELECT json FROM state WHERE id=1")[0].values[0][0],
  );
  old.close();
  const rows = JSON.parse(
    fs.readFileSync("public/data/airports-global.json", "utf8"),
  );
  const byCode = (code) => structuredClone(rows.find((r) => r.iata === code));
  const bom = byCode("BOM"),
    approx = {
      id: "legacy-approx",
      name: "Legacy approximate fixture (synthetic)",
      code: "APX",
      lat: bom.lat + 0.1,
      lon: bom.lon + 0.08,
      locationKind: "approximate",
      locationSource: "Historical synthetic test city; not a real airport",
      source: "Legacy test",
    };
  s.library.Airports.push(approx);
  const template = s.flights[0];
  s.flights = [
    ["long", "MAP-LONG", byCode("JFK"), byCode("SIN")],
    ["short", "MAP-SHORT-LEGACY", bom, approx],
    ["near", "MAP-NEAR-EXACT", byCode("HND"), byCode("NRT")],
  ].map(([id, number, from, to]) => ({
    ...structuredClone(template),
    id,
    number,
    from,
    to,
    departure: { date: "", time: "", zone: "" },
    arrival: { date: "", time: "", zone: "" },
    deleted: undefined,
    status: "Recorded",
    visible: true,
    color: "",
  }));
  s.settings = {
    ...s.settings,
    theme: "Light",
    remember: false,
    reducedMotion: false,
    width: 4,
    routeHeight: 12000,
    labels: true,
  };
  const db = new SQL.Database();
  db.run(
    "CREATE TABLE state(id INTEGER PRIMARY KEY,json TEXT); PRAGMA user_version=1;",
  );
  db.run("INSERT INTO state VALUES(1,?)", [JSON.stringify(s)]);
  fs.writeFileSync(path.join(profile, "airjourney.sqlite"), db.export());
  db.close();
  fs.writeFileSync(path.join(out, "seed.json"), JSON.stringify(s, null, 2));
  return JSON.parse(JSON.stringify(s));
}
const diag = () => p.evaluate(() => structuredClone(__ajMapDiagnostics));
(async () => {
  try {
    const original = await seed();
    await open();
    await test("historical positions and original v0.4 version retained", async () => {
      assert.deepEqual((await load()).flights, original.flights);
      assert.ok((await p.locator(".brand").innerText()).includes("v0.4"));
      return await diag();
    });
    await focus("MAP-NEAR-EXACT");
    await wait(1000);
    await test("routes drawn initially while airport codes and names are hidden", async () => {
      assert.ok(
        await p.evaluate(() => !!__ajTestGlobe.entities.getById("route-near")),
      );
      const a = await p
        .locator("[data-kind=airport]")
        .evaluateAll((nodes) => nodes.map((n) => Number(n.dataset.alpha)));
      assert.ok(a.every((n) => n === 0));
      await shot("01-default-hidden");
    });
    const hover = async () => {
      const pt = await p.evaluate(() => {
        const v = __ajTestGlobe;
        v.scene.render(v.clock.currentTime);
        const
          pts = v.entities.getById("route-near").polyline.positions.getValue();
        const c = v.scene.cartesianToCanvasCoordinates(
          pts[Math.floor(pts.length * 0.5)],
        );
        return { x: c.x, y: c.y };
      });
      await p.evaluate(pt=>__ajTestGlobe.screenSpaceEventHandler.getInputAction(15)({endPosition:pt}),pt);
    };
    await test("route hover fades airport three-letter codes in and out", async () => {
      await hover();
      await wait(65);
      const middle = await p
        .locator("[data-kind=airport]")
        .evaluateAll((ns) => ns.map((n) => Number(n.dataset.alpha)));
      assert.ok(middle.some((a) => a > 0 && a < 1));
      await wait(400);
      const visible = await p
        .locator("[data-kind=airport]")
        .evaluateAll((ns) =>
          ns
            .filter((n) => Number(n.dataset.alpha) > 0.9)
            .map((n) => n.textContent),
        );
      assert.ok(visible.includes("HND") && visible.includes("NRT"));
      await shot("02-hover-codes");
      await p.evaluate(()=>__ajTestGlobe.canvas.dispatchEvent(new MouseEvent('mouseleave')));
      await wait(65);
      const fading = await p
        .locator("[data-kind=airport]")
        .evaluateAll((ns) => ns.map((n) => Number(n.dataset.alpha)));
      assert.ok(fading.some((a) => a > 0 && a < 1));
      await wait(450);
      assert.ok(
        (
          await p
            .locator("[data-kind=airport]")
            .evaluateAll((ns) => ns.map((n) => Number(n.dataset.alpha)))
        ).every((a) => a === 0),
      );
      return { middle, visible };
    });
    await test("zoomed-out country labels do not overlap and lower priority labels disappear", async () => {
      await p
        .evaluate(() => {
          const v = __ajTestGlobe;
          v.camera.setView({
            destination: v.camera.positionWC.constructor.fromDegrees(
              5,
              50,
              35000000,
            ),
          });
          v.scene.requestRender();
        })
        .catch(async () => {
          await app.evaluate(({ BrowserWindow }) => {});
          throw Error("test Cartesian helper unavailable");
        });
      await wait(600);
      const boxes = await p.locator("[data-kind=country]").evaluateAll((ns) =>
        ns
          .filter((n) => Number(n.dataset.alpha) > 0.95)
          .map((n) => ({
            name: n.textContent,
            r: n.getBoundingClientRect().toJSON(),
          })),
      );
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r,
            b = boxes[j].r;
          assert.ok(
            a.right <= b.left ||
              b.right <= a.left ||
              a.bottom <= b.top ||
              b.bottom <= a.top,
            JSON.stringify([boxes[i], boxes[j]]),
          );
        }
      assert.ok(boxes.length > 0 && boxes.length < 18);
      await shot("03-decluttered-world");
      return boxes.map((b) => b.name);
    });
    await test("no manual airport coordinates, new-airport creation, or globe picking controls", async () => {
      await button("+ Add flight");
      assert.equal(
        await p
          .locator("label")
          .filter({
            hasText:
              /^(Latitude|Longitude|Location type|Location source|Airport \/ place name)/,
          })
          .count(),
        0,
      );
      assert.equal(
        await p
          .getByRole("button", { name: "Pick on globe", exact: true })
          .count(),
        0,
      );
      await button("Cancel");
      if (await p.getByRole("alertdialog").count()) await button("Confirm");
      await button("Library");
      assert.equal(
        await p.getByRole("button", { name: "+ Add new", exact: true }).count(),
        0,
      );
      await p.getByLabel("Search Library").fill("VABB");
      await p.locator(".reference-row").first().click();
      assert.equal(
        await p.locator(".library-edit input[type=number]").count(),
        0,
      );
      await button("Back to airports");
      await button("Airlines");
      assert.equal(
        await p.getByRole("button", { name: "+ Add new", exact: true }).count(),
        1,
      );
    });
    await test("airport import and modification controls are absent",async()=>{await button('Airports');assert.equal(await p.getByRole('button',{name:'Import',exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:'+ Add new',exact:true}).count(),0);});
    await test("new flight selection uses supplied catalogue coordinates", async () => {
      await button("Flights");
      await button("+ Add flight");
      await field("Flight number").fill("NEW-GIVEN");
      for (const [side, code] of [
        ["departure", "FAOR"],
        ["arrival", "NZWN"],
      ]) {
        await p
          .getByRole("combobox", { name: `Search ${side} airports` })
          .fill(code);
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
      await button("Save flight");
      await wait(800);
      const f = (await load()).flights.find((f) => f.number === "NEW-GIVEN");
      assert.ok(f.from.id.startsWith("oa-") && f.to.id.startsWith("oa-"));
      assert.equal(
        (await load()).library.Airports.length,
        original.library.Airports.length,
      );
    });
    await test("long / legacy near / exact near routes survive repeated selection, edits and sidebar changes", async () => {
      for (let i = 0; i < 12; i++) {
        await focus(
          i % 3 === 0
            ? "MAP-LONG"
            : i % 3 === 1
              ? "MAP-SHORT-LEGACY"
              : "MAP-NEAR-EXACT",
        );
        await button("Edit flight");
        await button("Save flight");
        await button("◧ Hide sidebar");
        await button("◨ Show sidebar");
        await wait(180);
      }
      assert.deepEqual((await diag()).errors, []);
      assert.equal(await p.locator(".map-error").count(), 0);
      await focus("MAP-SHORT-LEGACY");
      await wait(1000);
      await shot("04-repeat-short");
      return { cycles: 12, diagnostics: await diag() };
    });
    await test("duplicate and save a new legacy near-route record without changing its fixed positions", async () => {
      await focus("MAP-SHORT-LEGACY");
      await button("Duplicate");
      await button("Edit flight");
      await field("Flight number").fill("MAP-SHORT-COPY");
      await button("Save flight");
      await wait(1500);
      const s = await load(),
        f = s.flights.find((f) => f.number === "MAP-SHORT-COPY");
      assert.deepEqual(f.from, original.flights[1].from);
      assert.deepEqual(f.to, original.flights[1].to);
      assert.ok(
        await p.evaluate(
          (id) => !!__ajTestGlobe.entities.getById("route-" + id),
          f.id,
        ),
      );
      assert.deepEqual((await diag()).errors, []);
      await shot("04b-new-near-record");
    });
    await test("zero CSS viewport skips rendering and resumes after restoration", async () => {
      const before = await diag();
      await p.evaluate(() => {
        document.querySelector(".canvas").style.width = "0px";
      });
      await wait(350);
      const during = await diag();
      assert.ok(during.skippedFrames > before.skippedFrames);
      assert.ok(during.frames <= before.frames + 1);
      await p.evaluate(() => {
        document.querySelector(".canvas").style.width = "";
      });
      await wait(500);
      assert.equal((await diag()).state, "running");
      assert.deepEqual((await diag()).errors, []);
      return { before, during, after: await diag() };
    });
    await test("zero native drawing-buffer width with positive CSS viewport is guarded", async () => {
      const before = await diag();
      await p.evaluate(() => {
        const v = __ajTestGlobe,
          g = v.canvas.getContext("webgl2") || v.canvas.getContext("webgl");
        window.__testGl = g;
        Object.defineProperty(g, "drawingBufferWidth", {
          configurable: true,
          get: () => 0,
        });
      });
      await wait(350);
      const during = await diag();
      assert.ok(during.skippedFrames > before.skippedFrames);
      assert.ok(during.frames <= before.frames + 1);
      await p.evaluate(() => delete window.__testGl.drawingBufferWidth);
      await wait(500);
      assert.equal((await diag()).state, "running");
      assert.deepEqual((await diag()).errors, []);
      return { syntheticNativeGetter: true, during };
    });
    await test("hidden window resizing leaves rendering active (native minimize/restore deferred)", async () => {
      for (const size of [
        [1100, 760],
        [1420, 900],
        [1024, 720],
      ]) {
        await app.evaluate(
          ({ BrowserWindow }, s) =>
            BrowserWindow.getAllWindows()[0].setContentSize(...s),
          size,
        );
        await wait(350);
      }
      await wait(700);
      assert.equal((await diag()).state, "running");
      assert.deepEqual((await diag()).errors, []);
    });
    const preserved = await load();
    await test("WebGL context loss rebuilds the map automatically without restarting app or changing data", async () => {
      const n = (await diag()).rebuilds;
      const beforeView = await p.evaluate(() => {
        const v = __ajTestGlobe,
          p = v.camera.positionCartographic;
        return [
          p.longitude,
          p.latitude,
          p.height,
          v.camera.heading,
          v.camera.pitch,
          v.camera.roll,
        ];
      });
      await p.evaluate(() => {
        const v = __ajTestGlobe,
          g = v.canvas.getContext("webgl2") || v.canvas.getContext("webgl");
        g.getExtension("WEBGL_lose_context").loseContext();
      });
      await p.waitForFunction(
        (n) =>
          __ajMapDiagnostics.rebuilds > n &&
          __ajMapDiagnostics.state === "running",
        n,
      );
      await wait(1200);
      assert.deepEqual(await load(), preserved);
      assert.ok(
        await p.evaluate(() =>
          __ajTestGlobe.entities.values.some((e) => e.id.startsWith("route-")),
        ),
      );
      const afterView = await p.evaluate(() => {
        const v = __ajTestGlobe,
          p = v.camera.positionCartographic;
        return [
          p.longitude,
          p.latitude,
          p.height,
          v.camera.heading,
          v.camera.pitch,
          v.camera.roll,
        ];
      });
      beforeView.forEach((n, i) =>
        assert.ok(
          Math.abs(n - afterView[i]) < (i === 2 ? 1 : 0.001),
          "Camera changed on map recovery",
        ),
      );
      await shot("05-context-recovered");
      return { injected: true, diagnostics: await diag() };
    });
    await test("render exception recovery preserves saved records", async () => {
      const n = (await diag()).rebuilds;
      await p.evaluate(() => {
        const v = __ajTestGlobe,
          render = v.render.bind(v);
        v.render = () => {
          v.render = render;
          throw Error(
            "Injected Expected width to be greater than 0, actual value was 0",
          );
        };
      });
      await p.waitForFunction(
        (n) =>
          __ajMapDiagnostics.rebuilds > n &&
          __ajMapDiagnostics.state === "running",
        n,
      );
      await wait(800);
      assert.deepEqual(await load(), preserved);
      return { injected: true, diagnostics: await diag() };
    });
    await test("bounded retry failure offers manual Restart map and recovers in the same process", async () => {
      await p.evaluate(() => {
        const v = __ajTestGlobe,
          render = v.render.bind(v);
        v.render = () => {
          v.render = render;
          throw Error("Injected repeated render error");
        };
      });
      await p
        .getByRole("button", { name: "Restart map", exact: true })
        .waitFor();
      await button("Restart map");
      await p.waitForFunction(() => __ajMapDiagnostics.state === "running");
      await wait(800);
      assert.deepEqual(await load(), preserved);
    });
    await test("actual process restart preserves fixed locations and records", async () => {
      const before = await load();
      await app.close();
      await open();
      assert.deepEqual(await load(), before);
      assert.deepEqual((await diag()).errors, []);
      await shot("06-restart");
    });
    await app.close();
    await open(false);
    await test("normal mode repeated near-route operations remain drawn without testing hooks", async () => {
      assert.equal(
        await p.evaluate(
          () => !!window.__ajTestGlobe || !!window.__ajMapDiagnostics,
        ),
        false,
      );
      await p.evaluate(() => {
        window.__normalMapAlerts = [];
        new MutationObserver(() => {
          const e = document.querySelector(".map-error");
          if (e && !window.__normalMapAlerts.includes(e.textContent))
            window.__normalMapAlerts.push(e.textContent);
        }).observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
      for (let i = 0; i < 3; i++) {
        await focus("MAP-LONG");
        await focus("MAP-SHORT-LEGACY");
        await button("Edit flight");
        await button("Save flight");
        await button("◧ Hide sidebar");
        await button("◨ Show sidebar");
      }
      await wait(4000);
      assert.equal(await p.locator(".map-error").count(), 0);
      await shot("07-normal-short");
      assert.deepEqual(await p.evaluate(() => window.__normalMapAlerts), []);
      return {
        normalMode: true,
        cycles: 3,
        requiresScreenshotVisualReview: true,
      };
    });
    assert.deepEqual(pageErrors, []);
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
          pageErrors,
          faultInjectionDeclared: true,
          originalIntermittentTriggerNotEstablished: true,
        },
        null,
        2,
      ),
    );
    if (app) await app.close().catch(() => {});
  }
})();
