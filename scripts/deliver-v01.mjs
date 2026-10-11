// Local-only delivery: no Git, HTTP, publishing, or upload operations.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { zipSync, unzipSync } from "fflate";
import asar from "@electron/asar";
await import("./manifest-v01.mjs");
const root = "docs/implementation/v0.1",
  release = "release/v0.1",
  ev = "evidence/v0.1";
const json = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fileSha = (p) => sha(fs.readFileSync(p));
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
    );
const csvCell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
const writeCSV = (file, headers, rows) =>
  fs.writeFileSync(
    file,
    [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n",
  );
const smoke = json(ev + "/installed-smoke/smoke-results.json");
const focused = json(ev + "/installed-regression-final/results.json");
const upgrade = json(ev + "/upgrade-display-final/results.json");
assert.equal(smoke.results.length, 16);
assert.equal(focused.results.length, 25);
assert.equal(upgrade.results.length, 7);
for (const report of [smoke, focused, upgrade])
  assert.ok(report.results.every((r) => r.status === "PASS"));
assert.equal(focused.errors.length, 0);
assert.match(fs.readFileSync(ev + "/unit-tests.log", "utf8"), /pass 20/);
const installer = release + "/AirJourney-v0.1-x64-setup.exe";
assert.equal(
  json(ev + "/install.json").installerSha256.toLowerCase(),
  fileSha(installer),
);
const screenshots = path.join(root, "screenshots");
fs.mkdirSync(screenshots, { recursive: true });
for (const [dir, files] of [
  [
    ev + "/installed-regression-final",
    [
      "01-route-dark-150.png",
      "02-route-light-150.png",
      "03-globe-overview.png",
      "04-restart.png",
    ],
  ],
  [
    ev + "/upgrade-display-final",
    [
      "display-100.png",
      "display-150.png",
      "display-200.png",
      "display-300.png",
    ],
  ],
])
  for (const n of files)
    fs.copyFileSync(path.join(dir, n), path.join(screenshots, n));
const evidence = [
  ev + "/unit-tests.log",
  ev + "/build.log",
  ev + "/package.log",
  ev + "/install.json",
  ev + "/baseline/observations.json",
  ev + "/installed-smoke/smoke-results.json",
  ev + "/installed-regression-final/results.json",
  ev + "/upgrade-display-final/results.json",
  ev + "/benchmark/benchmark.json",
];
const benchmark = json(ev + "/benchmark/benchmark.json");
const fixtureFiles = [
  "tests/fixtures/v00-journal.sqlite",
  "tests/fixtures/v00-state.airjourney",
];
const index = {
  version: "v0.1",
  packageVersion: "0.1.0",
  date: "2026-10-11",
  localOnly: true,
  unitAssertions: 20,
  installedLegacyScenarios: 16,
  installedFocusedScenarios: 25,
  upgradeAndSoftwareScaleScenarios: 7,
  independentV01Acceptance: "NOT RUN",
  physicalTouchpadTested: false,
  systemDpiChanged: false,
  evidence: evidence.map((p) => ({
    path: p,
    sha256: fileSha(p),
    bytes: fs.statSync(p).size,
  })),
  fixtures: fixtureFiles.map((p) => ({
    path: p,
    sha256: fileSha(p),
    syntheticOnly: true,
  })),
  performanceProbe: {
    records: benchmark.records,
    searchP95ms: benchmark.searchP95ms,
    storageCommitP95ms: benchmark.storageCommitP95ms,
    interactive5secMedianFPS: benchmark.interactive5secMedianFPS,
    fullAcceptanceBenchmark: false,
  },
};
fs.writeFileSync(root + "/evidence_index.json", JSON.stringify(index, null, 2));
const testRows = [
  [
    "UNIT",
    "20 domain assertions",
    "PASS",
    ev + "/unit-tests.log",
    "Includes original 14; not full independent acceptance",
  ],
];
for (const [prefix, report, file] of [
  ["LEGACY", smoke, ev + "/installed-smoke/smoke-results.json"],
  ["FOCUSED", focused, ev + "/installed-regression-final/results.json"],
  ["UPGRADE-SCALE", upgrade, ev + "/upgrade-display-final/results.json"],
])
  report.results.forEach((r, i) =>
    testRows.push([
      prefix + "-" + (i + 1),
      r.name || r.test,
      r.status,
      file,
      prefix === "UPGRADE-SCALE"
        ? "Software scaling; not actual Windows DPI"
        : "Actual installed application; automated input",
    ]),
  );
for (const [id, scope] of [
  ["REAL-TOUCHPAD", "Hardware/driver gestures"],
  [
    "SYSTEM-DPI-AT",
    "Actual Windows DPI / complete assistive technology matrix",
  ],
  ["FULL-PERFORMANCE", "Target machine / 10000 records / 60 sec / 15 min"],
  ["INDEPENDENT", "Independent v0.1 acceptance"],
])
  testRows.push([
    id,
    scope,
    "NOT RUN",
    root + "/known_issues.md",
    "Not inferred from synthetic or previous tests",
  ]);
writeCSV(
  root + "/self_test_results.csv",
  ["test_id", "scope", "status", "evidence", "limitations"],
  testRows,
);
const baseline = fs.readFileSync(
  "docs/planning/templates/requirements_traceability.csv",
  "utf8",
);
const ids = [
  ...new Set(
    [...baseline.matchAll(/\b(?:FR|BR|NFR)-\d{2}\b/g)].map((m) => m[0]),
  ),
];
const targeted = {
  "FR-04": "AF-04 bound Library preview",
  "FR-05": "AF-02 raw tags",
  "FR-06": "AF-01 explicit optional precision",
  "FR-09": "8K tiles / DPR rendering / gestures",
  "FR-10": "near-ground routes / visible picking / backface occlusion",
  "FR-11": "clearer English labels",
  "FR-15": "route style / rapid sliders",
  "FR-16": "AF-03 latest-state mutation queue",
  "FR-17": "backup waits for pending saves",
  "NFR-08": "AF-05 source / ASAR / document consistency",
};
const trace = ids.map((id) => [
  id,
  targeted[id] || "Existing v0.0 behavior retained",
  "src;desktop;tests",
  targeted[id]
    ? "TARGETED / SELECTED REGRESSION PASS"
    : "RETAINED / FULL MATRIX NOT RUN",
  root + "/test_report.md",
  "Complete independent requirement matrix NOT RUN",
]);
for (const id of ["AF-01", "AF-02", "AF-03", "AF-04", "AF-05"])
  trace.push([
    id,
    "Requested defect correction",
    id === "AF-05"
      ? "scripts/deliver-v01.mjs"
      : id === "AF-04"
        ? "src/Library.tsx"
        : id === "AF-03"
          ? "src/state-updates.ts;src/App.tsx;src/Settings.tsx"
          : "src/FlightEditor.tsx;src/domain.ts",
    "FIXED / SELFTEST PASS",
    id === "AF-05"
      ? release + "/package-verification.json"
      : ev + "/installed-regression-final/results.json",
    "Independent v0.1 retest pending",
  ]);
for (const [id, scope] of [
  ["SUG-01", "Map and label clarity"],
  ["SUG-02", "Wheel / pinch / double click zoom"],
  ["SUG-03", "Lower / wider illustrative routes"],
])
  trace.push([
    id,
    scope,
    "src/Globe.tsx;src/domain.ts;public/maps/naturalearth",
    "IMPLEMENTED / SELFTEST PASS",
    root + "/screenshots",
    id === "SUG-02"
      ? "Real touchpad NOT RUN"
      : "Limited global imagery / further device testing pending",
  ]);
writeCSV(
  root + "/requirements_traceability.csv",
  [
    "requirement_id",
    "scope",
    "implementation",
    "status",
    "evidence",
    "limitations",
  ],
  trace,
);

// Verify the actual installer runtime archive, not only the staging directory.
const archive = release + "/win-unpacked/resources/app.asar";
const installedArchive = ev + "/installed-app/resources/app.asar";
assert.equal(fileSha(installedArchive), fileSha(archive));
const members = asar
  .listPackage(archive)
  .map((p) => p.replaceAll("\\", "/").replace(/^\//, ""));
const extract = (n) => asar.extractFile(archive, path.normalize(n));
assert.equal(JSON.parse(extract("package.json").toString()).version, "0.1.0");
let productionFiles = 0;
for (const n of members.filter(
  (n) => n.startsWith("dist/") || n.startsWith("desktop/"),
)) {
  if (fs.existsSync(n) && fs.statSync(n).isFile()) {
    assert.equal(sha(extract(n)), fileSha(n), "Production mismatch: " + n);
    productionFiles++;
  }
}
assert.ok(productionFiles > 500);
const pkg = json("package.json"),
  lock = json("package-lock.json");
assert.equal(pkg.version, "0.1.0");
assert.equal(lock.version, "0.1.0");
assert.equal(lock.packages[""].version, "0.1.0");

const source = release + "/AirJourney-v0.1-source.zip";
const roots = ["src", "desktop", "scripts", "public", "tests", "docs"];
let files = [
  "README.md",
  "LICENSE",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  ...roots.flatMap(walk),
  "suggestions/v0.0.txt",
  ...evidence,
];
files = [...new Set(files.map((p) => p.replaceAll("\\", "/")))].filter(
  (p) =>
    !p.startsWith("docs/acceptance/evidence/") &&
    !/^docs\/acceptance\/.*\/data\//.test(p),
);
const entries = {};
for (const p of files)
  entries[p] = [
    fs.readFileSync(p),
    { level: /\.(png|jpg|jpeg|ico|airjourney)$/i.test(p) ? 0 : 6 },
  ];
fs.writeFileSync(source, zipSync(entries));
const recovered = unzipSync(fs.readFileSync(source));
let planning = 0,
  docs = 0;
for (const p of files) {
  assert.equal(sha(recovered[p]), fileSha(p), "Source mismatch: " + p);
  if (p.startsWith("docs/planning/")) planning++;
  if (p.startsWith("docs/")) docs++;
}
assert.ok(recovered["docs/planning/13_V0_1_IMPLEMENTATION_PROMPT.md"]);
assert.ok(
  recovered["docs/acceptance/20261010-independent-functional/issues.md"],
);
assert.ok(
  recovered["docs/acceptance/20261010-independent-functional/report.md"],
);
assert.ok(
  files.every(
    (p) =>
      !p.startsWith(".tools/") &&
      !p.includes("/Cache/") &&
      !p.includes("/node_modules/"),
  ),
);
const proof = {
  version: "v0.1",
  status: "PASS",
  sourceFiles: files.length,
  planningFilesMatched: planning,
  allDocumentationFilesMatched: docs,
  productionFilesMatched: productionFiles,
  installedArchiveMatches: true,
  archiveSha256: fileSha(archive),
  sourceSha256: fileSha(source),
  installerSha256: fileSha(installer),
  noRemoteActions: true,
};
fs.writeFileSync(
  release + "/package-verification.json",
  JSON.stringify(proof, null, 2),
);
fs.writeFileSync(
  ev + "/package-verification.json",
  JSON.stringify(proof, null, 2),
);
const artifacts = [installer, source].map((p) => ({
  path: p,
  bytes: fs.statSync(p).size,
  sha256: fileSha(p),
}));
fs.writeFileSync(
  release + "/SHA256SUMS.txt",
  artifacts.map((a) => a.sha256 + "  " + path.basename(a.path)).join("\n") +
    "\n",
);
const manifest = {
  ...json(root + "/delivery_manifest.json"),
  artifacts,
  evidenceSummary: index,
  packageVerification: proof,
  localOnly: true,
  notUploadedToGitHub: true,
};
fs.writeFileSync(
  release + "/delivery_manifest.json",
  JSON.stringify(manifest, null, 2),
);
console.log(
  JSON.stringify(
    {
      artifacts,
      verification: proof,
      performanceProbe: index.performanceProbe,
    },
    null,
    2,
  ),
);
