const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {_electron}=require('C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'evidence'),data=path.join(out,'independent-data-'+Date.now());
fs.mkdirSync(data,{recursive:true});
const results=[],errors=[];let app,page;
const write=()=>fs.writeFileSync(path.join(out,'independent-ui.json'),JSON.stringify({results,errors,data:path.relative(root,data),method:'External Playwright Electron driver; installed ASAR unchanged; SMOKE disabled; synthetic isolated profile',physicalOffline:false},null,2));
async function test(name,fn){try{const detail=await fn();results.push({name,status:'PASS',detail});}catch(e){results.push({name,status:'FAIL',error:String(e.stack)});}write();}
const click=t=>page.getByRole('button',{name:t,exact:true}).click();
const label=(t,n=0)=>page.locator('label').filter({hasText:new RegExp('^\\s*'+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).locator('input,select,textarea').nth(n);
async function state(){return page.evaluate(()=>window.airjourney.load());}
async function settle(){await page.waitForTimeout(300);}
async function start(){
 const env={...process.env,AIRJOURNEY_TEST_DIR:data};delete env.AIRJOURNEY_SMOKE;delete env.AIRJOURNEY_BENCHMARK;delete env.ELECTRON_RUN_AS_NODE;delete env.AIRJOURNEY_EVIDENCE;
 app=await _electron.launch({executablePath:path.join(out,'installed-app/AirJourney.exe'),env,timeout:30000});
 page=await app.firstWindow();page.on('pageerror',e=>{errors.push(String(e));write();});
 page.setDefaultTimeout(5000);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());
 await page.getByRole('button',{name:'Flights',exact:true}).waitFor();
}
(async()=>{
 await start();
 await test('Normal installed startup / local globe / isolation',async()=>{
  await page.waitForTimeout(5000);assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.locator('.map-error').count(),0);
  assert.equal(await page.evaluate(()=>typeof require),'undefined');assert.equal(await page.evaluate(()=>!!window.__ajTestGlobe),false);
  await page.screenshot({path:path.join(out,'independent-empty.png')});
  return await app.evaluate(({BrowserWindow})=>({versions:process.versions,preferences:BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),scale:BrowserWindow.getAllWindows()[0].getBounds()}));
 });
 await test('FX02 incomplete personal record via actual form',async()=>{
  await click('+ Add flight');await label('Airport / place name',0).fill('Synthetic Unknown A');await label('Airport / place name',1).fill('Synthetic Unknown B');await label('Notes').fill('合成备注\n=1+1');await click('Save flight');await settle();
  const s=await state();assert.equal(s.flights.length,1);assert.equal(s.flights[0].departure.time,'');assert.equal(s.flights[0].from.lat,undefined);assert.match(await page.locator('.flight-list').innerText(),/Needs location/);return s.flights[0];
 });
 await test('FX03 exact 12-hour input / zero coordinates / manual miles',async()=>{
  await click('+ Add flight');await label('Flight number').fill('AJ-INDEPENDENT-03');await label('Choose local airport',0).selectOption('airport-PEK');await label('Choose local airport',1).selectOption('airport-LHR');
  await label('Date',0).fill('2024-01-15');await label('Local time',0).fill('10:00');await label('Date',1).fill('2024-01-15');await label('Local time',1).fill('14:00');await label('Recorded distance').fill('1000');await label('Original unit').selectOption('miles');await click('Save flight');await settle();
  assert.match(await page.locator('.flight-detail').innerText(),/Calculated duration: 720 min/);return(await state()).flights.at(-1);
 });
 await test('Duplicate generates distinct UUID / persistence reload',async()=>{
  await click('Duplicate');await settle();let s=await state();assert.equal(s.flights.length,3);assert.equal(new Set(s.flights.map(f=>f.id)).size,3);await page.reload();await click('Flights');await settle();assert.deepEqual(await state(),s);return{records:s.flights.length};
 });
 await test('Sidebar keyboard hide restore preserves draft',async()=>{
  await click('+ Add flight');await label('Flight number').fill('DRAFT-KEEP');await page.keyboard.press('Control+b');await page.keyboard.press('Control+b');assert.equal(await label('Flight number').inputValue(),'DRAFT-KEEP');await click('Cancel');await click('Confirm');await settle();
 });
 await test('Airport/airline/alliance/aircraft custom create',async()=>{
  await click('Library');
  for(const kind of ['Airports','Airlines','Alliances','Aircraft']){await click(kind);await click('+ Add new');await label('Name').fill('Independent '+kind);if(kind==='Airports'){await label('Latitude').fill('0');await label('Longitude').fill('0');}await click('Apply to future selections');await settle();}
  const s=await state();for(const kind of ['Airports','Airlines','Alliances','Aircraft'])assert.ok(s.library[kind].some(r=>r.name==='Independent '+kind));return{categories:4};
 });
 await test('Personal field four types / type change preserves old values',async()=>{
  await click('Settings');await click('Personal fields');for(const type of ['text','number','date','select']){await click('+ Add field');await label('Label').fill('Independent '+type);await label('Type').selectOption(type);if(type==='select')await label('Options (comma separated)').fill('A,B');await click('Save field');await settle();}
  const before=await state();assert.equal(before.fields.length,4);await click('Independent text · text');await label('Type').selectOption('number');await click('Save field');await settle();const after=await state();assert.equal(after.fields.length,5);assert.equal(after.fields.find(f=>f.id===before.fields[0].id).hidden,true);return{before:4,after:5};
 });
 await test('Appearance/Map reset preserves data; hidden boundaries unavailable',async()=>{
  await click('Appearance');await label('Theme').selectOption('Dark');await settle();assert.equal(await page.locator('html').getAttribute('data-theme'),'Dark');await label('Distance unit').selectOption('miles');await settle();await click('Map');const txt=await page.locator('.settings').innerText();assert.match(txt,/boundar/i);await page.screenshot({path:path.join(out,'independent-map-settings.png')});const before=await state();await click('Reset map style');await settle();assert.deepEqual((await state()).flights,before.flights);return{settings:before.settings,text:txt};
 });
 await test('Settings rapid independent updates must both persist',async()=>{
  await click('Appearance');
  const before=await state();const desiredTheme=before.settings.theme==='Light'?'Dark':'Light';const desiredUnit=before.settings.units==='km'?'miles':'km';
  await page.evaluate(({desiredTheme,desiredUnit})=>{for(const [name,value]of[['Theme',desiredTheme],['Distance unit',desiredUnit]]){const l=[...document.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(name));const e=l.querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('change',{bubbles:true}));}},{desiredTheme,desiredUnit});
  await page.waitForTimeout(1200);const after=await state();assert.equal(after.settings.theme,desiredTheme);assert.equal(after.settings.units,desiredUnit);return{desiredTheme,desiredUnit,actual:after.settings};
 });
 await test('Reset view covers filtered routes rather than stored home',async()=>{
  await click('Flights');await page.locator('.flight-select').filter({hasText:'AJ-INDEPENDENT-03'}).first().click();await page.waitForTimeout(1500);
  await click('↺ Reset view');await page.waitForTimeout(1300);await page.screenshot({path:path.join(out,'reset-view.png')});
  return{codeReview:'Globe.reset uses settings.home for every dataset; no flight bounding fit',result:'Requirement mismatch tracked DEF-006'};
 });
 await test('Two accepted duplicate actions must retain two new records',async()=>{
  await click('Flights');await page.locator('.flight-select').filter({hasText:'AJ-INDEPENDENT-03'}).first().click();const before=await state();
  await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Duplicate');b.click();b.click();});await page.waitForTimeout(1200);const after=await state();assert.equal(after.flights.length,before.flights.length+2,'Two accepted creates collapse into one stale full-state save');return{before:before.flights.length,after:after.flights.length};
 });
 await test('Form invalid latitude rejected without writing',async()=>{
  await click('+ Add flight');await label('Airport / place name',0).fill('Bad latitude');await label('Airport / place name',1).fill('Destination');await label('Latitude',0).fill('91');await label('Longitude',0).fill('0');const before=await state();await click('Save flight');await settle();assert.deepEqual(await state(),before);assert.equal(await label('Latitude',0).inputValue(),'91');await click('Cancel');await click('Confirm');return{rejected:true};
 });
 await test('IPC malformed state must be rejected at privileged boundary',async()=>{
  const original=await state();let accepted=false;
  try{accepted=await page.evaluate(()=>window.airjourney.save(JSON.stringify({schema:1,flights:[]})));}catch{}
  const actual=await state();await page.evaluate(s=>window.airjourney.save(JSON.stringify(s)),original);assert.equal(accepted,false,'Privileged main process accepted state missing library/settings/fields/tags');return{accepted,actual};
 });
 await page.screenshot({path:path.join(out,'independent-final.png')});
 write();await app.close();
})().catch(async e=>{errors.push(String(e.stack));write();if(app)await app.close();process.exitCode=1;});
