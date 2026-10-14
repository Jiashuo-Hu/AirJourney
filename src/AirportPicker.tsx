import { useEffect, useMemo, useState } from "react";
import type { AirportSearch } from "./airports";
import { locationLabel } from "./airports";
import type { Reference } from "./types";
export function AirportPicker({
  side,
  index,
  onSelect,
}: {
  side: "Departure" | "Arrival";
  index: AirportSearch;
  onSelect: (r: Reference) => void;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const found = useMemo(() => index.search(query, 30), [index, query]);
  const listId = "airport-results-" + side.toLowerCase();
  useEffect(() => {
    if (open)
      document
        .getElementById(listId + "-" + active)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, query]);
  function choose(r: Reference) {
    onSelect(r);
    setQuery("");
    setOpen(false);
    setActive(0);
  }
  return (
    <div
      className="airport-picker"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label>
        Search airport
        <input
          role="combobox"
          autoComplete="off"
          aria-label={`Search ${side.toLowerCase()} airports`}
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && found.results[active] ? listId + "-" + active : undefined
          }
          placeholder="Code, airport, city or country"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                Math.max(
                  0,
                  Math.min(
                    found.results.length - 1,
                    i + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (found.results[active]) choose(found.results[active]);
            }
          }}
        />
      </label>
      {open && (
        <div
          className="airport-options"
          id={listId}
          role="listbox"
          aria-label={`${side} airport results`}
        >
          {found.results.map((r, i) => (
            <button
              type="button"
              role="option"
              aria-selected={i === active}
              id={listId + "-" + i}
              key={r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(r)}
            >
              <strong>
                {r.code || r.ident || "—"} · {r.name}
              </strong>
              <small>{[r.city, r.region].filter(Boolean).join(" · ")}</small>
              <small>
                {locationLabel(r)}
                {r.airportType
                  ? " · " + r.airportType.replaceAll("_", " ")
                  : ""}
              </small>
            </button>
          ))}
          <small className="search-total">
            {found.total
              ? `${found.total.toLocaleString("en-US")} matches · showing ${found.results.length}`
              : "No match. Enter your own place below."}
          </small>
        </div>
      )}
    </div>
  );
}
