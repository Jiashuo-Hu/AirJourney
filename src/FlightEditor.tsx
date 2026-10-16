import { sameCoordinates } from "./location-lock";
import { useEffect, useState } from "react";
import { AirportPicker } from "./AirportPicker";
import { AirlinePicker } from "./AirlinePicker";
import type { AirlineSearch } from "./airlines";
import { locationLabel, type AirportSearch } from "./airports";
import type {
  Field,
  Flight,
  Place,
  Reference,
  State,
  TimePrecision,
} from "./types";
import {
  distance,
  duration,
  resolveTime,
  hasLocation,
  timePrecision,
  withPrecision,
  parseTags,
} from "./domain";
const number = (v: string) => (v === "" ? undefined : Number(v));
export function FlightEditor({
  value: f,
  state,
  airportIndex,
  airlineIndex,
  onChange,
  onSave,
  onCancel,
}: {
  value: Flight;
  state: State;
  airportIndex: AirportSearch;
  airlineIndex: AirlineSearch;
  onChange: (f: Flight) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const patch = (p: Partial<Flight>) => onChange({ ...f, ...p });
  const [tagText, setTagText] = useState(f.tags.join(", "));
  useEffect(() => setTagText(f.tags.join(", ")), [f.id]);
  function airport(side: "from" | "to") {
    const p = f[side];
    const supplied = airportIndex.canonicalFor(p);
    const legacy = supplied && !sameCoordinates(p, supplied);
    return (
      <div className="airport-block">
        <AirportPicker
          side={side === "from" ? "Departure" : "Arrival"}
          index={airportIndex}
          onSelect={(r) =>
            patch({
              [side]: {
                ...structuredClone(airportIndex.canonicalFor(r) || r),
                name: r.name,
                overrides: [],
              },
              [side === "from" ? "departure" : "arrival"]: {
                ...f[side === "from" ? "departure" : "arrival"],
                zone: r.zone || "",
              },
            })
          }
        />
        <div className="chosen-airport">
          <strong>{p.name || "Select an airport"}</strong>
          <small>
            {[p.iata || p.code, p.city, p.region].filter(Boolean).join(" · ")}
          </small>
          {p.name && (
            <span className="location-status">
              {legacy ? "Preserved legacy location" : locationLabel(p)}
            </span>
          )}
        </div>
        {p.name && (
          <details className="advanced">
            <summary>Airport information</summary>
            <dl>
              <dt>Coordinates</dt>
              <dd>
                {hasLocation(p)
                  ? `${p.lat!.toFixed(6)}, ${p.lon!.toFixed(6)}`
                  : "Not supplied"}
              </dd>
              <dt>Location source</dt>
              <dd>
                {legacy
                  ? "Stored legacy coordinates; selecting an airport uses the supplied catalogue location."
                  : p.locationSource || p.source || "Preserved legacy record"}
              </dd>
            </dl>
          </details>
        )}
      </div>
    );
  }
  function time(side: "departure" | "arrival") {
    const t = f[side],
      set = (p: Partial<typeof t>) => patch({ [side]: { ...t, ...p } }),
      precision = timePrecision(t);
    return (
      <div className="local-time-block">
        <label>
          Time precision
          <select
            aria-label="Time precision"
            value={precision}
            onChange={(e) =>
              patch({
                [side]: withPrecision(t, e.target.value as TimePrecision),
              })
            }
          >
            <option>Unknown</option>
            <option>Date only</option>
            <option>Date and time</option>
          </select>
        </label>
        <div className="two">
          <label>
            Local date
            <input
              type="date"
              value={t.date}
              onChange={(e) =>
                set({
                  date: e.target.value,
                  precision: precision === "Unknown" ? "Date only" : precision,
                })
              }
            />
          </label>
          <label>
            Local time
            <input
              type="time"
              value={t.time}
              onChange={(e) =>
                set({ time: e.target.value, precision: "Date and time" })
              }
            />
          </label>
        </div>
        <label>
          Time zone / UTC offset
          <input
            placeholder="Asia/Shanghai or +08:00"
            list="zones"
            value={t.zone}
            onChange={(e) => set({ zone: e.target.value })}
          />
        </label>
        <span className="badge">{resolveTime(t).status}</span>
        {resolveTime(t).utc && <small>{resolveTime(t).utc}</small>}
      </div>
    );
  }
  return (
    <div className="editor">
      <div className="panel-head">
        <div>
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
          <label>
            Flight number
            <input
              autoFocus
              value={f.number}
              placeholder="Any flight number, or leave empty"
              onChange={(e) => patch({ number: e.target.value })}
            />
          </label>
          <fieldset className="journey-endpoint" aria-label="Departure">
            <legend>Departure</legend>
            {airport("from")}
            {time("departure")}
          </fieldset>
          <fieldset className="journey-endpoint" aria-label="Arrival">
            <legend>Arrival</legend>
            {airport("to")}
            {time("arrival")}
          </fieldset>
          <AirlinePicker
            index={airlineIndex}
            value={f.airline}
            onSelect={(airline) =>
              patch({
                airline,
                alliance: airline?.alliance,
                allianceLogo: state.library.Alliances.find(
                  (r) => r.name === airline?.alliance,
                )?.logo,
              })
            }
          />
          <details key={f.id}>
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
                value={tagText}
                list="tags"
                onChange={(e) => {
                  setTagText(e.target.value);
                  patch({ tags: parseTags(e.target.value) });
                }}
                onBlur={() => setTagText(parseTags(tagText).join(", "))}
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
