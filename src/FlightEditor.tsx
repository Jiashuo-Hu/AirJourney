import type { Field, Flight, Place, Reference, State } from "./types";
import { distance, duration, resolveTime, hasLocation } from "./domain";
const number = (v: string) => (v === "" ? undefined : Number(v));
export function FlightEditor({
  value: f,
  state,
  onChange,
  onSave,
  onCancel,
  onPick,
}: {
  value: Flight;
  state: State;
  onChange: (f: Flight) => void;
  onSave: () => void;
  onCancel: () => void;
  onPick: (side: "from" | "to") => void;
}) {
  const patch = (p: Partial<Flight>) => onChange({ ...f, ...p });
  function airport(side: "from" | "to") {
    const p = f[side];
    const set = (v: Partial<Place>) =>
      patch({
        [side]: {
          ...p,
          ...v,
          overrides: [...new Set([...(p.overrides || []), ...Object.keys(v)])],
        },
      });
    return (
      <fieldset>
        <legend>{side === "from" ? "Departure" : "Arrival"}</legend>
        <label>
          Choose local airport
          <select
            value=""
            onChange={(e) => {
              const r = state.library.Airports.find(
                (r) => r.id === e.target.value,
              );
              if (r)
                patch({
                  [side]: { ...structuredClone(r), overrides: [] },
                  [side === "from" ? "departure" : "arrival"]: {
                    ...f[side === "from" ? "departure" : "arrival"],
                    zone: r.zone || "",
                  },
                });
            }}
          >
            <option value="">Select from Library…</option>
            {state.library.Airports.filter((r) => !r.hidden).map((r) => (
              <option value={r.id} key={r.id}>
                {r.code ? `${r.code} · ` : ""}
                {r.name} · {r.city}
              </option>
            ))}
          </select>
        </label>
        <label>
          Airport / place name
          <input
            list="airport-names"
            value={p.name}
            onChange={(e) =>
              patch({
                [side]: { ...p, id: crypto.randomUUID(), name: e.target.value },
              })
            }
          />
        </label>
        <div className="two">
          <label>
            Code (optional)
            <input
              value={p.code || ""}
              onChange={(e) => set({ code: e.target.value })}
            />
          </label>
          <button type="button" onClick={() => onPick(side)}>
            Pick on globe
          </button>
        </div>
        <div className="two">
          <label>
            Latitude
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              value={p.lat ?? ""}
              onChange={(e) => set({ lat: number(e.target.value) })}
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              value={p.lon ?? ""}
              onChange={(e) => set({ lon: number(e.target.value) })}
            />
          </label>
        </div>
        <span className="muted">
          {hasLocation(p)
            ? "Located · WGS84"
            : "Needs location · You can save without coordinates."}
        </span>
      </fieldset>
    );
  }
  function time(side: "departure" | "arrival") {
    const t = f[side],
      set = (p: Partial<typeof t>) => patch({ [side]: { ...t, ...p } }),
      precision = t.time ? "Date and time" : t.date ? "Date only" : "Unknown";
    return (
      <fieldset>
        <legend>
          {side === "departure" ? "Departure time" : "Arrival time"}
        </legend>
        <label>
          Precision
          <select
            value={precision}
            onChange={(e) =>
              set(
                e.target.value === "Unknown"
                  ? { date: "", time: "" }
                  : e.target.value === "Date only"
                    ? { time: "" }
                    : {},
              )
            }
          >
            <option>Unknown</option>
            <option>Date only</option>
            <option>Date and time</option>
          </select>
        </label>
        <div className="two">
          <label>
            Date
            <input
              type="date"
              value={t.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </label>
          <label>
            Local time
            <input
              type="time"
              value={t.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </label>
        </div>
        <label>
          IANA time zone / UTC offset
          <input
            placeholder="Asia/Shanghai or +08:00"
            list="zones"
            value={t.zone}
            onChange={(e) => set({ zone: e.target.value })}
          />
        </label>
        <span className="badge">{resolveTime(t).status}</span>
        {resolveTime(t).utc && <small>{resolveTime(t).utc}</small>}
      </fieldset>
    );
  }
  return (
    <div className="editor">
      <div className="panel-head">
        <div>
          <span className="eyebrow">MANUAL ENTRY</span>
          <h2>
            {state.flights.some((v) => v.id === f.id)
              ? "Edit flight"
              : "Add flight"}
          </h2>
        </div>
        <button aria-label="Close editor" onClick={onCancel}>
          ×
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="form-scroll">
          <p className="muted">
            Times and flight details are entered by you. Unknown values are
            welcome.
          </p>
          <label>
            Flight number
            <input
              autoFocus
              value={f.number}
              placeholder="Any flight number, or leave empty"
              onChange={(e) => patch({ number: e.target.value })}
            />
          </label>
          {airport("from")}
          {airport("to")}
          <label>
            Airline
            <select
              value={f.airline?.id || ""}
              onChange={(e) =>
                patch({
                  airline: structuredClone(
                    state.library.Airlines.find((r) => r.id === e.target.value),
                  ),
                  alliance: state.library.Airlines.find(
                    (r) => r.id === e.target.value,
                  )?.alliance,
                  allianceLogo: state.library.Alliances.find(
                    (r) =>
                      r.name ===
                      state.library.Airlines.find(
                        (a) => a.id === e.target.value,
                      )?.alliance,
                  )?.logo,
                })
              }
            >
              <option value="">Unknown</option>
              {state.library.Airlines.filter((r) => !r.hidden).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {time("departure")}
          {time("arrival")}
          <details open>
            <summary>More details</summary>
            <label>
              Aircraft
              <select
                value={f.aircraft?.id || ""}
                onChange={(e) =>
                  patch({
                    aircraft: structuredClone(
                      state.library.Aircraft.find(
                        (r) => r.id === e.target.value,
                      ),
                    ),
                  })
                }
              >
                <option value="">Unknown</option>
                {state.library.Aircraft.filter((r) => !r.hidden).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alliance override
              <select
                value={f.alliance || "Unknown"}
                onChange={(e) =>
                  patch({
                    alliance: e.target.value,
                    allianceLogo: state.library.Alliances.find(
                      (r) => r.name === e.target.value,
                    )?.logo,
                  })
                }
              >
                <option>Unknown</option>
                <option>None</option>
                {state.library.Alliances.map((r) => (
                  <option key={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <div className="two">
              <label>
                Recorded distance
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={f.distance ?? ""}
                  onChange={(e) => patch({ distance: number(e.target.value) })}
                />
              </label>
              <label>
                Original unit
                <select
                  value={f.unit}
                  onChange={(e) =>
                    patch({ unit: e.target.value as Flight["unit"] })
                  }
                >
                  <option>km</option>
                  <option>miles</option>
                </select>
              </label>
            </div>
            <p className="muted">
              Geographic estimate:{" "}
              {distance(f.from, f.to) === null
                ? "Unknown"
                : (distance(f.from, f.to)! / 1000).toFixed(1) + " km"}{" "}
              · Route illustration
            </p>
            <label>
              Duration override (minutes)
              <input
                type="number"
                min="0"
                step="any"
                value={f.duration ?? ""}
                onChange={(e) => patch({ duration: number(e.target.value) })}
              />
            </label>
            <p className="muted">
              {f.duration !== undefined ? "Manual duration · " : ""}Calculated
              duration:{" "}
              {duration(f) === null
                ? "Unavailable / time needs review"
                : duration(f) + " minutes"}
            </p>
            <label>
              Status
              <select
                value={f.status}
                onChange={(e) =>
                  patch({ status: e.target.value as Flight["status"] })
                }
              >
                <option>Recorded</option>
                <option>Planned</option>
                <option>Draft</option>
              </select>
            </label>
            <label>
              Tags (comma separated)
              <input
                value={f.tags.join(", ")}
                list="tags"
                onChange={(e) =>
                  patch({
                    tags: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <label>
              Notes
              <textarea
                rows={4}
                value={f.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </label>
            {state.fields
              .filter((v) => !v.hidden)
              .map((field) => (
                <label key={field.id}>
                  {field.label}
                  {field.type === "select" ? (
                    <select
                      value={f.fields[field.id] || ""}
                      onChange={(e) =>
                        patch({
                          fields: { ...f.fields, [field.id]: e.target.value },
                        })
                      }
                    >
                      <option value="">Unknown</option>
                      {[
                        ...new Set([
                          ...field.options.split(","),
                          f.fields[field.id] || "",
                        ]),
                      ]
                        .filter(Boolean)
                        .map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={f.fields[field.id] || ""}
                      onChange={(e) =>
                        patch({
                          fields: { ...f.fields, [field.id]: e.target.value },
                        })
                      }
                    />
                  )}
                </label>
              ))}
            <label className="check">
              <input
                type="checkbox"
                checked={f.visible}
                onChange={(e) => patch({ visible: e.target.checked })}
              />
              Show on map
            </label>
            <label>
              Route color override
              <input
                type="color"
                value={f.color || state.settings.routeColor}
                onChange={(e) => patch({ color: e.target.value })}
              />
            </label>
            <button type="button" onClick={() => patch({ color: "" })}>
              Reset to global style
            </button>
          </details>
          <datalist id="airport-names">
            {state.library.Airports.map((r) => (
              <option key={r.id} value={r.name}>
                {r.code} · {r.city}
              </option>
            ))}
          </datalist>
          <datalist id="zones">
            {[
              "Asia/Shanghai",
              "Asia/Tokyo",
              "Asia/Hong_Kong",
              "Asia/Taipei",
              "Europe/London",
              "Europe/Paris",
              "America/New_York",
              "America/Los_Angeles",
              "Pacific/Auckland",
              "Australia/Sydney",
              "UTC",
              "+08:00",
              "-04:00",
              "-05:00",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </datalist>
          <datalist id="tags">
            {state.tags.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </datalist>
        </div>
        <div className="form-footer">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save flight
          </button>
        </div>
      </form>
    </div>
  );
}
