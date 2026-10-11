const fs = require("node:fs"),
  path = require("node:path");
const { _electron } = require(
  process.env.AIRJOURNEY_PLAYWRIGHT ||
    "C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
(async () => {
  const out = path.resolve("evidence/v0.1/baseline");
  fs.mkdirSync(out, { recursive: true });
  const env = {
    ...process.env,
    AIRJOURNEY_TEST_DIR: path.join(out, "profile"),
  };
  for (const k of [
    "AIRJOURNEY_SMOKE",
    "AIRJOURNEY_BENCHMARK",
    "ELECTRON_RUN_AS_NODE",
  ])
    delete env[k];
  const app = await _electron.launch({
    executablePath:
      process.env.AIRJOURNEY_BASELINE_EXE ||
      path.resolve("release/win-unpacked/AirJourney.exe"),
    env,
  });
  try {
    const p = await app.firstWindow();
    const button = (n) =>
      p.getByRole("button", { name: n, exact: true }).click();
    await p.getByRole("button", { name: "Flights", exact: true }).waitFor();
    await button("+ Add flight");
    const precision = p
      .locator(".editor fieldset")
      .filter({ has: p.getByText("Departure time", { exact: true }) })
      .getByLabel("Precision");
    await precision.selectOption("Date and time");
    await p.waitForTimeout(100);
    const observations = [
      {
        id: "AF-01",
        expected: "Date and time",
        actual: await precision.inputValue(),
      },
    ];
    await p.locator(".editor details").evaluate((n) => (n.open = true));
    const tags = p.getByLabel("Tags (comma separated)");
    await tags.pressSequentially("alpha,");
    observations.push({
      id: "AF-02",
      expected: "alpha,",
      actual: await tags.inputValue(),
    });
    await button("Cancel");
    await button("Confirm");
    await button("Settings");
    await p.getByLabel(/^Theme/).selectOption("Light");
    await p.waitForTimeout(250);
    await p.getByLabel(/^Distance unit/).selectOption("miles");
    await p.waitForTimeout(250);
    await p.evaluate(() => {
      for (const [label, val] of [
        ["Theme", "Dark"],
        ["Distance unit", "km"],
      ]) {
        const l = [...document.querySelectorAll("label")].find(
          (n) => n.firstChild?.textContent.trim() === label,
        );
        const n = l.querySelector("select");
        Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          "value",
        ).set.call(n, val);
        n.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await p.waitForTimeout(500);
    const s = await p.evaluate(() => window.airjourney.load());
    observations.push({
      id: "AF-03",
      expected: { theme: "Dark", units: "km" },
      actual: { theme: s.settings.theme, units: s.settings.units },
    });
    await button("Library");
    const fixture = path.join(out, "airports.json");
    fs.writeFileSync(
      fixture,
      JSON.stringify({
        kind: "Airports",
        entries: [
          {
            id: "v01-preview-test",
            name: "Preview airport",
            lat: 30,
            lon: 120,
            source: "Custom",
          },
        ],
      }),
    );
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, fixture);
    await button("Import");
    await p.getByText("Import preview", { exact: false }).waitFor();
    await button("Airlines");
    await button("Confirm import");
    await p.waitForTimeout(300);
    const after = await p.evaluate(() => window.airjourney.load());
    observations.push({
      id: "AF-04",
      expected: "Airports",
      actual: Object.keys(after.library).filter((k) =>
        after.library[k].some((r) => r.id === "v01-preview-test"),
      ),
    });
    await p.screenshot({ path: path.join(out, "reproduction.png") });
    fs.writeFileSync(
      path.join(out, "observations.json"),
      JSON.stringify({ version: "v0.0", observations }, null, 2),
    );
    console.log(JSON.stringify(observations, null, 2));
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
