import { lockedReference, sameCoordinates } from "./location-lock";
import { useMemo, useRef, useState } from "react";
import { AirportSearch, locationLabel } from "./airports";
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
import {
  AirlineSearch,
  airlineLogo,
  airlineStatus,
  brandFor,
} from "./airlines";
export function Library({
  state,
  airportIndex,
  airlineIndex,
  onCommit,
  onNotice,
}: {
  state: State;
  airportIndex: AirportSearch;
  airlineIndex: AirlineSearch;
  onCommit: (change: StateMutation) => Promise<boolean>;
  onNotice: (s: string) => void;
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
  const drafts = useRef<Record<string, Reference | null>>({});
  const [offset, setOffset] = useState(0);
  const found = useMemo(
    () =>
      kind === "Airports"
        ? airportIndex.search(query, 60, offset, showHidden)
        : kind === "Airlines"
          ? airlineIndex.search(query, 60, offset, showHidden)
          : new AirportSearch(state.library[kind]).search(
              query,
              60,
              offset,
              showHidden,
            ),
    [
      kind,
      airportIndex,
      airlineIndex,
      state.library[kind],
      query,
      offset,
      showHidden,
    ],
  );
  const bundled =
    kind === "Airports"
      ? airportIndex.byId
      : kind === "Airlines"
        ? airlineIndex.byId
        : new Map(seedLibrary[kind].map((r) => [r.id, r]));
  const used = edit
    ? state.flights.filter((f) =>
        referenceUsedBy(
          f,
          kind,
          state.library[kind].find((r) => r.id === edit.id) ||
            bundled.get(edit.id) ||
            edit,
        ),
      )
    : [];
  const patch = (p: Partial<Reference>) =>
    setEdit((v) => (v ? { ...v, ...p } : null));
  async function store(apply = false) {
    if (kind === "Airports") {
      onNotice("Airport information is read-only.");
      return;
    }
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
    let e: Reference = {
      ...edit,
      source:
        edit.source?.startsWith("OurAirports") || edit.source === "Bundled"
          ? "User edited"
          : edit.source || "Custom",
    };
    if (kind === "Airports") {
      const original =
        state.library.Airports.find((r) => r.id === e.id) ||
        airportIndex.baseById.get(e.id);
      if (!original) {
        onNotice("Choose a supplied airport. Airport creation is disabled.");
        return;
      }
      e = lockedReference(e, original);
    }
    const target = kind;
    if (
      await onCommit((s) => {
        const previous =
          s.library[target].find((r) => r.id === e.id) ||
          bundled.get(e.id) ||
          e;
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
      drafts.current[target] = null;
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
      if (f)
        patch({
          logo: safeSvg(new TextDecoder().decode(f.bytes)),
          logoPolicy: "custom",
        });
    } catch (e) {
      onNotice(String(e));
    }
  }
  async function importData() {
    if (kind === "Airports") {
      onNotice("Airport information is read-only.");
      return;
    }
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
      if (kind === "Airports")
        data.entries = data.entries.map((r: Reference) => {
          const original =
            state.library.Airports.find((x) => x.id === r.id) ||
            airportIndex.baseById.get(r.id) ||
            airportIndex.canonicalFor(r);
          if (!original)
            throw Error(
              "Airport imports update supplied entries only. New locations are not supported.",
            );
          if (
            (r.lat !== undefined || r.lon !== undefined) &&
            !sameCoordinates(r, original)
          )
            throw Error(
              "Airport coordinates are locked. Import metadata only, without changed coordinates.",
            );
          return lockedReference(
            { ...original, ...r, id: original.id },
            original,
          );
        });
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
          <h2>Library</h2>
        </div>
        {kind !== "Airports" && (
          <button
            className="primary"
            onClick={() => {
              setEdit({ id: crypto.randomUUID(), name: "", source: "Custom" });
              setReview(false);
            }}
          >
            + Add new
          </button>
        )}
      </div>
      <div className="tabs">
        {Object.keys(state.library).map((k) => (
          <button
            className={kind === k ? "active" : ""}
            key={k}
            onClick={() => {
              drafts.current[kind] = edit;
              setKind(k);
              setEdit(drafts.current[k] || null);
              setQuery("");
              setOffset(0);
              setReview(false);
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
          onChange={(e) => {
            setQuery(e.target.value);
            setOffset(0);
          }}
        />
      </div>
      <div className="row">
        {kind !== "Airports" && <button onClick={importData}>Import</button>}
        <details className="data-tools">
          <summary>Data tools</summary>
          <button
            onClick={() =>
              exportFile(
                `airjourney-${kind.toLowerCase()}.json`,
                new TextEncoder().encode(
                  JSON.stringify(
                    { kind, entries: state.library[kind] },
                    null,
                    2,
                  ),
                ),
              )
            }
          >
            Export personal JSON
          </button>
          <button
            onClick={() =>
              exportFile(
                `airjourney-${kind.toLowerCase()}.csv`,
                new TextEncoder().encode(referenceCSV(state.library[kind])),
              )
            }
          >
            Export personal CSV
          </button>
          <label className="check">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => {
                setShowHidden(e.target.checked);
                setOffset(0);
              }}
            />
            Show hidden
          </label>
          <small>
            Exports contain your saved entries and overrides. The global base
            stays bundled.
          </small>
        </details>
      </div>
      {edit && kind === "Airports" ? (
        <div className="airport-reference-detail">
          <div className="panel-head"><h3>{edit.name}</h3><span className="badge">Read-only</span></div>
          <dl>
            <dt>Airport codes</dt><dd>{[edit.iata || edit.code, edit.icao, edit.ident].filter(Boolean).join(" · ") || "Not supplied"}</dd>
            <dt>City</dt><dd>{edit.city || "Not supplied"}</dd>
            <dt>Country / region</dt><dd>{edit.region || "Not supplied"}</dd>
            <dt>Time zone suggestion</dt><dd>{edit.zone || "Not supplied"}</dd>
            <dt>Location</dt><dd>{locationLabel(edit)}{hasLocation(edit) ? ` · ${edit.lat!.toFixed(6)}, ${edit.lon!.toFixed(6)}` : ""}</dd>
            <dt>Source</dt><dd>{edit.locationSource || edit.source || "Preserved legacy entry"}</dd>
            <dt>Aliases</dt><dd>{edit.aliases || "Not supplied"}</dd>
          </dl>
          <small>Airport information is supplied with the app. Existing historical entries are preserved.</small>
          <button onClick={() => setEdit(null)}>Back to airports</button>
        </div>
      ) : edit ? (
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
              <details className="advanced">
                <summary>Fixed airport location</summary>
                <dl>
                  <dt>Coordinates</dt>
                  <dd>
                    {hasLocation(edit)
                      ? `${edit.lat!.toFixed(6)}, ${edit.lon!.toFixed(6)}`
                      : "Not supplied"}
                  </dd>
                  <dt>Source</dt>
                  <dd>
                    {edit.locationSource ||
                      edit.source ||
                      "Preserved legacy entry"}
                  </dd>
                </dl>
              </details>
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
            <>
              <label>
                Operational status
                <select
                  value={edit.airlineStatus || "unknown"}
                  onChange={(e) =>
                    patch({
                      airlineStatus: e.target
                        .value as Reference["airlineStatus"],
                      statusSource: "User provided",
                    })
                  }
                >
                  <option value="unknown">Unverified</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / historical</option>
                </select>
              </label>
              <small>
                {edit.statusSource}
                {edit.codeNote ? " · " + edit.codeNote : ""}
              </small>
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
            </>
          )}
          {["Airlines", "Alliances"].includes(kind) && (
            <>
              <div className="logo-preview">
                {airlineLogo(edit) ? (
                  <img src={airlineLogo(edit)} alt={edit.name + " logo"} />
                ) : (
                  <span>{kind === "Airlines" && brandFor(edit)?.full ? "Standalone symbol unavailable" : "Logo not added"}</span>
                )}
              </div>
              <div className="row">
                <button onClick={logo}>Choose SVG</button>
                <button
                  onClick={() => patch({ logo: undefined, logoPolicy: "none" })}
                >
                  Remove logo
                </button>
              </div>
              <small>
                User supplied SVG: confirm you have the right to use this file.
              </small>
              {kind === "Airlines" && brandFor(edit)?.full && (
                <details className="brand-full">
                  <summary>Bundled full logo</summary>
                  <img
                    src={brandFor(edit)?.full}
                    alt={edit.name + " full logo"}
                  />
                  <small>
                    Source and usage conditions: local brand manifest in the
                    delivery documents.
                  </small>
                </details>
              )}
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
            {kind !== "Airports" && (
              <button
                onClick={() => {
                  const base =
                    (kind === "Airlines"
                      ? airlineIndex.baseById.get(edit.id)
                      : undefined) ||
                    seedLibrary[kind].find((r) => r.id === edit.id) ||
                    airportIndex.baseById.get(edit.id);
                  if (base) setEdit(structuredClone(base));
                  else onNotice("This custom entry has no bundled default.");
                }}
              >
                Restore bundled values
              </button>
            )}
            <button
              onClick={() => {
                drafts.current[kind] = null;
                setEdit(null);
              }}
            >
              Cancel
            </button>
          </div>
          {review && (
            <div className="review">
              <h3>Review snapshot changes</h3>
              <p>
                Update name, code, zone suggestion, and logo in {used.length}{" "}
                flight snapshots. Manual distance, entered time zones, fixed
                airport locations and individual alliance overrides stay as
                entered. Time zone suggestions may need review.
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
          <div className="library-count">
            {found.total.toLocaleString("en-US")} entries
            {kind === "Airports" ? " · local catalogue + personal" : ""}
          </div>
          {found.results.map((r) => (
            <button
              className="reference-row"
              key={r.id}
              onClick={() => {
                setEdit(structuredClone(r));
                setReview(false);
              }}
            >
              {airlineLogo(r) ? (
                <img src={airlineLogo(r)} alt="" />
              ) : (
                <span
                  className="reference-icon"
                  title={
                    kind === "Airlines" ? "No verified vector logo" : undefined
                  }
                >
                  {kind === "Airlines" ? "◇" : r.code || "◇"}
                </span>
              )}
              <span>
                <strong>{r.name}</strong>
                <small>
                  {[r.code, r.city, r.region].filter(Boolean).join(" · ")}{" "}
                  {r.hidden ? "· Hidden" : ""}
                </small>
                {kind === "Airports" && (
                  <small>
                    {locationLabel(r)} ·{" "}
                    {r.airportType?.replaceAll("_", " ") ||
                      r.source ||
                      "Custom"}
                  </small>
                )}
                {kind === "Airlines" && <small>{airlineStatus(r)}</small>}
              </span>
              <span>›</span>
            </button>
          ))}
          <div className="row">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((v) => Math.max(0, v - 60))}
            >
              Previous
            </button>
            <small>
              {found.total ? offset + 1 : 0}–
              {Math.min(offset + 60, found.total)} of {found.total}
            </small>
            <button
              disabled={offset + 60 >= found.total}
              onClick={() => setOffset((v) => v + 60)}
            >
              Next
            </button>
          </div>
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
