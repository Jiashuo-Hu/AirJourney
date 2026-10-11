const {chromium}=require('C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname,mode=process.argv[2];
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9341');const p=b.contexts()[0].pages().find(x=>x.url().startsWith('airjourney://app'));
 const wait=ms=>p.waitForTimeout(ms),button=async n=>{await p.getByRole('button',{name:n,exact:true}).click();await wait(160)},field=(s,i=0)=>p.locator('label').filter({hasText:new RegExp('^'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).locator('input,select,textarea').nth(i),load=()=>p.evaluate(()=>window.airjourney.load()),shot=n=>p.screenshot({path:path.join(root,'screenshots',n+'.png')});
 const result={mode,results:[],observations:[]};const test=async(n,f)=>{await f();result.results.push({name:n,status:'PASS'})};
 try{
 if(mode==='create'){
 await test('actual native typed number retained',async()=>assert.equal(await field('Flight number').inputValue(),'V01-INDEPENDENT'));
 await field('Choose local airport').selectOption('airport-PVG');await field('Choose local airport',1).selectOption('airport-HND');await field('Airline').selectOption({label:'Japan Airlines'});
 await field('Precision').selectOption('Date and time');await field('Date').fill('2026-09-20');await field('Local time').fill('09:30');await field('IANA time zone / UTC offset').fill('+08:00');
 await field('Precision',1).selectOption('Date and time');await field('Date',1).fill('2026-09-20');await field('Local time',1).fill('13:30');await field('IANA time zone / UTC offset',1).fill('+09:00');
 const tags=field('Tags (comma separated)');await tags.pressSequentially('one, two, ');await tags.type('中文');await field('Notes').fill('独立构造航班；用于验收，不对应真实航班。');await shot('01-editor-light');await button('Save flight');await wait(1000);
 await test('normal local airport airline times tags persist',async()=>{const s=await load(),f=s.flights.find(f=>f.number==='V01-INDEPENDENT');assert.equal(f.airline.name,'Japan Airlines');assert.deepEqual(f.tags,['one','two','中文']);assert.equal(f.from.code,'PVG');assert.equal(f.to.code,'HND');fs.writeFileSync(path.join(root,'logs','manual-created.json'),JSON.stringify(s,null,2))});
 await shot('02-route-light');
 }else if(mode==='state'){
 fs.writeFileSync(path.join(root,'logs',process.argv[3]||'native-state.json'),JSON.stringify(await p.evaluate(()=>({state:window.airjourney.load(),height:__ajTestGlobe.camera.positionCartographic.height})),null,2));
 }else if(mode==='camera'){
 const info=await p.evaluate(()=>({height:__ajTestGlobe.camera.positionCartographic.height,canvas:{width:__ajTestGlobe.canvas.width,height:__ajTestGlobe.canvas.height},dpr:devicePixelRatio}));fs.writeFileSync(path.join(root,'logs',process.argv[3]||'camera.json'),JSON.stringify(info,null,2));
 }else if(mode==='inspect'){
 console.log((await p.locator('body').innerText()).slice(0,11000));await shot(process.argv[3]||'current');
 }else if(mode==='theme-dark'){
 await button('Settings');await field('Theme').selectOption('Dark');await wait(250);await shot('03-settings-dark');await button('Flights');await shot('04-route-dark');
 }else if(mode==='edit'){
 await button('Edit flight');await field('Flight number').fill('V01-INDEPENDENT-EDIT');await button('Save flight');await wait(400);fs.writeFileSync(path.join(root,'logs','before-restart.json'),JSON.stringify(await load(),null,2));
 }else if(mode==='restart-check'){
 const before=JSON.parse(fs.readFileSync(path.join(root,'logs','before-restart.json')));await test('actual process restart preserves complete independent state',async()=>assert.deepEqual(await load(),before));await shot('05-restart');
 }else if(mode==='newbugs'){
 if(await p.locator('.editor').count()){await button('Cancel');await button('Confirm');}
 async function make(number,date,time,zone){await button('+ Add flight');await field('Flight number').fill(number);await field('Airport / place name').fill('Independent sort origin');await field('Airport / place name',1).fill('Independent sort destination');await field('Precision').selectOption('Date and time');await field('Date').fill(date);await field('Local time').fill(time);await field('IANA time zone / UTC offset').fill(zone);await button('Save flight');}
 await make('SORT-A','2026-09-01','00:30','+14:00');await make('SORT-B','2026-08-31','23:30','-10:00');await p.getByRole('combobox',{name:'Sort flights'}).selectOption('Oldest first');await wait(200);
 const order=await p.locator('.flight-select').allTextContents();const a=order.findIndex(x=>x.includes('SORT-A')),bb=order.findIndex(x=>x.includes('SORT-B'));result.observations.push({id:'V01-01',expected:'SORT-A before SORT-B in resolved UTC chronology',actualOrder:order.map(x=>x.split('\n')[0]),a,bb,times:{A:'2026-08-31T10:30:00Z',B:'2026-09-01T09:30:00Z'}});await shot('06-sort-localdate');
 await p.locator('.flight-select').filter({hasText:'SORT-A'}).click();await button('Edit flight');await field('Date').fill('2026-09-02');await field('Notes').fill('UNSAVED-EXACT-PRECISION');await button('Settings');await button('Flights');await test('switch main page retains unsaved editor',async()=>assert.equal(await field('Notes').inputValue(),'UNSAVED-EXACT-PRECISION'));await button('Cancel');await button('Confirm');
 // Regular partial time entry exposes feedback for unsolved but intentionally selected precision.
 await p.locator('.flight-select').filter({hasText:'SORT-A'}).click();await button('Edit flight');await field('Choose local airport').selectOption('airport-PVG');await field('Airport / place name').fill('Independent custom new place');await button('Save flight');await wait(400);
 const f=(await load()).flights.find(x=>x.number==='SORT-A');result.observations.push({id:'V01-02',action:'select PVG then replace place name by typing a distinct custom place',actual:f.from,expected:'Clarify or clear borrowed location when replacing place rather than silently using former airport coordinates'});await shot('07-renamed-place');
 }else if(mode==='route-refresh'){
 for(let i=0;i<2;i++){
 await button('Flights');await p.locator('.flight-select').filter({hasText:'V01-INDEPENDENT-EDIT'}).click();await wait(1000);
 await button('Settings');await field('Clock').selectOption(i===0?'12h':'24h');await button('Flights');await wait(2200);
 await shot('11-route-after-setting-'+i);
 const before=await p.evaluate(()=>({height:__ajTestGlobe.camera.positionCartographic.height,routeEntities:__ajTestGlobe.entities.values.filter(x=>x.id.startsWith('route-')).map(x=>x.id),requestRenderMode:__ajTestGlobe.scene.requestRenderMode}));
 const box=await p.locator('.cesium-widget canvas').boundingBox();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.7);await p.mouse.wheel(0,-20);await wait(500);await shot('12-route-after-nudge-'+i);
 result.observations.push({repeat:i,before,afterHeight:await p.evaluate(()=>__ajTestGlobe.camera.positionCartographic.height),note:'Compare raster screenshots, not merely entity count. A ordinary clock preference causes invisible route until a camera event.'});
 }
 }else if(mode==='normal-route-check'){
 await button('Flights');await p.locator('.flight-select').filter({hasText:'V01-INDEPENDENT-EDIT'}).click();await wait(1000);await shot('18-normal-route-visible');
 await button('Settings');await field('Clock').selectOption('12h');await button('Flights');await wait(2500);await shot('19-normal-route-missing');
 const box=await p.locator('.cesium-widget canvas').boundingBox();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.7);await p.mouse.wheel(0,-20);await wait(500);await shot('20-normal-route-reappeared');
 result.observations.push({mode:'normal production app; no AIRJOURNEY_SMOKE / no __ajTestGlobe',testingHook:await p.evaluate(()=>Boolean(window.__ajTestGlobe)),records:(await load()).flights.length,note:'Screenshots show clock change removes route until wheel movement; persisted records intact'});
 }else if(mode==='library-draft'){
 await button('Library');await button('Airports');await button('+ Add new');await field('Name').fill('UNSAVED-LIBRARY-DRAFT');await shot('14-library-unsaved');await button('Airlines');await button('Airports');await shot('15-library-draft-gone');
 result.observations.push({name:'library draft discarded by switching reference category without a warning',draftEditorPresent:await p.locator('.library-edit').count(),savedEntryPresent:(await load()).library.Airports.some(x=>x.name==='UNSAVED-LIBRARY-DRAFT')});await button('Flights');await p.locator('.flight-select').filter({hasText:'V01-INDEPENDENT-EDIT'}).click();
 }else if(mode==='library-import'){
 await button('Library');await button('Airports');await button('Import');
 }else if(mode==='library-switch'){
 await shot('16-native-library-preview');await button('Airlines');await shot('17-native-library-switched');await button('Confirm import');await wait(300);
 const s=await load();await test('AF04 native file dialog import bound to Airports after switching Airlines',async()=>{assert.ok(s.library.Airports.some(x=>x.id==='v01-independent-import'));assert.ok(!s.library.Airlines.some(x=>x.id==='v01-independent-import'))});
 }else if(mode==='backup'){
 await button('Settings');await button('Data & backup');await button('Export backup');fs.writeFileSync(path.join(root,'logs','backup-state.json'),JSON.stringify(await load(),null,2));
 }else if(mode==='fresh-import'){
 await button('Settings');await button('Data & backup');await button('Import backup');
 }else if(mode==='restore'){
 await p.getByLabel('Conflict policy').selectOption('Replace entire personal library');await shot('08-native-backup-preview');await button('Confirm import');
 }else if(mode==='restore-check'){
 const original=JSON.parse(fs.readFileSync(path.join(root,'logs','backup-state.json')));await test('native dialog backup restores every object into independent empty profile',async()=>assert.deepEqual(await load(),original));await button('Flights');await shot('09-native-restored');
 }
 }catch(e){result.results.push({name:'stopped',status:'FAIL',error:String(e.stack)});console.error(e);process.exitCode=1;await shot('failure-'+mode).catch(()=>{})}
 fs.writeFileSync(path.join(root,'logs',mode+'-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await b.close();process.exit(process.exitCode||0);
})().catch(e=>{console.error(e);process.exitCode=1});

