import {
  assertLocationsLocked,
  assertAirportLibraryReadOnly,
} from "./location-lock";
import { APP_VERSION } from "./version";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import moment from "moment-timezone";
import type { Flight, State, Place } from "./types";
import { initialState } from "./seed";
import {
  csv,
  distance,
  duration,
  hasLocation,
  recordedMeters,
  resolveTime,
  validateFlight,
  validateState,
} from "./domain";
import {
  load,
  save,
  backup,
  parseBackup,
  readFile,
  exportFile,
} from "./storage";
import { JourneySummary } from "./JourneySummary";
import { flightYears, inYear } from "./journey-summary";
const Globe = lazy(() => import("./Globe").then((m) => ({ default: m.Globe })));
import { FlightEditor } from "./FlightEditor";
import { Library } from "./Library";
import { Settings } from "./Settings";
import { serialMutations, type StateMutation } from "./state-updates";
import { AirportSearch, loadAirportCatalog, locationLabel } from "./airports";
import type { Reference } from "./types";
import { AirlineSearch, airlineLogo, loadAirlineCatalog } from "./airlines";
function blank(): Flight {
  return {
    id: crypto.randomUUID(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    number: "",
    from: { id: crypto.randomUUID(), name: "" },
    to: { id: crypto.randomUUID(), name: "" },
    departure: { date: "", time: "", zone: "" },
    arrival: { date: "", time: "", zone: "" },
    unit: "km",
    status: "Recorded",
    tags: [],
    notes: "",
    fields: {},
    color: "",
    visible: true,
  };
}
export function App() {
  const [catalogue, setCatalogue] = useState<Reference[]>([]);
  const [airlineCatalogue, setAirlineCatalogue] = useState<Reference[]>([]);
  const [state, setState] = useState<State | null>(null),
    [fatal, setFatal] = useState(""),
    [notice, setNotice] = useState(""),
    [page, setPage] = useState("Flights"),
    [side, setSide] = useState(true),
    [draft, setDraft] = useState<Flight | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [filters, setFilters] = useState(false),
    [statuses, setStatuses] = useState<string[]>([]),
    [airlines, setAirlines] = useState<string[]>([]),
    [ports, setPorts] = useState<string[]>([]),
    [tags, setTags] = useState<string[]>([]),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [sort, setSort] = useState("Newest first"),
    [trash, setTrash] = useState(false),
    [year, setYear] = useState("All"),
    [path, setPath] = useState("Browser preview storage"),
    [incoming, setIncoming] = useState<State | null>(null),
    [importMode, setImportMode] = useState("Merge · keep conflicts"),
    [confirm, setConfirm] = useState<{
      title: string;
      body: string;
      action: () => void;
    } | null>(null),
    [focusRequest, setFocusRequest] = useState(0),
    [busy, setBusy] = useState(false);
  const current = useRef(state),
    queue = useRef<ReturnType<typeof serialMutations> | null>(null),
    pending = useRef(0);
  const airportIndex = useMemo(
    () => new AirportSearch(catalogue, state?.library.Airports || []),
    [catalogue, state?.library.Airports],
  );
  const airlineIndex = useMemo(
    () => new AirlineSearch(airlineCatalogue, state?.library.Airlines || []),
    [airlineCatalogue, state?.library.Airlines],
  );
  const flightAirportIndex = useMemo(
    () =>
      new AirportSearch(
        catalogue,
        (state?.library.Airports || []).filter((r) =>
          airportIndex.canonicalFor(r),
        ),
      ),
    [catalogue, airportIndex],
  );
  useEffect(() => {
    loadAirlineCatalog()
      .then(setAirlineCatalogue)
      .catch((e) =>
        setNotice(String(e) + " Your personal airlines remain available."),
      );
    loadAirportCatalog()
      .then(setCatalogue)
      .catch((e) =>
        setNotice(String(e) + " Your personal Library is still available."),
      );
  }, []);
  if (!queue.current)
    queue.current = serialMutations(
      () => current.current,
      save,
      (next) => {
        current.current = next;
        setState(next);
      },
    );
  const modalRef = useRef<HTMLDivElement>(null);
  const modalOpen = Boolean(confirm || incoming);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = modalRef.current;
    const controls = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]',
        ) ?? [],
      );
    controls()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirm(null);
        setIncoming(null);
      } else if (event.key === "Tab") {
        const list = controls();
        const first = list[0],
          last = list.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      if (previous?.isConnected) previous.focus();
    };
  }, [modalOpen]);
  current.current = state;
  useEffect(() => {
    load()
      .then((s) => {
        setState(s ? validateState(s) : initialState());
      })
      .catch((e) =>
        setFatal(
          "Your data could not be loaded. No empty database has been created. " +
            String(e),
        ),
      );
    window.airjourney?.dataPath().then(setPath);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  async function commit(change: StateMutation, restoreBackup = false) {
    pending.current++;
    setBusy(true);
    try {
      await queue.current!((s) => {
        const previous = current.current!;
        const next = change(s);
        if (!restoreBackup) assertAirportLibraryReadOnly(previous, next);
        if (!restoreBackup)
          assertLocationsLocked(previous, next, airportIndex.baseById);
        return next;
      });
      return true;
    } catch (e) {
      setNotice(
        "Changes were not saved. Your current data and draft are preserved. " +
          String(e),
      );
      return false;
    } finally {
      pending.current--;
      setBusy(pending.current > 0);
    }
  }
  const years = useMemo(
    () => flightYears(state?.flights || [], trash),
    [state?.flights, trash],
  );
  const activeYear = year === "All" || years.includes(year) ? year : "All";
  useEffect(() => {
    if (year !== activeYear) setYear(activeYear);
  }, [year, activeYear]);
  const filtered = useMemo(() => {
    if (!state) return [];
    const list = state.flights.filter(
      (f) =>
        Boolean(f.deleted) === trash &&
        inYear(f, activeYear) &&
        (!statuses.length || statuses.includes(f.status)) &&
        (!airlines.length || airlines.includes(f.airline?.id || "Unknown")) &&
        (!ports.length ||
          ports.includes(f.from.id) ||
          ports.includes(f.to.id)) &&
        (!tags.length || f.tags.some((t) => tags.includes(t))) &&
        (!start || (f.departure.date && f.departure.date >= start)) &&
        (!end || (f.departure.date && f.departure.date <= end)) &&
        [
          f.number,
          f.from.name,
          f.to.name,
          f.from.code,
          f.to.code,
          f.airline?.name,
          f.aircraft?.name,
          f.notes,
          ...f.tags,
          ...Object.values(f.fields),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
    return list.sort((a, b) => {
      if (sort === "Flight number")
        return a.number.localeCompare(b.number) || a.id.localeCompare(b.id);
      if (!a.departure.date && !b.departure.date)
        return a.id.localeCompare(b.id);
      if (!a.departure.date) return 1;
      if (!b.departure.date) return -1;
      const utcA = resolveTime(a.departure).utc,
        utcB = resolveTime(b.departure).utc;
      const diff =
        a.departure.date.localeCompare(b.departure.date) ||
        (utcA && utcB
          ? utcA.localeCompare(utcB)
          : (a.departure.time || "").localeCompare(b.departure.time || "")) ||
        a.id.localeCompare(b.id);
      return sort === "Oldest first" ? diff : -diff;
    });
  }, [
    state,
    trash,
    activeYear,
    statuses,
    airlines,
    ports,
    tags,
    start,
    end,
    search,
    sort,
  ]);
  useEffect(() => {
    if (selected && !filtered.some((f) => f.id === selected)) setSelected(null);
  }, [filtered, selected]);
  function cancelDraft() {
    if (draft)
      setConfirm({
        title: "Discard this draft?",
        body: "Your saved flights will stay unchanged.",
        action: () => {
          setDraft(null);
          setConfirm(null);
        },
      });
  }
  function add() {
    const begin = () => {
      setPage("Flights");
      setTrash(false);
      setSide(true);
      setDraft(blank());
      setConfirm(null);
    };
    if (draft)
      setConfirm({
        title: "Start a new flight?",
        body: "Discard your current unsaved draft?",
        action: begin,
      });
    else begin();
  }
  async function saveDraft() {
    if (!draft || !state) return;
    try {
      validateFlight(draft);
      const f = { ...draft, updated: new Date().toISOString() };
      if (
        await commit((latest) => {
          const s = {
            ...latest,
            flights: [...latest.flights.filter((v) => v.id !== f.id), f],
            tags: [...new Set([...latest.tags, ...f.tags])],
          };
          return s;
        })
      ) {
        setDraft(null);
        setSelected(f.id);
        setNotice(
          hasLocation(f.from) && hasLocation(f.to)
            ? "Flight saved."
            : "Flight saved. Choose supplied airports to show its route.",
        );
      }
    } catch (e) {
      setNotice(String(e));
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (modalOpen) return;
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSide((v) => !v);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSide(true);
        setPage("Flights");
        setTimeout(() => document.getElementById("flight-search")?.focus(), 0);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        add();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "s" && draft) {
        e.preventDefault();
        saveDraft();
      }
      if (e.key === "Escape" && draft) cancelDraft();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [draft, state, modalOpen]);
  useEffect(() => {
    if (!side) document.getElementById("sidebar-toggle")?.focus();
  }, [side]);
  useEffect(() => {
    if (!state) return;
    const media = matchMedia("(prefers-color-scheme: dark)"),
      apply = () => {
        document.documentElement.dataset.theme =
          state.settings.theme === "System"
            ? media.matches
              ? "Dark"
              : "Light"
            : state.settings.theme;
        document.documentElement.dataset.density = state.settings.density;
        document.documentElement.style.setProperty(
          "--accent",
          state.settings.accent,
        );
      };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state?.settings.theme, state?.settings.accent, state?.settings.density]);
  async function exportBackup() {
    await queue.current?.idle();
    const latest = current.current;
    if (latest)
      try {
        if (
          await exportFile(
            `AirJourney-${APP_VERSION}.airjourney`,
            await backup(latest),
          )
        )
          setNotice("Backup exported.");
      } catch (e) {
        setNotice(String(e));
      }
  }
  async function importBackup() {
    try {
      const f = await readFile(".airjourney");
      if (f) setIncoming(await parseBackup(f.bytes));
    } catch (e) {
      setNotice("Import rejected. Existing data unchanged. " + String(e));
    }
  }
  async function applyImport() {
    if (!incoming || !state) return;
    try {
      await queue.current?.idle();
      if (
        !(await exportFile(
          "AirJourney-before-import.airjourney",
          await backup(current.current!),
        ))
      )
        return;
      const replace = importMode === "Replace entire personal library";
      const preview = incoming,
        policy = importMode;
      if (
        await commit((latest) => {
          let s = structuredClone(preview);
          if (!replace) {
            s = latest;
            for (const f of preview.flights) {
              const i = s.flights.findIndex((v) => v.id === f.id);
              if (i < 0) s.flights.push(f);
              else if (policy === "Merge · replace conflicts") s.flights[i] = f;
            }
            for (const k of Object.keys(s.library)) {
              for (const r of preview.library[k]) {
                const i = s.library[k].findIndex((v) => v.id === r.id);
                if (i < 0) s.library[k].push(r);
                else if (policy === "Merge · replace conflicts")
                  s.library[k][i] = r;
              }
            }
            for (const f of preview.fields)
              if (!s.fields.some((v) => v.id === f.id)) s.fields.push(f);
            s.tags = [...new Set([...s.tags, ...preview.tags])];
          }
          return s;
        }, true)
      ) {
        setIncoming(null);
        setSelected(null);
        setNotice("Backup imported.");
      }
    } catch (e) {
      setNotice(String(e));
    }
  }
  function choose(id: string) {
    setSelected((previous) => (previous === id ? null : id));
    setPage("Flights");
    setSide(true);
    setFocusRequest((x) => x + 1);
  }
  if (fatal)
    return (
      <div className="fatal">
        <h1>Storage needs attention</h1>
        <p>{fatal}</p>
        <p>
          Keep the database and .previous file. Restart after restoring a known
          good backup.
        </p>
      </div>
    );
  if (!state) return <div className="fatal">Opening your local journal…</div>;
  const p = state.settings,
    active = state.flights.find((f) => f.id === selected),
    mapped = filtered.filter(
      (f) =>
        !f.deleted && f.visible && hasLocation(f.from) && hasLocation(f.to),
    ),
    missing = filtered.filter(
      (f) => !hasLocation(f.from) || !hasLocation(f.to),
    ).length,
    hidden = filtered.filter((f) => !f.visible).length;
  const multiselect = (
    label: string,
    values: string[],
    set: (v: string[]) => void,
    options: { id: string; name: string }[],
  ) => (
    <label>
      {label}
      <select
        multiple
        value={values}
        onChange={(e) =>
          set(Array.from(e.target.selectedOptions).map((v) => v.value))
        }
      >
        {options.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <small>Ctrl-click for multiple · any when empty</small>
    </label>
  );
  function date(f: Flight) {
    return f.departure.date
      ? moment(f.departure.date).format(
          p.dateFormat === "DD MMM YYYY"
            ? "DD MMM YYYY"
            : p.dateFormat === "MM/DD/YYYY"
              ? "MM/DD/YYYY"
              : "YYYY-MM-DD",
        )
      : "Undated";
  }
  function editFlight(f: Flight) {
    setDraft(structuredClone(f));
    setSide(true);
  }
  return (
    <div className="app" data-reduced-motion={p.reducedMotion}>
      <header className="titlebar" inert={modalOpen}>
        <div className="brand">
          <img className="brandmark" src="./app-logo.svg" alt="" />
          <strong>AirJourney</strong>
          <small>{APP_VERSION}</small>
        </div>
        <nav aria-label="Main navigation">
          {["Flights", "Library", "Insights", "Settings"].map((v) => (
            <button
              className={page === v ? "active" : ""}
              key={v}
              onClick={() => {
                setPage(v);
                setSide(true);
              }}
            >
              {v}
            </button>
          ))}
        </nav>
      </header>
      <main inert={modalOpen}>
        <aside
          style={
            {
              width: side ? p.sidebarWidth : 0,
              "--sidebar-width": p.sidebarWidth + "px",
            } as CSSProperties
          }
          className={side ? "sidebar-open" : "sidebar-closed"}
          inert={!side}
          aria-hidden={!side}
          aria-label="Flight management"
        >
          <div className="sidebar-content">
            {page === "Flights" &&
              (draft ? (
                <FlightEditor
                  value={draft}
                  state={state}
                  airportIndex={flightAirportIndex}
                  airlineIndex={airlineIndex}
                  onChange={setDraft}
                  onSave={saveDraft}
                  onCancel={cancelDraft}
                />
              ) : (
                <>
                  <div className="panel-head">
                    <div>
                      <h2>{trash ? "Trash" : "Flights"}</h2>
                    </div>
                    <button className="primary" onClick={add}>
                      + Add flight
                    </button>
                  </div>
                  <label className="year-selector">
                    Time range
                    <select
                      aria-label="Time range"
                      value={activeYear}
                      onChange={(e) => setYear(e.target.value)}
                    >
                      <option value="All">All</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="search-box">
                    <span>⌕</span>
                    <input
                      id="flight-search"
                      aria-label="Search flights"
                      placeholder="Search flights, places, notes…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <kbd>Ctrl F</kbd>
                  </div>
                  <div className="row list-actions">
                    <button
                      onClick={() => setFilters((v) => !v)}
                      className={filters ? "active" : ""}
                    >
                      ☷ Filters
                    </button>
                    <select
                      aria-label="Sort flights"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option>Newest first</option>
                      <option>Oldest first</option>
                      <option>Flight number</option>
                    </select>
                    <button
                      onClick={() => {
                        setTrash((v) => !v);
                        setSelected(null);
                      }}
                    >
                      {trash ? "Flights" : "Trash"}
                    </button>
                  </div>
                  {filters && (
                    <div className="filters">
                      {multiselect(
                        "Status",
                        statuses,
                        setStatuses,
                        ["Recorded", "Planned", "Draft"].map((v) => ({
                          id: v,
                          name: v,
                        })),
                      )}
                      {multiselect("Airline", airlines, setAirlines, [
                        { id: "Unknown", name: "Unknown" },
                        ...state.library.Airlines,
                      ])}
                      {multiselect("Airport", ports, setPorts, [
                        ...new Map(
                          state.flights
                            .flatMap((f) => [f.from, f.to])
                            .map((r) => [r.id, r]),
                        ).values(),
                      ])}
                      {multiselect(
                        "Tags",
                        tags,
                        setTags,
                        state.tags.map((v) => ({ id: v, name: v })),
                      )}
                      <div className="two">
                        <label>
                          From date
                          <input
                            type="date"
                            value={start}
                            onChange={(e) => setStart(e.target.value)}
                          />
                        </label>
                        <label>
                          Through date
                          <input
                            type="date"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                          />
                        </label>
                      </div>
                      <button
                        onClick={() => {
                          setStatuses([]);
                          setAirlines([]);
                          setPorts([]);
                          setTags([]);
                          setStart("");
                          setEnd("");
                          setSearch("");
                          setYear("All");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                  {!trash && (
                    <JourneySummary flights={filtered} units={p.units} />
                  )}
                  {(missing > 0 || hidden > 0) && (
                    <p className="coverage">
                      {missing > 0 ? `${missing} need location` : ""}
                      {missing > 0 && hidden > 0 ? " · " : ""}
                      {hidden > 0 ? `${hidden} hidden` : ""}
                    </p>
                  )}
                  <div className="flight-list">
                    {!filtered.length && (
                      <div className="empty">
                        <div className="empty-mark">✈</div>
                        <h3>
                          {trash
                            ? "Nothing in Trash"
                            : "Your journeys, your way."}
                        </h3>
                        <p>
                          {trash
                            ? "Deleted flights will appear here."
                            : "Start with a place, a memory, or a flight number. You can fill in the rest later."}
                        </p>
                        {!trash && (
                          <button className="primary" onClick={add}>
                            Add your first flight
                          </button>
                        )}
                      </div>
                    )}
                    {filtered.map((f) => (
                      <div
                        key={f.id}
                        className={
                          "flight-card " + (selected === f.id ? "selected" : "")
                        }
                      >
                        <button
                          className="flight-select"
                          aria-pressed={selected === f.id}
                          onClick={() => choose(f.id)}
                        >
                          <div className="flight-top">
                            <span className="logo-tile">
                              {airlineLogo(f.airline) ? (
                                <img
                                  src={airlineLogo(f.airline)}
                                  alt={f.airline?.name}
                                />
                              ) : (
                                <span title="No verified standalone symbol">
                                  ◇
                                </span>
                              )}
                            </span>
                            <span>
                              <strong>{f.number || "Unnamed flight"}</strong>
                              <small>
                                {f.airline?.name || "Unknown airline"}
                              </small>
                            </span>
                            <span className="badge">{f.status}</span>
                          </div>
                          <div className="route-row">
                            <strong>
                              {f.from.code || f.from.name || "Unknown"}
                            </strong>
                            <span>→</span>
                            <strong>
                              {f.to.code || f.to.name || "Unknown"}
                            </strong>
                          </div>
                          <div className="flight-meta">
                            <span>{date(f)}</span>
                            <span>
                              {f.aircraft?.name || "Unknown aircraft"}
                            </span>
                          </div>
                          <div className="flight-meta">
                            <span>
                              {hasLocation(f.from) && hasLocation(f.to)
                                ? f.visible
                                  ? "Route illustration"
                                  : "Hidden from map"
                                : "Needs location"}
                            </span>
                            <span>
                              {recordedMeters(f) === null
                                ? "Unknown distance"
                                : (
                                    recordedMeters(f)! /
                                    (p.units === "km" ? 1000 : 1609.344)
                                  ).toLocaleString("en-US", {
                                    maximumFractionDigits: 1,
                                  }) +
                                  " " +
                                  p.units}
                              {f.distance !== undefined
                                ? " · Manual"
                                : " · Estimate"}
                            </span>
                          </div>
                        </button>
                        {selected === f.id && (
                          <div className="flight-detail">
                            <p>
                              {f.from.name} → {f.to.name}
                            </p>
                            {[f.from, f.to].some(
                              (r) =>
                                r.locationKind === "approximate" ||
                                !hasLocation(r),
                            ) && (
                              <p className="location-status">
                                {locationLabel(f.from)} → {locationLabel(f.to)}
                              </p>
                            )}
                            <p>
                              {f.allianceLogo && (
                                <img
                                  className="alliance-logo"
                                  src={f.allianceLogo}
                                  alt={f.alliance + " logo"}
                                />
                              )}
                              Alliance: {f.alliance || "Unknown"} ·{" "}
                              {f.duration !== undefined
                                ? "Manual duration: " + f.duration + " min"
                                : duration(f) !== null
                                  ? "Calculated duration: " +
                                    duration(f) +
                                    " min"
                                  : "Duration unavailable / time needs review"}
                            </p>
                            <p>
                              {f.departure.time
                                ? moment(f.departure.time, "HH:mm").format(
                                    p.clock === "12h" ? "h:mm A" : "HH:mm",
                                  ) +
                                  " " +
                                  f.departure.zone
                                : "Departure time unknown"}
                            </p>
                            <p className="notes">{f.notes}</p>
                            {f.tags.length > 0 && (
                              <p>
                                {f.tags.map((t) => (
                                  <span className="badge" key={t}>
                                    {t}
                                  </span>
                                ))}
                              </p>
                            )}
                            {Object.entries(f.fields).map(([id, val]) => (
                              <p key={id}>
                                {state.fields.find((v) => v.id === id)?.label ||
                                  "Archived field"}
                                : {val}
                              </p>
                            ))}
                            <div className="row wrap">
                              {!trash ? (
                                <>
                                  <button onClick={() => editFlight(f)}>
                                    Edit flight
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const copy = {
                                        ...structuredClone(f),
                                        id: crypto.randomUUID(),
                                        created: new Date().toISOString(),
                                      };
                                      if (
                                        await commit((latest) => ({
                                          ...latest,
                                          flights: [...latest.flights, copy],
                                        }))
                                      )
                                        choose(copy.id);
                                    }}
                                  >
                                    Duplicate
                                  </button>
                                  <button
                                    onClick={() =>
                                      commit((latest) => ({
                                        ...latest,
                                        flights: latest.flights.map((v) =>
                                          v.id === f.id
                                            ? {
                                                ...v,
                                                deleted:
                                                  new Date().toISOString(),
                                              }
                                            : v,
                                        ),
                                      }))
                                    }
                                  >
                                    Move to Trash
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      commit((latest) => ({
                                        ...latest,
                                        flights: latest.flights.map((v) =>
                                          v.id === f.id
                                            ? { ...v, deleted: undefined }
                                            : v,
                                        ),
                                      }))
                                    }
                                  >
                                    Restore flight
                                  </button>
                                  <button
                                    className="danger"
                                    onClick={() =>
                                      setConfirm({
                                        title:
                                          "Permanently delete this flight?",
                                        body: "This cannot be undone. Export a backup if you need to keep it.",
                                        action: async () => {
                                          await commit((latest) => ({
                                            ...latest,
                                            flights: latest.flights.filter(
                                              (v) => v.id !== f.id,
                                            ),
                                          }));
                                          setConfirm(null);
                                        },
                                      })
                                    }
                                  >
                                    Delete permanently
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ))}
            {page === "Library" && (
              <Library
                airlineIndex={airlineIndex}
                airportIndex={airportIndex}
                state={state}
                onCommit={commit}
                onNotice={setNotice}
              />
            )}{" "}
            {page === "Settings" && (
              <Settings
                state={state}
                path={path}
                onCommit={commit}
                onBackup={exportBackup}
                onImport={importBackup}
                onCSV={() =>
                  exportFile(
                    "AirJourney-flights.csv",
                    new TextEncoder().encode(
                      csv(state.flights.filter((f) => !f.deleted)),
                    ),
                  )
                }
                onNotice={setNotice}
              />
            )}{" "}
            {page === "Insights" && (
              <div className="panel insights">
                <h2>Insights</h2>
                <p className="muted">{activeYear} · current Flights filters</p>
                <JourneySummary flights={filtered} units={p.units} expanded />
              </div>
            )}
          </div>
        </aside>
        <div
          className={side ? "resizer" : "resizer collapsed"}
          role="separator"
          aria-label="Sidebar width"
          aria-valuenow={p.sidebarWidth}
          aria-hidden={!side}
          tabIndex={side ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              commit((latest) => ({
                ...latest,
                settings: {
                  ...latest.settings,
                  sidebarWidth: Math.min(
                    480,
                    Math.max(
                      300,
                      latest.settings.sidebarWidth +
                        (e.key === "ArrowRight" ? 10 : -10),
                    ),
                  ),
                },
              }));
            }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const target = e.currentTarget;
            const aside = document.querySelector("aside")!;
            aside.classList.add("resizing");
            let width = p.sidebarWidth;
            const move = (evt: PointerEvent) => {
              width = Math.min(480, Math.max(300, evt.clientX));
              aside.style.width = width + "px";
              aside.style.setProperty("--sidebar-width", width + "px");
            };
            const up = () => {
              aside.classList.remove("resizing");
              target.removeEventListener("pointermove", move);
              target.removeEventListener("pointerup", up);
              commit((latest) => ({
                ...latest,
                settings: { ...latest.settings, sidebarWidth: width },
              }));
            };
            target.addEventListener("pointermove", move);
            target.addEventListener("pointerup", up);
          }}
        />
        <div className="map-area">
          <Suspense
            fallback={<div className="map-loading">Opening local globe…</div>}
          >
            <Globe
              flights={trash ? [] : filtered}
              selected={selected}
              settings={p}
              onSelect={choose}
              onRepeatMode={(repeatRoutes) =>
                commit((latest) => ({
                  ...latest,
                  settings: { ...latest.settings, repeatRoutes },
                }))
              }
              onHome={(home) =>
                commit((latest) => ({
                  ...latest,
                  settings: { ...latest.settings, home },
                }))
              }
              onView={(lastView) => {
                const s = current.current;
                if (s)
                  commit((latest) => ({
                    ...latest,
                    settings: { ...latest.settings, lastView },
                  }));
              }}
              focusRequest={focusRequest}
            />
          </Suspense>
          <button
            id="sidebar-toggle"
            className="sidebar-toggle"
            onClick={() => setSide((v) => !v)}
          >
            {side ? "◧ Hide sidebar" : "◨ Show sidebar"}
          </button>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {busy && <div className="saving">Saving locally…</div>}
      {confirm && (
        <div className="modal-backdrop">
          <div
            className="modal"
            ref={modalRef}
            role="alertdialog"
            aria-modal="true"
            aria-label={confirm.title}
          >
            <h2>{confirm.title}</h2>
            <p>{confirm.body}</p>
            <button onClick={() => setConfirm(null)}>Keep editing</button>
            <button className="danger" onClick={confirm.action}>
              Confirm
            </button>
          </div>
        </div>
      )}
      {incoming && (
        <div className="modal-backdrop">
          <div
            className="modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Backup preview"
          >
            <h2>Backup import preview</h2>
            <p>
              {incoming.flights.length} flights · {incoming.fields.length}{" "}
              custom fields · {incoming.tags.length} tags · Library, SVG
              snapshots and settings included.
            </p>
            <p>
              {
                incoming.flights.filter((f) =>
                  state.flights.some(
                    (v) =>
                      v.id === f.id && JSON.stringify(v) !== JSON.stringify(f),
                  ),
                ).length
              }{" "}
              conflicting IDs ·{" "}
              {
                incoming.flights.filter((f) =>
                  state.flights.some(
                    (v) =>
                      v.id === f.id && JSON.stringify(v) === JSON.stringify(f),
                  ),
                ).length
              }{" "}
              identical records will be skipped on merge.
            </p>
            <label>
              Conflict policy
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value)}
              >
                <option>Merge · keep conflicts</option>
                <option>Merge · replace conflicts</option>
                <option>Replace entire personal library</option>
              </select>
            </label>
            <p className="muted">
              Merge preserves current settings and field definitions with
              matching IDs. Replace restores the complete backup. A pre-import
              backup export will be offered before commit.
            </p>
            <button onClick={() => setIncoming(null)}>Cancel</button>
            <button className="primary" onClick={applyImport}>
              Confirm import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
