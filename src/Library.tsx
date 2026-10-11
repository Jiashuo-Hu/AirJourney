import { useState } from "react";
import type { Reference, State } from "./types";
import {
  hasLocation,
  safeSvg,
  referenceUsedBy,
  applyReference,
} from "./domain";
import { seedLibrary } from "./seed";
import { readFile, exportFile } from "./storage";
import { parseReferenceCSV, referenceCSV } from "./library-csv";
import type { StateMutation } from "./state-updates";
export function Library({
  state,
  onCommit,
  onNotice,
  onPick,
}: {
  state: State;
  onCommit: (change: StateMutation) => Promise<boolean>;
  onNotice: (s: string) => void;
  onPick: (callback: (lat: number, lon: number) => void) => void;
}) {
  const [kind, setKind] = useState("Airports"),
    [query, setQuery] = useState(""),
    [showHidden, setShowHidden] = useState(false),
    [edit, setEdit] = useState<Reference | null>(null),
    [review, setReview] = useState(false),
    [incoming, setIncoming] = useState<{
      kind: string;
      entries: Reference[];
    } | null>(null),
    [replace, setReplace] = useState(false);
  const used = edit
    ? state.flights.filter((f) =>
        referenceUsedBy(
          f,
          kind,
          state.library[kind].find((r) => r.id === edit.id) || edit,
        ),
      )
    : [];
  const patch = (p: Partial<Reference>) =>
    setEdit((v) => (v ? { ...v, ...p } : null));
  async function store(apply = false) {
    if (!edit?.name.trim()) {
      onNotice("A name is required.");
      return;
    }
    if (
      (edit.lat !== undefined || edit.lon !== undefined) &&
      !hasLocation(edit)
    ) {
      onNotice("Enter a valid complete WGS84 coordinate pair, or clear both.");
      return;
    }
    const e = {
      ...edit,
      source:
        edit.source === "Bundled" ? "User edited" : edit.source || "Custom",
    };
    const target = kind;
    if (
      await onCommit((s) => {
        const previous = s.library[target].find((r) => r.id === e.id) || e;
        const idx = s.library[kind].findIndex((r) => r.id === e.id);
        if (idx < 0) s.library[kind].push(e);
        else s.library[kind][idx] = e;
        if (apply)
          s.flights = s.flights.map((f) =>
            applyReference(f, kind, previous, e),
          );
        return s;
      })
    ) {
      setEdit(null);
      setReview(false);
      onNotice(
        apply
          ? "Library saved and selected snapshots updated. Manual place, distance, time and alliance overrides preserved."
          : "Library saved. Existing flight snapshots unchanged.",
      );
    }
  }
  async function logo() {
    try {
      const f = await readFile(".svg");
      if (f) patch({ logo: safeSvg(new TextDecoder().decode(f.bytes)) });
    } catch (e) {
      onNotice(String(e));
    }
  }
  async function importData() {
    try {
      const f = await readFile(".json,.csv");
      if (!f) return;
      const text = new TextDecoder().decode(f.bytes);
      const data = text.trim().startsWith("{")
        ? JSON.parse(text)
        : { kind, entries: parseReferenceCSV(text) };
      if (
        data.kind !== kind ||
        !Array.isArray(data.entries) ||
        data.entries.length > 20000
      )
        throw Error(
          "Choose matching Library JSON or CSV with supported column headers.",
        );
      const ids = new Set();
      for (const r of data.entries) {
        if (
          typeof r.id !== "string" ||
          typeof r.name !== "string" ||
          ids.has(r.id)
        )
          throw Error("Invalid reference or duplicate ID.");
        ids.add(r.id);
        if ((r.lat !== undefined || r.lon !== undefined) && !hasLocation(r))
          throw Error("Invalid coordinates.");
        if (r.logo) {
          if (!r.logo.startsWith("data:image/svg+xml;base64,"))
            throw Error("Invalid SVG.");
          safeSvg(decodeURIComponent(escape(atob(r.logo.split(",")[1]))));
        }
      }
      setIncoming({ kind, entries: data.entries });
      setReplace(false);
    } catch (e) {
      onNotice(String(e));
    }
  }
  return (
    <div className="panel library">
      <div className="panel-head">
        <div>
          <span className="eyebrow">MAKE IT YOURS</span>
          <h2>Library</h2>
        </div>
        <button
          className="primary"
          onClick={() => {
            setEdit({ id: crypto.randomUUID(), name: "", source: "Custom" });
            setReview(false);
          }}
        >
          + Add new
        </button>
      </div>
      <div className="tabs">
        {Object.keys(state.library).map((k) => (
          <button
            className={kind === k ? "active" : ""}
            key={k}
            onClick={() => {
              setKind(k);
              setEdit(null);
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="search-box">
        <span>⌕</span>
        <input
          placeholder={`Search ${kind.toLowerCase()}`}
          aria-label="Search Library"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="row">
        <button onClick={importData}>Import</button>
        <button
          onClick={() =>
            exportFile(
              `airjourney-${kind.toLowerCase()}.json`,
              new TextEncoder().encode(
                JSON.stringify({ kind, entries: state.library[kind] }, null, 2),
              ),
            )
          }
        >
          Export
        </button>
        <button
          onClick={() =>
            exportFile(
              `airjourney-${kind.toLowerCase()}.csv`,
              new TextEncoder().encode(referenceCSV(state.library[kind])),
            )
          }
        >
          CSV
        </button>
        <label className="check">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          Show hidden
        </label>
      </div>
      {edit ? (
        <div className="library-edit">
          <h3>{edit.name || `New ${kind.slice(0, -1)}`}</h3>
          <p className="muted">
            {edit.source} · Used by {used.length} flights
          </p>
          <label>
            Name
            <input
              value={edit.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <label>
            Aliases
            <input
              value={edit.aliases || ""}
              onChange={(e) => patch({ aliases: e.target.value })}
            />
          </label>
          <label>
            Code (optional)
            <input
              value={edit.code || ""}
              onChange={(e) => patch({ code: e.target.value })}
            />
          </label>
          {kind === "Airports" && (
            <>
              <div className="two">
                <label>
                  City
                  <input
                    value={edit.city || ""}
                    onChange={(e) => patch({ city: e.target.value })}
                  />
                </label>
                <label>
                  Region display name
                  <input
                    value={edit.region || ""}
                    onChange={(e) => patch({ region: e.target.value })}
                  />
                </label>
              </div>
              <div className="two">
                <label>
                  Latitude
                  <input
                    type="number"
                    step="any"
                    value={edit.lat ?? ""}
                    onChange={(e) =>
                      patch({
                        lat:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    step="any"
                    value={edit.lon ?? ""}
                    onChange={(e) =>
                      patch({
                        lon:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <div className="row">
                <button
                  onClick={() => onPick((lat, lon) => patch({ lat, lon }))}
                >
                  Pick on globe
                </button>
                <button
                  onClick={() => patch({ lat: undefined, lon: undefined })}
                >
                  Clear location
                </button>
              </div>
              <label>
                Time zone / offset
                <input
                  value={edit.zone || ""}
                  onChange={(e) => patch({ zone: e.target.value })}
                />
              </label>
            </>
          )}
          {kind === "Airlines" && (
            <label>
              Alliance suggestion
              <select
                value={edit.alliance || "Unknown"}
                onChange={(e) => patch({ alliance: e.target.value })}
              >
                <option>Unknown</option>
                <option>None</option>
                {state.library.Alliances.map((r) => (
                  <option key={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
          )}
          {["Airlines", "Alliances"].includes(kind) && (
            <>
              <div className="logo-preview">
                {edit.logo ? (
                  <img src={edit.logo} alt={edit.name + " logo"} />
                ) : (
                  <span>Logo not added</span>
                )}
              </div>
              <div className="row">
                <button onClick={logo}>Choose SVG</button>
                <button onClick={() => patch({ logo: undefined })}>
                  Remove logo
                </button>
              </div>
              <small>
                User supplied SVG: confirm you have the right to use this file.
              </small>
            </>
          )}
          {kind === "Aircraft" && (
            <>
              <label>
                Manufacturer
                <input
                  value={edit.manufacturer || ""}
                  onChange={(e) => patch({ manufacturer: e.target.value })}
                />
              </label>
              <label>
                Family
                <input
                  value={edit.family || ""}
                  onChange={(e) => patch({ family: e.target.value })}
                />
              </label>
            </>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={edit.hidden || false}
              onChange={(e) => patch({ hidden: e.target.checked })}
            />
            Hide from choices (preserves history)
          </label>
          <div className="stack">
            <button className="primary" onClick={() => store()}>
              Apply to future selections
            </button>
            <button onClick={() => setReview(true)} disabled={!used.length}>
              Review changes to existing flights
            </button>
            <button
              onClick={() => {
                const base = seedLibrary[kind].find((r) => r.id === edit.id);
                if (base) setEdit(structuredClone(base));
                else onNotice("This custom entry has no bundled default.");
              }}
            >
              Restore bundled values
            </button>
            <button onClick={() => setEdit(null)}>Cancel</button>
          </div>
          {review && (
            <div className="review">
              <h3>Review snapshot changes</h3>
              <p>
                Update name, code, coordinates / zone suggestion, and logo in{" "}
                {used.length} flight snapshots. Manual distance, entered time
                zones and individual alliance overrides stay as entered. Time
                zone suggestions may need review.
              </p>
              <pre>
                {JSON.stringify(
                  {
                    before: state.library[kind].find((r) => r.id === edit.id),
                    after: edit,
                  },
                  (key, value) =>
                    key === "logo" ? (value ? "[SVG asset]" : null) : value,
                  2,
                )}
              </pre>
              <ul>
                {used.map((f) => (
                  <li key={f.id}>
                    {f.number || "Unnamed flight"} · {f.id}
                  </li>
                ))}
              </ul>
              <button className="primary" onClick={() => store(true)}>
                Confirm snapshot changes
              </button>
              <button onClick={() => setReview(false)}>Keep reviewing</button>
            </div>
          )}
        </div>
      ) : (
        <div className="reference-list">
          {state.library[kind]
            .filter(
              (r) =>
                (showHidden || !r.hidden) &&
                [r.name, r.code, r.city, r.aliases]
                  .join(" ")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((r) => (
              <button
                className="reference-row"
                key={r.id}
                onClick={() => {
                  setEdit(structuredClone(r));
                  setReview(false);
                }}
              >
                {r.logo ? (
                  <img src={r.logo} alt="" />
                ) : (
                  <span className="reference-icon">{r.code || "◇"}</span>
                )}
                <span>
                  <strong>{r.name}</strong>
                  <small>
                    {r.code} {r.city} · {r.source || "Custom"}{" "}
                    {r.hidden ? "· Hidden" : ""}
                  </small>
                </span>
                <span>›</span>
              </button>
            ))}
        </div>
      )}
      {incoming && (
        <div className="review">
          <h3>Import preview · {incoming.kind}</h3>
          <p>
            {incoming.entries.length} entries ·{" "}
            {
              incoming.entries.filter((r) =>
                state.library[incoming.kind].some((x) => x.id === r.id),
              ).length
            }{" "}
            matching IDs. Flight snapshots remain unchanged.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            Replace conflicting Library entries
          </label>
          <button
            className="primary"
            onClick={async () => {
              const preview = incoming,
                overwrite = replace;
              if (
                await onCommit((s) => {
                  for (const r of preview.entries) {
                    const i = s.library[preview.kind].findIndex(
                      (x) => x.id === r.id,
                    );
                    if (i < 0) s.library[preview.kind].push(r);
                    else if (overwrite) s.library[preview.kind][i] = r;
                  }
                  return s;
                })
              )
                setIncoming(null);
            }}
          >
            Confirm import
          </button>
          <button onClick={() => setIncoming(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
