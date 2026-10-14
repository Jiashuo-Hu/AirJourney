import { APP_VERSION } from "./version";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { validateState } from "./domain";
import type { State } from "./types";
declare global {
  interface Window {
    airjourney?: {
      testing?: boolean;
      load: () => Promise<State | null>;
      save: (s: string) => Promise<boolean>;
      dataPath: () => Promise<string>;
      exportFile: (n: string, b: number[]) => Promise<boolean>;
      importFile: () => Promise<{ name: string; bytes: number[] } | null>;
    };
  }
}
export async function load() {
  return window.airjourney
    ? window.airjourney.load()
    : JSON.parse(localStorage.getItem("airjourney") || "null");
}
export async function save(s: State) {
  validateState(s);
  if (window.airjourney) await window.airjourney.save(JSON.stringify(s));
  else localStorage.setItem("airjourney", JSON.stringify(s));
}
export async function exportFile(name: string, bytes: Uint8Array) {
  if (window.airjourney)
    return window.airjourney.exportFile(name, Array.from(bytes));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes as BlobPart]));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}
export async function readFile(accept: string) {
  if (window.airjourney) {
    const f = await window.airjourney.importFile();
    return f ? { name: f.name, bytes: new Uint8Array(f.bytes) } : null;
  }
  return new Promise<{ name: string; bytes: Uint8Array } | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(
        f
          ? { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }
          : null,
      );
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
export async function backup(s: State) {
  const data = strToU8(JSON.stringify(s)),
    hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", data as BufferSource),
      ),
    )
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  return zipSync({
    "manifest.json": strToU8(
      JSON.stringify({
        format: "airjourney",
        version: 1,
        app: APP_VERSION,
        base: "ourairports-20261014",
        sha256: hash,
      }),
    ),
    "data.json": data,
  });
}
export async function parseBackup(bytes: Uint8Array) {
  if (bytes.length > 50 * 1024 * 1024) throw Error("Backup exceeds 50 MB.");
  let size = 0,
    count = 0;
  const files = unzipSync(bytes, {
    filter: (f) => {
      if (
        ++count > 20 ||
        !/^(manifest|data)\.json$/.test(f.name) ||
        (size += f.originalSize) > 100 * 1024 * 1024
      )
        throw Error("Invalid path, file count or expanded size.");
      return true;
    },
  });
  if (!files["manifest.json"] || !files["data.json"])
    throw Error("Incomplete backup.");
  const m = JSON.parse(strFromU8(files["manifest.json"]));
  if (m.format !== "airjourney" || m.version !== 1)
    throw Error("Unsupported backup version.");
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", files["data.json"] as BufferSource),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  if (hash !== m.sha256) throw Error("Backup checksum mismatch.");
  return validateState(JSON.parse(strFromU8(files["data.json"])));
}
