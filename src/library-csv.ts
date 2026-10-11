import type { Reference } from "./types";
import { csvCell } from "./domain";
const keys = [
  "id",
  "name",
  "code",
  "city",
  "region",
  "lat",
  "lon",
  "zone",
  "aliases",
  "alliance",
  "manufacturer",
  "family",
  "hidden",
] as const;
export function referenceCSV(entries: Reference[]) {
  return [
    keys.map(csvCell).join(","),
    ...entries.map((r) => keys.map((k) => csvCell(r[k])).join(",")),
  ].join("\r\n");
}
export function parseReferenceCSV(text: string): Reference[] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw Error("Unclosed CSV quote.");
  row.push(field);
  if (row.some((v) => v !== "")) rows.push(row);
  const header = rows.shift()?.map((v) => v.replace(/^\uFEFF/, "").trim());
  if (!header?.includes("name") || header.some((v) => !keys.includes(v as any)))
    throw Error(
      "CSV requires a name column. Supported columns: " + keys.join(", "),
    );
  return rows.map((cols) => {
    if (cols.length !== header.length)
      throw Error("CSV row / header mismatch.");
    const r: any = { id: crypto.randomUUID(), source: "User imported" };
    header.forEach((key, i) => {
      const value = cols[i];
      if (value === "") return;
      if (key === "lat" || key === "lon") {
        r[key] = Number(value);
        if (!Number.isFinite(r[key])) throw Error("Invalid CSV coordinate.");
      } else if (key === "hidden") r[key] = value === "true";
      else r[key] = value.replace(/^'(?=[=+\-@])/, "");
    });
    return r;
  });
}
