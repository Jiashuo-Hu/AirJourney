import { mkdirSync, cpSync, writeFileSync } from "node:fs";
const root = ".tools/desktop-app";
mkdirSync(root, { recursive: true });
for (const folder of ["dist", "desktop"])
  cpSync(folder, `${root}/${folder}`, { recursive: true });
mkdirSync(`${root}/node_modules`, { recursive: true });
cpSync("node_modules/sql.js", `${root}/node_modules/sql.js`, {
  recursive: true,
});
writeFileSync(
  `${root}/package.json`,
  JSON.stringify({
    name: "airjourney",
    version: "0.0.0",
    description: "Local personal flight journal",
    author: "AirJourney",
    main: "desktop/main.cjs",
    dependencies: { "sql.js": "1.13.0" },
  }),
);
