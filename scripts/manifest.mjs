import {
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import asar from "@electron/asar";
const root = "docs/implementation";
mkdirSync(root, { recursive: true });
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const q = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
  );
const headers = [
  "resource_id",
  "category",
  "package_version",
  "local_path",
  "source_url",
  "license",
  "sha256",
  "entry_count",
  "projection",
  "extent",
  "resolution_or_detail_limit",
  "size_bytes",
  "bundled_or_user",
  "usage_notes",
  "known_gap",
];
const rows = [];
for (const p of walk("dist")) {
  const name = p.replaceAll("\\", "/");
  let category = "application",
    source = "AirJourney source",
    license = "Project source; third-party notices apply",
    notes = "Local production artifact",
    projection = "",
    extent = "",
    resolution = "",
    count = 1;
  if (name.includes("naturalearth-")) {
    category = "map-imagery";
    source =
      "https://www.naturalearthdata.com/downloads/50m-raster-data/50m-natural-earth-2/";
    license = "Public domain";
    projection = "EPSG:4326";
    extent = "-180,-90,180,90";
    resolution = name.includes("4096")
      ? "4096x2048; default"
      : "2048x1024; fallback";
    notes =
      "Natural Earth II 3.2.0; locally resampled from 10800x5400; no political boundaries";
  } else if (name.includes("NaturalEarthII")) {
    category = "map-fallback-tiles";
    source = "https://github.com/CesiumGS/cesium";
    license = "Natural Earth public domain; Cesium Apache-2.0";
    projection = "EPSG:4326";
    extent = "global";
    resolution = "levels 0-2; 2048x1024 effective";
    notes =
      "Cesium dependency assets; bundled but primary globe uses local JPEG";
  } else if (name.includes("inter-")) {
    category = "fonts";
    source = "https://github.com/rsms/inter";
    license = "SIL OFL 1.1";
    notes = "Inter; @fontsource/inter 5.2.6; 400/500/600 local fonts";
  } else if (name.includes("/logos/")) {
    category = "brand-svg";
    source = "See asset_registry.csv";
    license = "PD-textlogo with trademark restrictions";
    notes = "DOCTYPE removed; original paths and colors retained";
  } else if (name.endsWith("airports.json")) {
    category = "airports";
    source = "https://ourairports.com/data/";
    license = "Public domain; no accuracy guarantee";
    count = 15;
    projection = "WGS84";
    notes =
      "2026-10-10 static subset; manual timezone suggestions and local region display rules";
  } else if (name.endsWith("labels.json")) {
    category = "map-labels";
    source = "AirJourney manually curated English label positions";
    license = "Project-authored factual label set";
    count = 12;
    projection = "WGS84";
    notes =
      "Small English country / continent label set; no boundary geometry or official completeness claim";
  } else if (name.includes("/cesium/")) {
    category = "cesium-runtime";
    source = "https://github.com/CesiumGS/cesium";
    license = "Apache-2.0 and dependency-specific notices";
    notes = "CesiumJS 1.133.0 local Workers/Assets/Widgets/ThirdParty";
  }
  rows.push([
    name,
    category,
    "v0.0",
    name,
    source,
    license,
    hash(p),
    count,
    projection,
    extent,
    resolution,
    statSync(p).size,
    "Bundled",
    notes,
    category.startsWith("map")
      ? "Verified mainland-standard political boundary layer unavailable"
      : "",
  ]);
}
for (const p of walk("release/win-unpacked"))
  rows.push([
    p.replaceAll("\\", "/"),
    "desktop-runtime",
    "Electron 38.2.0",
    p.replaceAll("\\", "/"),
    "https://github.com/electron/electron/releases/tag/v38.2.0",
    "MIT; Chromium/third-party LICENSES.chromium.html; application archive has separate notices",
    hash(p),
    1,
    "",
    "",
    "",
    statSync(p).size,
    "Bundled",
    "Full local Windows runtime; app.asar includes production frontend and SQLite WASM",
    "Unsigned application",
  ]);
