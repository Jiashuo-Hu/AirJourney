import { cpSync, mkdirSync } from "node:fs";
mkdirSync("dist/cesium", { recursive: true });
for (const dir of ["Workers", "Assets", "Widgets", "ThirdParty"])
  cpSync(`node_modules/cesium/Build/Cesium/${dir}`, `dist/cesium/${dir}`, {
    recursive: true,
  });
