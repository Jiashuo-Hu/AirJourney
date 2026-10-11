import type { State, Reference } from "./types";
import { defaults } from "./domain";
import logos from "./bundled-logos.json";
import airports from "./data-airports.json";
export const seedLibrary: Record<string, Reference[]> = {
  Airports: airports as Reference[],
  Airlines: [
    ["CA", "Air China", "Star Alliance"],
    ["MU", "China Eastern Airlines", "SkyTeam"],
    ["CZ", "China Southern Airlines", "None"],
    ["BA", "British Airways", "oneworld"],
    ["LH", "Lufthansa", "Star Alliance"],
    ["AF", "Air France", "SkyTeam"],
    ["JL", "Japan Airlines", "oneworld"],
    ["SQ", "Singapore Airlines", "Star Alliance"],
    ["EK", "Emirates", "None"],
    ["UA", "United Airlines", "Star Alliance"],
    ["DL", "Delta Air Lines", "SkyTeam"],
    ["QF", "Qantas", "oneworld"],
  ].map(([code, name, alliance]) => ({
    id: "airline-" + code,
    code,
    name,
    alliance,
    source: "Bundled",
  })),
  Alliances: ["Star Alliance", "SkyTeam", "oneworld"].map((name) => ({
    id: "alliance-" + name,
    name,
    source: "Bundled",
  })),
  Aircraft: [
    "Airbus A320",
    "Airbus A330",
    "Airbus A350-900",
    "Airbus A380",
    "Boeing 737",
    "Boeing 747",
    "Boeing 777",
    "Boeing 787-9",
  ].map((name) => ({
    id: "aircraft-" + name,
    name,
    manufacturer: name.split(" ")[0],
    source: "Bundled",
  })),
};
seedLibrary.Airlines.find((r) => r.code === "LH")!.logo = logos.lufthansa;
seedLibrary.Alliances.find((r) => r.name === "Star Alliance")!.logo =
  logos["star-alliance"];
seedLibrary.Alliances.find((r) => r.name === "oneworld")!.logo = logos.oneworld;
export function initialState(): State {
  return {
    schema: 1,
    flights: [],
    library: structuredClone(seedLibrary),
    fields: [],
    tags: [],
    settings: { ...defaults },
  };
}