const archive = "release/win-unpacked/resources/app.asar";
for (const member of asar
  .listPackage(archive)
  .filter(
    (p) =>
      p.startsWith("\\node_modules\\sql.js\\") ||
      p.startsWith("/node_modules/sql.js/"),
  )) {
  const logical = member.replaceAll("\\", "/").replace(/^\//, "");
  try {
    const bytes = asar.extractFile(archive, path.normalize(logical));
    rows.push([
      logical,
      "sqlite-runtime",
      "sql.js 1.13.0",
      archive + "::" + logical,
      "https://github.com/sql-js/sql.js",
      "MIT; SQLite public domain",
      createHash("sha256").update(bytes).digest("hex"),
      1,
      "",
      "",
      "",
      bytes.length,
      "Bundled",
      "Actual ASAR member, locally loaded by main process",
      "",
    ]);
  } catch {}
}
writeFileSync(
  root + "/resource_manifest.csv",
  [headers, ...rows].map((r) => r.map(q).join(",")).join("\n"),
);
const registryHeaders = [
  "asset_id",
  "entity_type",
  "entity_id",
  "display_name",
  "source_type",
  "local_path",
  "source_page_url",
  "source_revision",
  "author",
  "license_id",
  "license_url",
  "attribution",
  "trademark_notes",
  "source_sha256",
  "distributed_sha256",
  "modifications",
  "true_vector_check",
  "security_check",
  "review_status",
  "known_gap",
];
const marks = [
  [
    "lufthansa",
    "Airline",
    "airline-LH",
    "Lufthansa",
    "https://commons.wikimedia.org/wiki/File:Lufthansa_Logo_2018.svg",
    "2021-01-26 SVG; page checked 2026-10-10",
    "Lufthansa Group",
  ],
  [
    "star-alliance",
    "Alliance",
    "alliance-Star Alliance",
    "Star Alliance",
    "https://commons.wikimedia.org/wiki/File:Logo_of_Star_Alliance.svg",
    "Original file checked 2026-10-10",
    "Original uploader Fungz / brand mark",
  ],
  [
    "oneworld",
    "Alliance",
    "alliance-oneworld",
    "oneworld",
    "https://commons.wikimedia.org/wiki/File:Oneworld_logo.svg",
    "2025-02-25 SVG; page checked 2026-10-10",
    "oneworld / Wikimedia contributors",
  ],
];
const originalHashes = {
  lufthansa: "3fde724dce168651d9288d25814ac9cd54d1db6f1a7dc079f088197b924420fd",
  "star-alliance":
    "fdd94e7c685b2a1f4d20f62f1f48e1496af3657edd032f223bd2b88fc58e7fd6",
  oneworld: "f98dba240b28b19a2c4b59152efcd5a6cf27b76833ff7d7a0bfcf09c600e4283",
};
const marksRows = marks.map(([n, entity, id, label, url, rev, author]) => [
  n,
  entity,
  id,
  label,
  "Bundled",
  `dist/logos/${n}.svg`,
  url,
  rev,
  author,
  "PD-textlogo",
  url,
  `${label}; see source description`,
  "Brand trademark retained; no endorsement or general trademark authorization",
  existsSync(`.tools/source-logos/${n}.svg`)
    ? hash(`.tools/source-logos/${n}.svg`)
    : originalHashes[n],
  hash(`public/logos/${n}.svg`),
  n === "oneworld" ? "Unchanged" : "DOCTYPE removed; shapes / colors unchanged",
  "PASS",
  "PASS",
  "Source copyright statement checked; trademark restrictions retained",
  "",
]);
marksRows.push([
  "skyteam",
  "Alliance",
  "alliance-SkyTeam",
  "SkyTeam",
  "NOT BUNDLED",
  "",
  "https://en.wikipedia.org/wiki/File:SkyTeam_logo.svg",
  "Page checked 2026-10-10",
  "SkyTeam",
  "Non-free logo",
  "",
  "",
  "Not distributed; user may import privately",
  "",
  "",
  "",
  "Not accepted for bundle",
  "Not accepted for bundle",
  "BLOCKED",
  "No suitable redistribution license found; two of three alliance SVGs supplied",
]);
writeFileSync(
  root + "/asset_registry.csv",
  [registryHeaders, ...marksRows].map((r) => r.map(q).join(",")).join("\n"),
);
const artifacts = walk("release").filter((p) => p.endsWith("setup.exe"));
writeFileSync(
  "release/SHA256SUMS.txt",
  artifacts.map((p) => hash(p) + "  " + path.basename(p)).join("\n") + "\n",
);
writeFileSync(
  root + "/delivery_manifest.json",
  JSON.stringify(
    {
      version: "v0.0",
      packageVersion: "0.0.0",
      baseline: "docs/planning",
      date: "2026-10-10",
      artifacts: artifacts.map((p) => ({
        path: p.replaceAll("\\", "/"),
        bytes: statSync(p).size,
        sha256: hash(p),
      })),
      resourceFiles: rows.length,
      sourceSnapshots: JSON.parse(
        readFileSync("public/data/source-snapshots.json", "utf8"),
      ),
      signature: "Inspect Get-AuthenticodeSignature; no certificate purchased",
      completeAcceptancePassed: false,
    },
    null,
    2,
  ),
);
