import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/seed";
import { assertAirportLibraryReadOnly } from "../src/location-lock";
import { airportMarkerPixels } from "../src/map-style";
import { duration, resolveTime, withPrecision } from "../src/domain";
import { readFileSync } from "node:fs";
import { brands, airlineLogo, brandFor } from "../src/airlines";

test("major-carrier regions have portable marks and exact name/code catalogue options without rebranding old Tway", () => {
  const coverage=JSON.parse(readFileSync('public/data/airline-sources/v04-coverage.json','utf8'));
  const catalogue=JSON.parse(readFileSync('public/data/airlines-global.json','utf8'));
  for(const [region,min]of Object.entries({Europe:30,Asia:45,Americas:24,Oceania:8,Africa:6}))assert.ok(coverage.regions[region].length>=min);
  for(const b of Object.values(brands))assert.ok(catalogue.some((r:any)=>r.code===b.code&&[b.name,...(b.names||[])].some(n=>n.toLowerCase()===r.name.toLowerCase())),b.name);
  assert.equal(brandFor({id:'old',name:'Tway Airlines',code:'TW'}),undefined);
  const custom={id:'custom',name:'Air France',code:'AF',logo:'personal-snapshot'};
  assert.equal(airlineLogo(custom),'personal-snapshot');
  assert.ok(coverage.missing.some((r:any)=>r.key==='spring'&&r.reason.includes('bitmap')));
});

test("all airport information is read-only, including name, codes, zone and visibility", () => {
  const s = initialState();
  for (const [key, value] of Object.entries({name:"Changed",code:"XX",city:"Elsewhere",region:"Other",zone:"UTC",hidden:true,lat:0,aliases:"Other"})) {
    const n=structuredClone(s); Object.assign(n.library.Airports[0],{[key]:value});
    assert.throws(()=>assertAirportLibraryReadOnly(s,n),/read-only/);
  }
  const added=structuredClone(s);added.library.Airports.push({id:"custom",name:"New"});
  assert.throws(()=>assertAirportLibraryReadOnly(s,added),/read-only/);
  const removed=structuredClone(s);removed.library.Airports.pop();
  assert.throws(()=>assertAirportLibraryReadOnly(s,removed),/read-only/);
});
test("separated symbols take precedence; a missing symbol retains the complete wordmark and custom SVG",()=>{
  for(const b of Object.values(brands)){
    const r={id:'test',name:b.name,code:b.code};
    assert.equal(airlineLogo(r),b.symbol||b.full);
    assert.equal(airlineLogo({...r,logo:b.full}),b.symbol||b.full);
    assert.equal(airlineLogo({...r,logo:b.full,logoPolicy:'custom' as const}),b.full);
  }
  for(const key of ['norwegian','hk-express','cebu','bangkok','gulf','air-niugini','kenya','lot'])assert.ok(brands[key].symbol,key);
  assert.equal(airlineLogo({id:'finnair',name:'Finnair',code:'AY'}),brands.finnair.full);
});
test("non-airport edits and preserved historical airport references remain valid", () => {
  const s=initialState();s.library.Airports.push({id:"legacy",name:"Historic private entry",lat:1,lon:2});
  const n=structuredClone(s);n.library.Airlines[0].name="Personal airline";n.settings.theme="Dark";
  assert.doesNotThrow(()=>assertAirportLibraryReadOnly(s,n));assert.equal(n.library.Airports.at(-1)?.name,"Historic private entry");
});
test("airport marker covers the widest route endpoint while sizing stays bounded", () => {
  for (const width of [1,4,8,16]) {
    const size=airportMarkerPixels(7,width,false);
    assert.ok(size>width);assert.ok(size*.85>=width);assert.ok(size<=22);
    assert.ok(airportMarkerPixels(7,width,true)>=size);
  }
  assert.equal(airportMarkerPixels(100,16,true),22);
});
test("grouped local times retain independent zones and an independently known 12-hour duration", () => {
  const f:any={departure:{date:"2024-01-15",time:"10:00",zone:"+08:00",precision:"Date and time"},arrival:{date:"2024-01-15",time:"14:00",zone:"+00:00",precision:"Date and time"}};
  assert.equal(resolveTime(f.departure).utc,"2024-01-15T02:00:00.000Z");
  assert.equal(resolveTime(f.arrival).utc,"2024-01-15T14:00:00.000Z");
  assert.equal(duration(f),720);
  f.arrival=withPrecision(f.arrival,"Date only");assert.equal(f.arrival.time,"");assert.equal(duration(f),null);
  f.departure=withPrecision(f.departure,"Unknown");assert.equal(f.departure.date,"");assert.equal(f.arrival.date,"2024-01-15");
});
