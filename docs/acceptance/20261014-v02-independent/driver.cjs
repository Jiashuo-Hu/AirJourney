const {chromium}=require('C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname,mode=process.argv[2];
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9342');const p=b.contexts()[0].pages().find(x=>x.url().startsWith('airjourney://app'));
 const wait=ms=>p.waitForTimeout(ms),button=async n=>{await p.getByRole('button',{name:n,exact:true}).click();await wait(180)},field=(s,i=0)=>p.locator('label').filter({hasText:new RegExp('^'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).locator('input,select,textarea').nth(i),load=()=>p.evaluate(()=>window.airjourney.load()),shot=n=>p.screenshot({path:path.join(root,'screenshots',n+'.png')});
 const details=async(s,i=0)=>{const n=p.getByText(s,{exact:true}).nth(i);if(await n.evaluate(n=>!n.parentElement.open))await n.click()};
 const picker=side=>p.getByRole('combobox',{name:'Search '+side+' airports'}),list=side=>p.getByRole('listbox',{name:side==='departure'?'Departure airport results':'Arrival airport results'});
 const airport=async(side,q)=>{await picker(side).fill(q);await list(side).getByRole('option').first().click()};
 const result={mode,results:[],observations:[]};const test=async(n,f)=>{const detail=await f();result.results.push({name:n,status:'PASS',detail})};
 try{
 if(mode==='create'){
 await test('native typed identifier and actual version',async()=>{assert.equal(await field('Flight number').inputValue(),'ACC-V02-INDEPENDENT');assert.ok((await p.locator('.brand').innerText()).includes('v0.2'));assert.equal(await p.evaluate(()=>!!window.__ajTestGlobe),false)});
 const countries={VABB:'IN',HKJK:'KE',FAOR:'ZA',OMDB:'AE',BIKF:'IS',SCEL:'CL',SBGR:'BR',NZWN:'NZ',NFFN:'FJ',MMMX:'MX',KJFK:'US',EDDM:'DE',RJTT:'JP',WSSS:'SG'};
 const source=JSON.parse(fs.readFileSync(path.join(root,'logs','airport-data-audit.json'))).samples;
 const runtime=await p.evaluate(async()=>await(await fetch('./data/airports-global.json')).json());
 await test('bundled global data matches local resource and multiple regions search correctly',async()=>{
 assert.equal(runtime.length,86242);const observations=[];
 for(const [code,country] of Object.entries(countries)){
 await picker('departure').fill(code);const options=list('departure').getByRole('option');const n=await options.count();assert.ok(n>0&&n<=30);const text=await options.first().innerText();await options.first().click();await details('Location & codes');
 const name=await field('Airport / place name').inputValue(),lat=Number(await field('Latitude').inputValue()),lon=Number(await field('Longitude').inputValue());const expected=runtime.find(r=>r.ident===code||r.icao===code);assert.equal(expected.countryCode,country);assert.equal(name,expected.name);assert.ok(Math.abs(lat-expected.lat)<0.001);assert.ok(Math.abs(lon-expected.lon)<0.001);assert.equal(await field('Location type').inputValue(),'airport');observations.push({code,country,name,lat,lon,firstResultText:text,count:n});
 }
 fs.writeFileSync(path.join(root,'logs','runtime-search-samples.json'),JSON.stringify(observations,null,2));return {countries:Object.keys(countries).length,rows:runtime.length}});
 await airport('departure','VABB');await airport('arrival','HKJK');await field('Airline').selectOption({label:'Emirates'});await field('Precision').selectOption('Date and time');await field('Date').fill('2026-10-01');await field('Local time').fill('09:00');await field('IANA time zone / UTC offset').fill('+05:30');await field('Precision',1).selectOption('Date and time');await field('Date',1).fill('2026-10-01');await field('Local time',1).fill('13:00');await field('IANA time zone / UTC offset',1).fill('+03:00');await details('More details');await field('Tags (comma separated)').pressSequentially('world, independent, ');await field('Notes').fill('自构造机场组合，用于独立功能验收。');await shot('01-editor-global');await button('Save flight');await wait(4500);await shot('02-global-route-light');
 await test('global airports saved as snapshots without catalog inflation',async()=>{const s=await load(),f=s.flights.find(x=>x.number==='ACC-V02-INDEPENDENT');assert.equal(f.from.countryCode,'IN');assert.equal(f.to.countryCode,'KE');assert.equal(f.from.locationKind,'airport');assert.equal(s.library.Airports.length,15);assert.deepEqual(f.tags,['world','independent']);fs.writeFileSync(path.join(root,'logs','created-state.json'),JSON.stringify(s,null,2))});
 }else if(mode==='edit'){
 await button('Flights');await p.locator('.flight-select').filter({hasText:'ACC-V02-INDEPENDENT'}).click();await button('Edit flight');await field('Flight number').fill('ACC-V02-EDIT');await button('Save flight');await button('Settings');await field('Theme').selectOption('Dark');await button('Flights');await wait(5000);await shot('03-route-dark');fs.writeFileSync(path.join(root,'logs','before-restart.json'),JSON.stringify(await load(),null,2));
 }else if(mode==='restart-check'){
 await test('normal-mode actual restart preserves every object',async()=>assert.deepEqual(await load(),JSON.parse(fs.readFileSync(path.join(root,'logs','before-restart.json')))));await p.locator('.flight-select').filter({hasText:'ACC-V02-EDIT'}).click();await wait(2000);await shot('04-normal-restart');
 }else if(mode==='provenance'){
 await button('Library');await button('Airports');await p.getByLabel('Search Library').fill('VABB');await p.locator('.reference-row').first().click();const oldLat=await field('Latitude').inputValue(),oldSource=await field('Location source').inputValue();await field('Latitude').fill('19.2');await shot('05-library-coordinate-edit');await button('Apply to future selections');await button('Flights');await button('+ Add flight');await airport('departure','VABB');await details('Location & codes');const kind=await field('Location type').inputValue(),source=await field('Location source').inputValue(),lat=await field('Latitude').inputValue();await shot('06-new-choice-stale-provenance');const s=await load(),r=s.library.Airports.find(x=>x.ident==='VABB');result.observations.push({id:'V02-N01',oldLat,oldSource,userEnteredLat:19.2,newChoiceLat:lat,newChoiceKind:kind,newChoiceSource:source,persisted:r,historicalSnapshot:s.flights[0].from});await button('Cancel');await button('Confirm');
 }else if(mode==='ui-bugs'){
 await button('Library');await button('Airports');await button('+ Add new');await field('Name').fill('Keyboard custom coordinates test');await field('Latitude').fill('1');await field('Longitude').fill('2');const beforeType=await field('Location type').inputValue();await button('Apply to future selections');await p.getByLabel('Search Library').fill('Keyboard custom coordinates test');const row=await p.locator('.reference-row').first().innerText();result.observations.push({id:'V02-N01-related',beforeType,resultText:row,persisted:(await load()).library.Airports.find(x=>x.name==='Keyboard custom coordinates test')});await shot('07-new-manual-labeled-airport');
 // Picker Escape must close choices without opening discard modal.
 await button('Flights');await button('+ Add flight');await field('Flight number').fill('ESCAPE-TEST');await picker('departure').fill('never-match-acceptance-xyz');await picker('departure').press('Escape');await test('no-match and Escape preserve draft',async()=>{assert.equal(await p.locator('.modal').count(),0);assert.equal(await field('Flight number').inputValue(),'ESCAPE-TEST')});await button('Cancel');await button('Confirm');
 }else if(mode==='import'){
 await button('Library');await button('Airports');await button('Import');
 }else if(mode==='confirm-library'){
 await shot('08-native-library-preview');await button('Airlines');await button('Confirm import');await test('native airport import stays in bound category',async()=>{const s=await load();assert.ok(s.library.Airports.some(x=>x.id==='accept-approx'));assert.ok(!s.library.Airlines.some(x=>x.id==='accept-approx'))});
 }else if(mode==='fixture-flights'){
 await button('Flights');await button('+ Add flight');await field('Flight number').fill('ACC-APPROX');await airport('departure','acceptance-city-approx');await airport('arrival','VABB');await button('Save flight');await wait(4500);await shot('09-approximate-route');await test('approximate provenance stays explicit in saved detail',async()=>{const s=await load(),f=s.flights.find(x=>x.number==='ACC-APPROX');assert.equal(f.from.locationKind,'approximate');assert.ok((await p.locator('.flight-detail').innerText()).includes('Approximate city location'))});
 await button('+ Add flight');await field('Flight number').fill('ACC-UNLOCATED');await airport('departure','acceptance-pending-location');await airport('arrival','HKJK');await button('Save flight');await wait(800);await shot('10-unlocated');await test('unlocated source remains absent in record',async()=>{const f=(await load()).flights.find(x=>x.number==='ACC-UNLOCATED');assert.equal(f.from.lat,undefined);assert.equal(f.from.lon,undefined);assert.equal(f.from.locationKind,'unlocated')});
 await button('+ Add flight');await picker('departure').fill('ACCDUP');const optionText=await list('departure').getByRole('option').allTextContents();await test('custom shared code entries remain distinct',async()=>assert.equal(optionText.filter(x=>x.includes('ACCDUP')).length,2));await shot('11-shared-code');await button('Cancel');await button('Confirm');
 }else if(mode==='backup'){
 await button('Settings');await button('Data & backup');fs.writeFileSync(path.join(root,'logs','backup-state.json'),JSON.stringify(await load(),null,2));await button('Export backup');
 }else if(mode==='fresh-import'){
 await button('Settings');await button('Data & backup');await button('Import backup');
 }else if(mode==='restore'){
 await p.getByLabel('Conflict policy').selectOption('Replace entire personal library');await shot('12-native-backup-preview');await button('Confirm import');
 }else if(mode==='restore-check'){
 await test('native backup restore into fresh independent profile equals every saved object',async()=>assert.deepEqual(await load(),JSON.parse(fs.readFileSync(path.join(root,'logs','backup-state.json')))));await button('Library');await button('Airports');await p.getByLabel('Search Library').fill('BIKF');await test('global read-only catalogue still available after full personal restore',async()=>assert.ok((await p.locator('.reference-row').first().innerText()).includes('Keflav')));await button('Flights');await shot('13-restored');
 }else if(mode==='render-error'){
 const info=await p.evaluate(()=>({errors:[...document.querySelectorAll('.map-error,.cesium-widget-errorPanel')].map(x=>x.innerText),canvas:[...document.querySelectorAll('canvas')].map(x=>({width:x.width,height:x.height,clientWidth:x.clientWidth,clientHeight:x.clientHeight})),dpr:devicePixelRatio}));fs.writeFileSync(path.join(root,'logs','render-error.json'),JSON.stringify(info,null,2));console.log(JSON.stringify(info,null,2));await shot('14-render-stopped');
 }else if(mode==='render-probe'){
 await button('Flights');await p.locator('.flight-select').filter({hasText:'ACC-APPROX'}).click();await wait(5000);await shot('15-restarted-near-route');const info=await p.evaluate(()=>({errors:[...document.querySelectorAll('.map-error,.cesium-widget-errorPanel')].map(x=>x.innerText),canvas:[...document.querySelectorAll('canvas')].map(x=>({width:x.width,height:x.height,clientWidth:x.clientWidth,clientHeight:x.clientHeight}))}));result.observations.push(info);
 }else if(mode==='render-transition'){
 if(await p.locator('.editor').count()){await button('Cancel');await button('Confirm');}
 const tests=[];for(let i=0;i<3;i++){
 await button('Flights');await p.locator('.flight-select').filter({hasText:'ACC-V02-EDIT'}).click();await wait(1300);await p.locator('.flight-select').filter({hasText:'ACC-APPROX'}).click();await wait(2500);
 let errors=await p.locator('.map-error').allTextContents();await shot('16-long-to-short-'+i);tests.push({i,step:'long to short',errors});if(errors.length)break;
 await button('Edit flight');await details('More details');await field('Notes').fill('Repeat near route '+i);await button('Save flight');await wait(3000);errors=await p.locator('.map-error').allTextContents();await shot('17-save-short-'+i);tests.push({i,step:'save short record',errors});if(errors.length)break;
 }
 result.observations=tests;
 }else if(mode==='inspect'){
 console.log((await p.locator('body').innerText()).slice(0,9500));await shot(process.argv[3]||'current');
 }
 }catch(e){result.results.push({name:'stopped',status:'FAIL',error:String(e.stack)});console.error(e);process.exitCode=1;await shot('failure-'+mode).catch(()=>{})}
 fs.writeFileSync(path.join(root,'logs',mode+'-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await b.close();process.exit(process.exitCode||0);
})().catch(e=>{console.error(e);process.exitCode=1});
