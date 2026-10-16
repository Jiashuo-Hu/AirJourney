import { useEffect, useMemo, useState } from "react";
import { AirlineSearch, airlineLogo, airlineStatus } from "./airlines";
import type { Reference } from "./types";
export function AirlinePicker({
  index,
  value,
  onSelect,
}: {
  index: AirlineSearch;
  value?: Reference;
  onSelect: (r?: Reference) => void;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [letter, setLetter] = useState(""),
    [offset, setOffset] = useState(0),
    [active, setActive] = useState(0),
    [status, setStatus] = useState("all");
  const found = useMemo(
    () => index.search(query, 30, offset, false, letter, status),
    [index, query, offset, letter, status],
  );
  const id = "airline-results";
  useEffect(() => {
    if (open)
      document
        .getElementById(id + "-" + active)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, query, open]);
  function choose(r?: Reference) {
    onSelect(r ? structuredClone({ ...r, logo: airlineLogo(r) }) : undefined);
    setOpen(false);
    setQuery("");
    setOffset(0);
    setActive(0);
  }
  function reset() {
    setOffset(0);
    setActive(0);
  }
  return (
    <div
      className="airline-picker"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label>
        Airline
        <div className="airline-current">
          {airlineLogo(value) ? (
            <img src={airlineLogo(value)} alt="" />
          ) : (
            <span className="brand-placeholder" title="No verified standalone symbol">
              ◇
            </span>
          )}
          <span>
            {value
              ? `${value.code ? value.code + " · " : ""}${value.name}`
              : "Unknown airline"}
          </span>
        </div>
        <input
          role="combobox"
          aria-label="Search airlines"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={id}
          aria-activedescendant={
            open && found.results[active] ? id + "-" + active : undefined
          }
          placeholder="Code or airline name"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setLetter("");
            setOpen(true);
            reset();
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
      <div className="row">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            reset();
          }}
        >
          Browse A–Z
        </button>
        {value && (
          <button type="button" onClick={() => choose()}>
            Clear airline
          </button>
        )}
      </div>
      {open && (
        <div className="airline-options-panel">
          <div
            className="alphabet"
            aria-label="Browse airlines by first letter"
          >
            {["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((l) => (
              <button
                type="button"
                key={l}
                aria-pressed={(letter || "All") === l}
                onClick={() => {
                  setLetter(l === "All" ? "" : l);
                  setQuery("");
                  reset();
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="inline-filter">
            Status
            <select
              aria-label="Airline status filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                reset();
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active · checked</option>
              <option value="inactive">Inactive · source</option>
              <option value="unknown">Unverified</option>
            </select>
          </label>
          <div
            className="airline-options"
            id={id}
            role="listbox"
            aria-label="Airline results"
          >
            {found.results.map((r, i) => (
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                id={id + "-" + i}
                key={r.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
              >
                {airlineLogo(r) ? (
                  <img src={airlineLogo(r)} alt="" />
                ) : (
                  <span
                    className="brand-placeholder"
                    title="No verified vector logo"
                  >
                    ◇
                  </span>
                )}
                <span>
                  <strong>
                    {r.code || "—"} · {r.name}
                  </strong>
                  <small>
                    {airlineStatus(r)}
                    {r.region ? " · " + r.region : ""}
                  </small>
                  {r.historicalAliases && (
                    <small>Historical names: {r.historicalAliases}</small>
                  )}
                  {r.codeNote && <small>{r.codeNote}</small>}
                </span>
              </button>
            ))}
          </div>
          <div className="airline-pages">
            <button
              type="button"
              disabled={!offset}
              onClick={() => {
                setOffset((n) => Math.max(0, n - 30));
                setActive(0);
              }}
            >
              Previous
            </button>
            <small>
              {found.total ? offset + 1 : 0}–
              {Math.min(offset + 30, found.total)} / {found.total}
            </small>
            <button
              type="button"
              disabled={offset + 30 >= found.total}
              onClick={() => {
                setOffset((n) => n + 30);
                setActive(0);
              }}
            >
              Next
            </button>
          </div>
          {!found.total && (
            <small>No match. Add a personal airline in Library.</small>
          )}
        </div>
      )}
    </div>
  );
}
