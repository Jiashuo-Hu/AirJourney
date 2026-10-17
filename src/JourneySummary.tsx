import type { Flight } from "./types";
import { summarize } from "./journey-summary";
import { useMemo } from "react";
export function JourneySummary({
  flights,
  units,
  expanded = false,
}: {
  flights: Flight[];
  units: "km" | "miles";
  expanded?: boolean;
}) {
  const s = useMemo(() => summarize(flights), [flights]);
  const distance = (
    s.meters / (units === "km" ? 1000 : 1609.344)
  ).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <section
      className="journey-summary"
      aria-label="Personal flight statistics"
    >
      <div className="summary-metrics">
        {[
          [s.completed, "Completed"],
          [distance, units],
          [s.airports, "Airports"],
          [s.airlines, "Airlines"],
        ].map(([value, label]) => (
          <div key={label}>
            <strong data-stat={label}>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="summary-secondary">
        <span>
          {s.planned} planned · {s.drafts} draft
        </span>
        <span title="Completed flights; both directions combined">
          {s.routes[0]
            ? `${s.routes[0].label} · ${s.routes[0].count}×`
            : "No completed routes"}
        </span>
      </div>
      <details className="statistics-policy" open={expanded || undefined}>
        <summary>Counting details</summary>
        <p>
          Current year and Flights filters apply. Recorded = completed; Planned
          is counted separately. Draft and Trash are excluded from completed
          totals. Hidden map routes still count.
        </p>
        <p>
          Airports share saved IDs or airport codes; airlines share saved IDs,
          brand identifiers, or matching name + code. Airline code alone is
          never enough. Return directions count as one route; repeated flights
          each count.
        </p>
        <p>
          Manual distance takes priority (including zero); otherwise geographic
          estimates are used once. {s.estimates} estimates; {s.distanceMissing}{" "}
          completed records without distance. {s.airportRecordsMissing} with
          incomplete airport identities; {s.airlineRecordsMissing} without
          airline identity. Missing identities are omitted; known endpoints
          still count.
        </p>
        {expanded && (
          <>
            <h3>Frequent routes</h3>
            {s.routes.slice(0, 5).map((r, i) => (
              <div className="reference-row" key={r.label + i}>
                <span>{r.label}</span>
                <strong>{r.count}×</strong>
              </div>
            ))}
            <p>
              {s.routesMissing} completed records omitted from route ranking.
            </p>
          </>
        )}
      </details>
    </section>
  );
}
