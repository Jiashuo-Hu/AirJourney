import {
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import path from "node:path";
const root = ".tools/desktop-app";
// Only this fixed generated staging directory is replaced, never the checkout or user data.
const resolvedStage = path.resolve(root),
  intendedParent = path.resolve(".tools");
if (
  path.dirname(resolvedStage) !== intendedParent ||
  path.basename(resolvedStage) !== "desktop-app"
)
  throw Error("Unexpected staging path");
rmSync(resolvedStage, { recursive: true, force: true });
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
    version: JSON.parse(readFileSync("package.json", "utf8")).version,
    description: "Local personal flight journal",
    author: "AirJourney",
    main: "desktop/main.cjs",
    dependencies: { "sql.js": "1.13.0" },
  }),
);
