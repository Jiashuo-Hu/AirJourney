import { useState } from "react";
import type { State, Settings as Prefs, Field } from "./types";
import { defaults } from "./domain";
import { readFile } from "./storage";
export function Settings({
  state,
  path,
  onCommit,
  onBackup,
  onImport,
  onCSV,
  onNotice,
}: {
  state: State;
  path: string;
  onCommit: (s: State) => Promise<boolean>;
  onBackup: () => void;
  onImport: () => void;
  onCSV: () => void;
  onNotice: (s: string) => void;
}) {
  const [tab, setTab] = useState("Appearance"),
    [field, setField] = useState<Field | null>(null),
    [tag, setTag] = useState("");
  const p = state.settings;
  function set<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    onCommit({ ...state, settings: { ...p, [key]: value } });
  }
  const select = (key: keyof Prefs, label: string, options: string[]) => (
    <label>
      {label}
      <select
        value={String(p[key])}
        onChange={(e) => set(key, e.target.value as never)}
      >
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="panel settings">
      <div className="panel-head">
        <div>
          <span className="eyebrow">YOUR PERSONAL SPACE</span>
          <h2>Settings</h2>
        </div>
      </div>
      <div className="tabs">
        {[
          "Appearance",
          "Map",
          "Personal fields",
          "Data & backup",
          "Sources",
        ].map((v) => (
          <button
            className={tab === v ? "active" : ""}
            key={v}
            onClick={() => setTab(v)}
          >
            {v}
          </button>
        ))}
      </div>
      {tab === "Appearance" && (
        <>
          <h3>Appearance</h3>
          {select("theme", "Theme", ["System", "Light", "Dark"])}
          <label>
            Accent color
            <input
              type="color"
              value={p.accent}
              onChange={(e) => set("accent", e.target.value)}
            />
          </label>
          {select("density", "Density", ["Comfortable", "Compact"])}
          {select("units", "Distance unit", ["km", "miles"])}
          {select("dateFormat", "Date format", [
            "DD MMM YYYY",
            "YYYY-MM-DD",
            "MM/DD/YYYY",
          ])}
          {select("clock", "Clock", ["24h", "12h"])}
          <label className="check">
            <input
              type="checkbox"
              checked={p.reducedMotion}
              onChange={(e) => set("reducedMotion", e.target.checked)}
            />
            Reduce motion
          </label>
          <button
            onClick={() =>
              onCommit({
                ...state,
                settings: {
                  ...p,
                  theme: defaults.theme,
                  accent: defaults.accent,
                  density: defaults.density,
                  units: defaults.units,
                  dateFormat: defaults.dateFormat,
                  clock: defaults.clock,
                },
              })
            }
          >
            Reset appearance
          </button>
        </>
      )}
      {tab === "Map" && (
        <>
          <h3>Map style</h3>
          <button
            onClick={async () => {
              try {
                const f = await readFile(".png,.jpg,.jpeg");
                if (!f) return;
                if (f.bytes.length > 25000000)
                  throw Error("Map image exceeds 25 MB.");
                const png = f.bytes[0] === 137 && f.bytes[1] === 80,
                  jpg = f.bytes[0] === 255 && f.bytes[1] === 216;
                if (!png && !jpg)
                  throw Error("Choose a PNG or JPEG equirectangular image.");
                const blob = new Blob([f.bytes as BlobPart], {
                  type: png ? "image/png" : "image/jpeg",
                });
                const image = await createImageBitmap(blob);
                if (
                  image.width > 8192 ||
                  image.height > 4096 ||
                  Math.abs(image.width / image.height - 2) > 0.01
                )
                  throw Error(
                    "Use a 2:1 geographic world image, up to 8192 × 4096.",
                  );
                image.close();
                const reader = new FileReader();
                reader.onload = () =>
                  onCommit({
                    ...state,
                    settings: {
                      ...p,
                      mapImage: String(reader.result),
                      mapSource: f.name,
                    },
                  });
                reader.readAsDataURL(blob);
              } catch (e) {
                onNotice(String(e));
              }
            }}
          >
            Import local world image
          </button>
          <button
            onClick={() =>
              onCommit({
                ...state,
                settings: { ...p, mapImage: undefined, mapSource: undefined },
              })
            }
          >
            Restore bundled imagery
          </button>
          <p className="muted">
            User image: {p.mapSource || "None"} · PNG / JPEG, 2:1 WGS84 world
            extent. Confirm the source and your right to use it. Personal
            imagery is included in backups.
          </p>
          <label>
            Route color
            <input
              type="color"
              value={p.routeColor}
              onChange={(e) => set("routeColor", e.target.value)}
            />
          </label>
          {(
            [
              ["width", "Route width", 1, 6, 0.5],
              ["opacity", "Route opacity", 0.25, 1, 0.05],
              ["markerSize", "Airport marker size", 4, 16, 1],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key}>
              {label} · {p[key]}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={p[key]}
                onChange={(e) => set(key, Number(e.target.value))}
              />
            </label>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={p.labels}
              onChange={(e) => set("labels", e.target.checked)}
            />
            Airport labels
          </label>
          <label className="check">
            <input type="checkbox" checked={p.boundaries} disabled />
            Political boundaries · verified local layer unavailable
          </label>
          <p className="muted">
            The shaded relief layer contains no political borders.
            Mainland-standard boundary data is an unresolved resource item; this
            switch does not imply compliance.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={p.remember}
              onChange={(e) => set("remember", e.target.checked)}
            />
            Remember last view
          </label>
          <div className="two">
            <label>
              Home longitude
              <input
                type="number"
                min="-180"
                max="180"
                value={p.home[0]}
                onChange={(e) =>
                  set("home", [Number(e.target.value), p.home[1], p.home[2]])
                }
              />
            </label>
            <label>
              Home latitude
              <input
                type="number"
                min="-90"
                max="90"
                value={p.home[1]}
                onChange={(e) =>
                  set("home", [p.home[0], Number(e.target.value), p.home[2]])
                }
              />
            </label>
          </div>
          <button
            onClick={() =>
              onCommit({
                ...state,
                settings: {
                  ...p,
                  routeColor: defaults.routeColor,
                  width: defaults.width,
                  opacity: defaults.opacity,
                  markerSize: defaults.markerSize,
                  labels: defaults.labels,
                  home: defaults.home,
                },
              })
            }
          >
            Reset map style
          </button>
          <p className="muted">
            Local Natural Earth II · Regional detail limit · WGS84 ellipsoid.
            Shading is imagery, not mountain geometry.
          </p>
        </>
      )}
      {tab === "Personal fields" && (
        <>
          <h3>Tags</h3>
          <div className="row">
            <input
              aria-label="New tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <button
              onClick={() => {
                if (tag.trim())
                  onCommit({
                    ...state,
                    tags: [...new Set([...state.tags, tag.trim()])],
                  });
                setTag("");
              }}
            >
              Add tag
            </button>
          </div>
          <p>{state.tags.join(" · ") || "No personal tags yet"}</p>
          <h3>Custom fields</h3>
          <button
            onClick={() =>
              setField({
                id: crypto.randomUUID(),
                label: "",
                type: "text",
                options: "",
                hidden: false,
              })
            }
          >
            + Add field
          </button>
          {state.fields.map((v, i) => (
            <div className="reference-row" key={v.id}>
              <button onClick={() => setField({ ...v })}>
                {v.label} · {v.type} {v.hidden ? "· Hidden" : ""}
              </button>
              <button
                disabled={i === 0}
                aria-label={"Move " + v.label + " up"}
                onClick={() => {
                  const fs = [...state.fields];
                  [fs[i - 1], fs[i]] = [fs[i], fs[i - 1]];
                  onCommit({ ...state, fields: fs });
                }}
              >
                ↑
              </button>
              <button
                onClick={() =>
                  onCommit({
                    ...state,
                    fields: state.fields.map((f) =>
                      f.id === v.id ? { ...f, hidden: !f.hidden } : f,
                    ),
                  })
                }
              >
                {v.hidden ? "Restore" : "Hide"}
              </button>
            </div>
          ))}
          {field && (
            <div className="review">
              <label>
                Label
                <input
                  value={field.label}
                  onChange={(e) =>
                    setField({ ...field, label: e.target.value })
                  }
                />
              </label>
              <label>
                Type
                <select
                  value={field.type}
                  onChange={(e) =>
                    setField({
                      ...field,
                      type: e.target.value as Field["type"],
                    })
                  }
                >
                  {["text", "number", "date", "select"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Options (comma separated)
                <input
                  value={field.options}
                  onChange={(e) =>
                    setField({ ...field, options: e.target.value })
                  }
                />
              </label>
              <p className="muted">
                Changing a field type creates a new field and hides the original
                definition. Existing values are preserved.
              </p>
              <button
                className="primary"
                onClick={async () => {
                  if (!field.label.trim()) return;
                  const old = state.fields.find((v) => v.id === field.id),
                    fs = state.fields.map((v) =>
                      v.id === field.id
                        ? v.type === field.type
                          ? field
                          : { ...v, hidden: true }
                        : v,
                    );
                  if (!old || old.type !== field.type)
                    fs.push({ ...field, id: crypto.randomUUID() });
                  if (await onCommit({ ...state, fields: fs })) setField(null);
                }}
              >
                Save field
              </button>
              <button onClick={() => setField(null)}>Cancel</button>
            </div>
          )}
        </>
      )}
      {tab === "Data & backup" && (
        <>
          <h3>Your data stays here.</h3>
          <p>SQLite database</p>
          <code className="path">{path}</code>
          <p className="muted">
            Every save keeps a previous database file. Exports contain your
            Library, snapshots, personal SVG files, tags, fields and settings.
          </p>
          <div className="stack">
            <button className="primary" onClick={onBackup}>
              Export backup
            </button>
            <button onClick={onImport}>Import backup</button>
            <button onClick={onCSV}>Export CSV</button>
          </div>
          <p className="muted">
            Backups use the .airjourney format (ZIP, schema 1), with an
            integrity checksum. Imported SVG data is embedded for portability.
            Import always previews before changing data.
          </p>
        </>
      )}
      {tab === "Sources" && (
        <>
          <h3>AirJourney v0.0</h3>
          <p>
            Personal flight journal · Local only · No account or flight
            verification.
          </p>
          <h4>Bundled resources</h4>
          <ul>
            <li>
              Natural Earth II natural color / shaded relief, version 3.2.0.
              Public domain. 4096×2048 default and 2048×1024 fallback, locally
              resampled from 10800×5400.
            </li>
            <li>CesiumJS 1.133.0 · Apache 2.0</li>
            <li>Inter 5.2.6 package · SIL Open Font License 1.1</li>
            <li>
              Starter airport coordinates: 15-entry OurAirports static snapshot
              (2026-10-10), no accuracy guarantee; editable. Regions use local
              display rules.
            </li>
            <li>
              Airlines, alliances and aircraft: small manually curated
              suggestions, no historical membership verification.
            </li>
            <li>
              Moment Timezone 0.6.0 · bundled IANA rules, UTC offsets may be
              specified explicitly.
            </li>
            <li>GeographicLib WGS84 geodesics · MIT</li>
            <li>
              Brand SVG files: see actual resource manifest. Missing logos use a
              text placeholder.
            </li>
          </ul>
          <h4>Known resource limits</h4>
          <p>
            Verified mainland-standard political boundaries and country labels
            are not supplied. No street, airport runway or elevation mesh data.
            Brand marks are trademarks of their respective owners.
          </p>
          <p className="muted">
            Full provenance, hashes and limitations are included in
            docs/implementation with the delivery.
          </p>
        </>
      )}
    </div>
  );
}
