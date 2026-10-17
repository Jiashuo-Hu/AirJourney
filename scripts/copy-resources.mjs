import { cpSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
mkdirSync("dist/cesium", { recursive: true });
for (const dir of ["Workers", "Assets", "Widgets", "ThirdParty"])
  cpSync(`node_modules/cesium/Build/Cesium/${dir}`, `dist/cesium/${dir}`, {
    recursive: true,
  });
// Lossless local compression. Every catalogue byte and all original source files
// remain available; this changes transport/storage only, never catalogue records.
const catalog = readFileSync("public/data/airports-global.json");
const packed = gzipSync(catalog, { level: 9 });
assert.deepEqual(gunzipSync(packed), catalog);
writeFileSync("dist/data/airports-global.json.gz", packed);
unlinkSync("dist/data/airports-global.json");
console.log(`Airport catalogue: ${catalog.length} → ${packed.length} bytes (lossless)`);
