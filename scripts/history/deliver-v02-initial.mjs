// Historical initial-stage generator; not applicable to the current runtime.
// Local delivery only: no network, Git, release, or upload operations.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { zipSync, unzipSync } from "fflate";
import asar from "@electron/asar";
await import("../manifest-v02.mjs");
const root = "docs/implementation/v0.2",
  rel = "release/v0.2",
  ev = "evidence/v0.2";
const json = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const hash = (p) => sha(fs.readFileSync(p));
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .filter((e) => e.name !== "__pycache__")
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(d, e.name))
        : [path.join(d, e.name).replaceAll("\\", "/")],
    );
const cell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
const csv = (p, headers, rows) =>
  fs.writeFileSync(
    p,
    [headers, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n",
  );
const reports = [
  ["LEGACY", ev + "/installed-smoke/smoke-results.json", 16],
  ["V02", ev + "/installed-regression-final4/results.json", 18],
  ["UPGRADE-DISPLAY", ev + "/upgrade-display/results.json", 10],
];
for (const [, p, count] of reports) {
  const r = json(p);
  assert.equal(r.results.length, count);
  assert.ok(r.results.every((x) => x.status === "PASS"));
  if (r.errors) assert.equal(r.errors.length, 0);
}
assert.match(fs.readFileSync(ev + "/unit-tests-final.log", "utf8"), /pass 28/);
assert.match(
  fs.readFileSync(ev + "/resource-tests.log", "utf8"),
  /Ran 5 tests/,
);
assert.match(fs.readFileSync(ev + "/resource-tests.log", "utf8"), /OK/);
const installer = rel + "/AirJourney-v0.2-x64-setup.exe",
  source = rel + "/AirJourney-v0.2-source.zip";
const installation = json(ev + "/install-final.json");
assert.equal(installation.exitCode, 0);
assert.equal(installation.installerSha256, hash(installer));
const meta = json("public/data/airports-global-manifest.json");
assert.equal(meta.resourceSha256, hash("public/data/airports-global.json"));
const archive = rel + "/win-unpacked/resources/app.asar";
assert.equal(hash(archive), hash(ev + "/installed-app/resources/app.asar"));
const readMember = (n) => asar.extractFile(archive, path.normalize(n));
assert.equal(
  JSON.parse(readMember("package.json").toString()).version,
  "0.2.0",
);
let production = 0;
for (const n of asar
  .listPackage(archive)
  .map((p) => p.replaceAll("\\", "/").replace(/^\//, ""))) {
  if (
    (n.startsWith("dist/") || n.startsWith("desktop/")) &&
    fs.existsSync(n) &&
    fs.statSync(n).isFile()
  ) {
    assert.equal(sha(readMember(n)), hash(n), "ASAR mismatch " + n);
    production++;
  }
}
assert.ok(production > 600);
assert.equal(
  sha(readMember("dist/data/airports-global.json")),
  meta.resourceSha256,
);
for (const pkg of [
  json("package.json"),
  json("package-lock.json"),
  json("package-lock.json").packages[""],
])
  assert.equal(pkg.version, "0.2.0");
const screenshots = root + "/screenshots";
fs.mkdirSync(screenshots, { recursive: true });
for (const [dir, names] of [
  [
    ev + "/installed-regression-final4",
    [
      "01-empty-light.png",
      "02-exact-route.png",
      "02b-new-global-route.png",
      "03-approximate-route.png",
      "04-settings-dark.png",
      "05-restart-dark.png",
      "06-static-before.png",
      "07-static-after-clock.png",
    ],
  ],
  [
    ev + "/upgrade-display",
    [
      "display-100.png",
      "display-150.png",
      "display-200.png",
      "display-300.png",
    ],
  ],
])
  for (const n of names) fs.copyFileSync(dir + "/" + n, screenshots + "/" + n);
const evidence = [
  ev + "/unit-tests-final.log",
  ev + "/resource-tests.log",
  ev + "/build-final.log",
  ev + "/package-final.log",
  ev + "/install-final.json",
  ev + "/search-benchmark.json",
  ...reports.map((r) => r[1]),
];
const index = {
  version: "v0.2",
  packageVersion: "0.2.0",
  date: "2026-10-14",
  localOnly: true,
  noGitHubActions: true,
  unitTests: 28,
  resourceTests: 5,
  installedLegacyScenarios: 16,
  installedV02Scenarios: 18,
  legacyAndSoftwareScaleScenarios: 10,
  independentV02Acceptance: "NOT RUN",
  physicalTouchpadTested: false,
  windowsSystemDpiChanged: false,
  sourceCoverage: {
    records: meta.records,
    countryOrRegionCodes: meta.countriesWithRecords,
    sourceCoordinateRecords: meta.locationCounts.airport,
    approximateRecords: meta.locationCounts.approximate || 0,
    unlocatedRecords: meta.locationCounts.unlocated || 0,
    missingCity: meta.missingCity,
    missingIata: meta.missingIata,
    missingIcao: meta.missingIcao,
  },
  searchBenchmark: json(ev + "/search-benchmark.json"),
  evidence: evidence.map((p) => ({
    path: p,
    bytes: fs.statSync(p).size,
    sha256: hash(p),
  })),
  fixtures: walk("tests/fixtures")
    .filter((p) => /\.(sqlite|airjourney)$/.test(p))
    .map((p) => ({ path: p, sha256: hash(p), synthetic: true })),
  visualReview: {
    normalStaticClockScenario: "PASS screenshot review",
    screenshots: screenshots,
    fullGpuMatrix: "NOT RUN",
  },
};
fs.writeFileSync(root + "/evidence_index.json", JSON.stringify(index, null, 2));
const results = [
  ["UNIT", "28 assertions", "PASS", ev + "/unit-tests-final.log"],
  ["RESOURCES", "5 fallback-policy cases", "PASS", ev + "/resource-tests.log"],
];
for (const [prefix, p] of reports)
  json(p).results.forEach((r, i) =>
    results.push([prefix + "-" + (i + 1), r.name || r.test, r.status, p]),
  );
for (const scope of [
  "REAL TOUCHPAD",
  "REAL WINDOWS DPI / ASSISTIVE TECHNOLOGY",
  "CLEAN VM / COMPLETE INSTALL-UNINSTALL",
  "TARGET / LONG PERFORMANCE",
  "INDEPENDENT V02 ACCEPTANCE",
])
  results.push([scope, scope, "NOT RUN", root + "/known_issues.md"]);
csv(
  root + "/self_test_results.csv",
  ["test_id", "scope", "status", "evidence"],
  results,
);
const targets = {
  "FR-01": "Compact flight editor / searchable local airports",
  "FR-02": "Filtering and bidirectional selection regression",
  "FR-03":
    "Global airport catalogue / personal overrides / coordinate provenance",
  "FR-05": "Tags and fields retained in collapsed More details",
  "FR-09": "Quiet globe / local static resources",
  "FR-10": "Airport / approximate / unlocated snapshot rendering",
  "FR-11": "Approximate marker and label",
  "FR-15": "Folded settings / map menu preserves controls",
  "FR-16": "Legacy state unchanged / personal persistence",
  "FR-17": "Actual backup round trip / old backup compatibility",
  "NFR-04": "Full-index performance only; complete target metrics NOT RUN",
  "NFR-05": "Software display scales only; real system DPI NOT RUN",
  "NFR-08": "Source / resource / runtime delivery consistency",
};
const ids = [
  ...new Set(
    [
      ...fs
        .readFileSync(
          "docs/planning/templates/requirements_traceability.csv",
          "utf8",
        )
        .matchAll(/\b(?:FR|BR|NFR)-\d{2}\b/g),
    ].map((m) => m[0]),
  ),
];
const trace = ids.map((id) => [
  id,
  targets[id] || "Existing behavior retained",
  targets[id]
    ? "IMPLEMENTED / SELECTED SELFTEST"
    : "RETAINED / FULL MATRIX NOT RUN",
  root + "/test_report.md",
  "Not full independent acceptance",
]);
for (const [id, scope, e] of [
  [
    "V02-DATA",
    "Global coverage, deduplication, code/city/country search and personal priority",
    "public/data/airports-global-manifest.json",
  ],
  [
    "V02-LOCATION",
    "Source coordinates, explicit city fallback, unlocated and map markers",
    ev + "/installed-regression-final4/results.json",
  ],
  [
    "V02-UI",
    "Quiet layout / reachable folded options / complete existing functionality regression",
    ev + "/installed-smoke/smoke-results.json",
  ],
  [
    "V02-UPGRADE",
    "v0.0/v0.1 state and backups",
    ev + "/upgrade-display/results.json",
  ],
  [
    "V02-DELIVERY",
    "v0.2 / 0.2.0 / no GitHub actions",
    rel + "/package-verification.json",
  ],
])
  trace.push([
    id,
    scope,
    "SELFTEST PASS",
    e,
    "Independent v0.2 acceptance pending",
  ]);
csv(
  root + "/requirements_traceability.csv",
  ["requirement_id", "scope", "status", "evidence", "limitations"],
  trace,
);
let files = [
  "README.md",
  "LICENSE",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  ...[
    "src",
    "desktop",
    "scripts",
    "public",
    "tests",
    "docs",
    "suggestions",
  ].flatMap(walk),
  ...evidence,
];
files = [...new Set(files)].filter(
  (p) =>
    !p.startsWith("docs/acceptance/evidence/") &&
    !/^docs\/acceptance\/.*\/data\//.test(p) &&
    !p.endsWith(".pyc"),
);
const entries = {};
for (const p of files)
  entries[p] = [
    fs.readFileSync(p),
    { level: /\.(png|jpg|jpeg|ico|airjourney)$/i.test(p) ? 0 : 6 },
  ];
fs.writeFileSync(source, zipSync(entries));
const recovered = unzipSync(fs.readFileSync(source));
for (const p of files)
  assert.equal(sha(recovered[p]), hash(p), "Source mismatch " + p);
for (const p of [
  "docs/planning/15_V0_2_SCOPE.md",
  "docs/planning/14_V0_1_ACCEPTANCE_PROMPT.md",
  "docs/acceptance/20261011-v01-independent/issues.md",
  "public/data/airports-global.json",
  "src/AirportPicker.tsx",
])
  assert.ok(recovered[p]);
assert.ok(
  files.every(
    (p) =>
      !p.startsWith(".tools/") &&
      !p.includes("/node_modules/") &&
      !p.includes("/Cache/"),
  ),
);
const proof = {
  version: "v0.2",
  packageVersion: "0.2.0",
  status: "PASS",
  date: "2026-10-14",
  localOnly: true,
  noGitHubActions: true,
  sourceFiles: files.length,
  allDocumentationFilesMatched: files.filter((p) => p.startsWith("docs/"))
    .length,
  planningFilesMatched: files.filter((p) => p.startsWith("docs/planning/"))
    .length,
  productionFilesMatched: production,
  installedArchiveMatches: true,
  archiveSha256: hash(archive),
  globalAirportResourceSha256: meta.resourceSha256,
  sourceSha256: hash(source),
  installerSha256: hash(installer),
};
fs.writeFileSync(
  rel + "/package-verification.json",
  JSON.stringify(proof, null, 2),
);
fs.writeFileSync(
  ev + "/package-verification.json",
  JSON.stringify(proof, null, 2),
);
const artifacts = [installer, source].map((p) => ({
  path: p,
  bytes: fs.statSync(p).size,
  sha256: hash(p),
}));
fs.writeFileSync(
  rel + "/SHA256SUMS.txt",
  artifacts.map((a) => a.sha256 + "  " + path.basename(a.path)).join("\n") +
    "\n",
);
fs.writeFileSync(
  rel + "/delivery_manifest.json",
  JSON.stringify(
    {
      ...json(root + "/delivery_manifest.json"),
      artifacts,
      evidenceSummary: index,
      packageVerification: proof,
      airportCoverage: meta,
      localOnly: true,
      notUploadedToGitHub: true,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    { artifacts, verification: proof, sourceCoverage: index.sourceCoverage },
    null,
    2,
  ),
);
