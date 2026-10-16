import type { Place, Reference, State } from "./types";
// Airport reference data is read-only in v0.4. Old personal references survive
// load/backup restore; ordinary mutations cannot edit, hide, add or delete them.
export function assertAirportLibraryReadOnly(before: State, after: State) {
  if (JSON.stringify(before.library.Airports) !== JSON.stringify(after.library.Airports))
    throw Error("Airport information is read-only. Choose an existing airport.");
}
export const locationFields = [
  "lat",
  "lon",
  "locationKind",
  "locationSource",
] as const;
export const sameCoordinates = (a: Place, b: Place) =>
  a.lat === b.lat && a.lon === b.lon;
export function lockedReference(edit: Reference, original: Reference) {
  return {
    ...edit,
    ...Object.fromEntries(locationFields.map((k) => [k, original[k]])),
  } as Reference;
}
export function assertLocationsLocked(
  before: State,
  after: State,
  base: Map<string, Reference>,
) {
  const known = new Map(before.library.Airports.map((p) => [p.id, p]));
  const places = [
    ...before.flights.flatMap((f) => [f.from, f.to]),
    ...known.values(),
  ];
  const coordinates = new Set(
    places.map((p) => JSON.stringify([p.id, p.lat ?? null, p.lon ?? null])),
  );
  for (const p of after.library.Airports) {
    const original = known.get(p.id) || base.get(p.id);
    if (!original || !sameCoordinates(p, original))
      throw Error(
        "Airport locations are locked. Choose an existing airport; new or changed coordinates cannot be saved.",
      );
  }
  for (const f of after.flights)
    for (const p of [f.from, f.to]) {
      if (!p.name && p.lat === undefined && p.lon === undefined) continue;
      if (
        !coordinates.has(
          JSON.stringify([p.id, p.lat ?? null, p.lon ?? null]),
        ) &&
        !(base.has(p.id) && sameCoordinates(p, base.get(p.id)!))
      )
        throw Error(
          "Choose a supplied airport. Manual airport locations are not supported.",
        );
    }
}
