// Integration harness for this application only. It never modifies a real user profile.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
module.exports = async (win, data) => {
  const backupName =
    "AirJourney-v" +
    require("electron").app.getVersion().split(".").slice(0, 2).join(".") +
    ".airjourney";
  const results = [],
    errors = [];
  win.webContents.on("console-message", (_e, level, msg) => {
    if (level >= 2) errors.push(msg);
  });
  const js = (code) => win.webContents.executeJavaScript(code);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = async (text) => {
    await js(
      `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Button missing: '+${JSON.stringify(text)});b.click();})()`,
    );
    await wait(250);
  };
  const field = async (label, value) => {
    if (label === "Airline") {
      await js(
        `(()=>{const n=document.querySelector('.airline-picker input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,${JSON.stringify(value.replace(/^airline-/, ""))});n.dispatchEvent(new Event('input',{bubbles:true}));n.focus();})()`,
      );
      await wait(300);
      await js(
        `(()=>{const b=[...document.querySelectorAll('.airline-options [role=option]')].find(b=>b.querySelector('strong').textContent.trim()==='LH · Lufthansa');if(!b)throw Error('Lufthansa choice missing');b.click();})()`,
      );
      await wait(200);
      return;
    }
    await js(
      `(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.firstChild?.textContent.trim()===${JSON.stringify(label)});const n=l?.querySelector('input,select,textarea');if(!n)throw Error('Field missing: '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(n instanceof HTMLSelectElement?HTMLSelectElement.prototype:n instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(n,${JSON.stringify(value)});n.dispatchEvent(new Event(n instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`,
    );
    await wait(200);
  };
  const snapshot = async (name) =>
    fs.writeFileSync(
      path.join(data, name + ".png"),
      (await win.webContents.capturePage()).toPNG(),
    );
  if (!process.env.AIRJOURNEY_BACKGROUND_TEST) win.show();
  await wait(9000);
  assert.ok(
    (await js("document.body.innerText")).includes("Your journeys, your way."),
  );
  assert.equal(await js('document.querySelectorAll("canvas").length'), 1);
  assert.equal(await js('document.querySelectorAll(".map-error").length'), 0);
  const imagery = await js(
    "({layers:__ajTestGlobe.imageryLayers.length,tilesLoaded:__ajTestGlobe.scene.globe.tilesLoaded})",
  );
  assert.equal(imagery.layers, 1);
  results.push({
    test: "local globe / empty cache / production protocol",
    status: "PASS",
    imagery,
  });
  await snapshot("01-empty");
  await click("+ Add flight");
  await field("Flight number", "AJ-TEST-999");
  for (const [i, code] of ["PEK", "LHR"].entries()) {
    await js(
      `(()=>{const n=document.querySelectorAll('.airport-picker input')[${i}];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,${JSON.stringify(code)});n.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await wait(200);
    await js(
      `document.querySelectorAll('.airport-picker')[${i}].querySelector('[role=option]').click()`,
    );
    await wait(200);
  }
  await wait(300);
  await field("Airline", "airline-LH");
  await click("Save flight");
  await wait(1000);
  const first = await js("window.airjourney.load()");
  assert.equal(first.flights.length, 1);
  assert.equal(first.flights[0].number, "AJ-TEST-999");
  assert.equal(first.flights[0].departure.date, "");
  assert.equal(first.flights[0].from.code, "PEK");
  assert.ok(first.flights[0].airline.logo.startsWith("data:"));
  assert.ok((await js("document.body.innerText")).includes("mapped"));
  await wait(4000);
  results.push({
    test: "manual synthetic / unknown time / mapped / local SVG / SQLite commit",
    status: "PASS",
    camera: await js(
      "({height:__ajTestGlobe.camera.positionCartographic.height,entities:__ajTestGlobe.entities.values.length})",
    ),
  });
  await snapshot("02-flight");
  await click("Duplicate");
  let loaded = await js("window.airjourney.load()");
  assert.equal(loaded.flights.length, 2);
  assert.notEqual(loaded.flights[0].id, loaded.flights[1].id);
  results.push({ test: "duplicate new UUID", status: "PASS" });
  await click("Edit flight");
  await field("Flight number", "Draft preserved");
  await click("◧ Hide sidebar");
  await click("◨ Show sidebar");
  assert.equal(
    await js('document.querySelector(".editor input").value'),
    "Draft preserved",
  );
  await js(
    'document.dispatchEvent(new KeyboardEvent("keydown",{key:"n",ctrlKey:true,bubbles:true}))',
  );
  await wait(150);
  assert.equal(
    await js(
      'document.querySelector("[role=alertdialog]").getAttribute("aria-label")',
    ),
    "Start a new flight?",
  );
  assert.equal(await js('document.querySelector("main").inert'), true);
  await js(
    'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Tab",shiftKey:true,bubbles:true}))',
  );
  assert.equal(await js("document.activeElement.textContent"), "Confirm");
  await js(
    'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))',
  );
  await wait(150);
  assert.equal(
    await js('document.querySelector(".editor input").value'),
    "Draft preserved",
  );
  await click("Cancel");
  await click("Confirm");
  results.push({
    test: "sidebar / new-flight shortcut preserve draft; modal focus trap / Escape",
    status: "PASS",
  });
  await click("Move to Trash");
  loaded = await js("window.airjourney.load()");
  assert.equal(loaded.flights.filter((f) => f.deleted).length, 1);
  await click("Trash");
  await js('document.querySelector(".flight-select").click()');
  await wait(300);
  await click("Restore flight");
  loaded = await js("window.airjourney.load()");
  assert.equal(loaded.flights.filter((f) => f.deleted).length, 0);
  results.push({ test: "trash / restore preserves record", status: "PASS" });
  await click("Settings");
  await field("Theme", "Dark");
  await wait(400);
  assert.equal(await js("document.documentElement.dataset.theme"), "Dark");
  await snapshot("03-dark");
  await field("Theme", "Light");
  await click("Library");
  await click("Airlines");
  await js(
    `(()=>{const n=document.querySelector('[aria-label="Search Library"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'Lufthansa');n.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
  await wait(300);
  assert.ok((await js("document.body.innerText")).includes("Lufthansa"));
  await snapshot("04-library");
  const before = await js("window.airjourney.load()");
  await win.webContents.reload();
  await wait(3500);
  const after = await js("window.airjourney.load()");
  assert.deepEqual(before, after);
  assert.equal(await js('document.querySelectorAll("canvas").length'), 1);
  results.push({
    test: "reload / SQLite and preferences persistence / single viewer",
    status: "PASS",
  });
  fs.mkdirSync(path.join(data, "airjourney.sqlite.pending"));
  const failedSave = await js(
    `window.airjourney.load().then(async s=>{s.tags.push('must-not-save');try{await window.airjourney.save(JSON.stringify(s));return false;}catch{return true;}})`,
  );
  assert.equal(failedSave, true);
  assert.deepEqual(await js("window.airjourney.load()"), before);
  await js('document.querySelector(".flight-select").click()');
  await wait(250);
  await click("Edit flight");
  await field("Flight number", "UNSAVED-WRITE-FAILURE");
  await click("Save flight");
  assert.equal(await js('document.querySelectorAll(".editor").length'), 1);
  assert.equal(
    await js('document.querySelector(".editor input").value'),
    "UNSAVED-WRITE-FAILURE",
  );
  assert.deepEqual(await js("window.airjourney.load()"), before);
  await click("Cancel");
  await click("Confirm");
  fs.rmdirSync(path.join(data, "airjourney.sqlite.pending"));
  results.push({
    test: "simulated write failure preserves database",
    status: "PASS",
  });
  await click("Settings");
  await click("Data & backup");
  await click("Export backup");
  await wait(300);
  assert.ok(fs.existsSync(path.join(data, backupName)));
  fs.copyFileSync(
    path.join(data, backupName),
    path.join(data, "import-next.bin"),
  );
  await click("Import backup");
  assert.ok(
    (await js("document.body.innerText")).includes("Backup import preview"),
  );
  await field("Conflict policy", "Replace entire personal library");
  await click("Confirm import");
  await wait(600);
  assert.deepEqual(await js("window.airjourney.load()"), before);
  results.push({
    test: "actual UI portable backup / preview / full restore with SVG",
    status: "PASS",
  });
  await click("Library");
  await click("Airports");
  await js(
    `[...document.querySelectorAll('.reference-row')].find(n=>n.textContent.includes('LHR')).click()`,
  );
  await wait(250);
  assert.equal(
    await js(
      'document.querySelectorAll(".library-edit input[type=number]").length',
    ),
    0,
  );
  assert.equal(await js('document.querySelectorAll(".airport-reference-detail input,.airport-reference-detail select").length'),0);
  assert.ok((await js('document.querySelector(".airport-reference-detail").textContent')).includes('Read-only'));
  assert.deepEqual((await js("window.airjourney.load()")).library.Airports,before.library.Airports);
  results.push({test:'airport catalogue read-only; original metadata and snapshots preserved',status:'PASS'});
  await click('Back to airports');await click('Airlines');
  await js(`(()=>{const n=document.querySelector('[aria-label="Search Library"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'Lufthansa');n.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait(300);
  await js(`[...document.querySelectorAll('.reference-row')].find(n=>n.querySelector('strong')?.textContent==='Lufthansa').click()`);
  await field('Name','Lufthansa · explicit metadata');await click('Review changes to existing flights');await click('Confirm snapshot changes');await wait(300);
  assert.equal((await js("window.airjourney.load()")).flights[0].airline.name,'Lufthansa · explicit metadata');
  results.push({test:'non-airport reference preview / apply remains editable',status:'PASS'});
  await click("Flights");
  await js('document.querySelector(".flight-select").click()');
  await wait(4000);
  await snapshot("06-routes");
  const h = await js("__ajTestGlobe.camera.positionCartographic.height");
  await click("+");
  await wait(400);
  assert.ok((await js("__ajTestGlobe.camera.positionCartographic.height")) < h);
  await click("↺ Reset view");
  await wait(1500);
  results.push({
    test: "globe zoom / reset / aggregated entities",
    status: "PASS",
  });
  const mapPick = await js(
    `(()=>{const v=__ajTestGlobe,e=v.entities.values.find(e=>e.id.startsWith('point-')&&e.properties.flightIds.getValue().length===2),position=e.position.getValue(v.clock.currentTime),pixel=v.scene.cartesianToCanvasCoordinates(position),picked=v.scene.pick(pixel);v.screenSpaceEventHandler.getInputAction(2)({position:pixel});return picked?.id?.properties?.flightIds?.getValue();})()`,
  );
  assert.equal(mapPick?.length, 2);
  for (let poll = 0; poll < 40; poll++) {
    if (await js('document.querySelectorAll(".route-popover>button").length === 2')) break;
    await wait(100);
  }
  assert.equal(
    await js('document.querySelectorAll(".route-popover>button").length'),
    2,
  );
  await js(
    'document.querySelector(".flight-card.selected .flight-select")?.click()',
  );
  await wait(300);
  await js('document.querySelectorAll(".route-popover>button")[1].click()');
  await wait(300);
  assert.ok(
    await js(
      `Boolean(__ajTestGlobe.entities.getById(${JSON.stringify("route-" + mapPick[1])}))`,
    ),
  );
  results.push({
    test: "actual globe point picking / aggregate list / flight selection / direction representative",
    status: "PASS",
  });
  win.setSize(1024, 720);
  await wait(500);
  await snapshot("05-minimum");
  const overflow = await js("document.documentElement.scrollWidth>innerWidth");
  assert.equal(overflow, false);
  results.push({ test: "1024x720 no document overflow", status: "PASS" });
  await click("Library");
  await click("Airports");
  assert.equal(
    await js(
      "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='+ Add new')",
    ),
    false,
  );
  assert.equal(
    await js(
      "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Pick on globe')",
    ),
    false,
  );
  results.push({
    test: "Airport catalogue has no custom-location or globe-pick entry point",
    status: "PASS",
  });
  await click("Flights");
  await click("+ Add flight");
  await js("document.querySelector('.editor details summary').click()");
  await field("Status", "Draft");
  await click("Save flight");
  await wait(300);
  const unknown = (await js("window.airjourney.load()")).flights.find(
    (f) => f.status === "Draft" && !f.number && !f.from.name && !f.to.name,
  );
  assert.ok(unknown);
  assert.equal(unknown.from.lat, undefined);
  assert.ok((await js("document.body.innerText")).includes("Needs location"));
  results.push({
    test: "Unassigned Draft can be saved without inventing names or coordinates",
    status: "PASS",
  });
  assert.equal(
    await js(
      `(()=>{try{eval('1+1');return 'allowed'}catch{return 'blocked'}})()`,
    ),
    "blocked",
  );
  results.push({
    test: "JavaScript eval remains blocked under narrow WASM CSP",
    status: "PASS",
  });
  fs.writeFileSync(
    path.join(data, "smoke-results.json"),
    JSON.stringify(
      {
        results,
        errors,
        versions: process.versions,
        gpu: await require("electron").app.getGPUInfo("basic"),
        metrics: require("electron").app.getAppMetrics(),
        physicalNetworkDisconnected: false,
      },
      null,
      2,
    ),
  );
};
