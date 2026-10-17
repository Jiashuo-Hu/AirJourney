const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture,open}=require('./electron-background-test.cjs');
const exe=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),profile=path.join(out,'profile');fs.mkdirSync(out,{recursive:true});
const results=[];let app,p,errors=[],original;
const wait=ms=>p.waitForTimeout(ms),load=()=>p.evaluate(()=>window.airjourney.load());
const button=async name=>{await p.getByRole('button',{name,exact:true}).click();await wait(250)};
const test=async(name,fn)=>{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name)};
const shot=name=>p.screenshot({path:path.join(out,name+'.png')});
const stat=async(key,value)=>assert.equal(await p.locator(`[data-stat="${key}"]`).innerText(),String(value));
async function start(testing=true){const r=await open(exe,profile,testing);app=r.app;p=r.p;errors.push(...r.errors);p.on('pageerror',e=>errors.push(String(e)));await wait(600)}
const card=name=>p.locator('.flight-select').filter({hasText:name});
async function pick(name){const el=card(name);if(await el.getAttribute('aria-pressed')!=='true')await el.click();await wait(900)}
async function setColor(value){await p.getByLabel('Default route color',{exact:true}).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);await p.waitForFunction(v=>window.airjourney.load().then(s=>s.settings.routeColor===v),value);await wait(400)}
(async()=>{try{
 original=await fixture(profile,s=>{const t=s.flights.find(f=>f.from.code==='PEK'&&f.to.code==='LHR')||s.flights[0];
 const make=(id,date,extra={})=>({...structuredClone(t),id,number:id,departure:{date,time:'',zone:'',precision:date?'Date only':'Unknown'},arrival:{date:'',time:'',zone:'',precision:'Unknown'},color:'',visible:true,deleted:undefined,status:'Recorded',distance:100,unit:'km',...extra});
 s.flights=[make('R-24','2024-01-01'),make('R-24-return','2024-06-10',{from:t.to,to:t.from,distance:10,unit:'miles',airline:{...t.airline,id:'legacy-carrier'}}),make('R-undated','',{distance:undefined,airline:undefined}),make('P-25','2025-04-01',{status:'Planned'}),make('D-26','2026-04-01',{status:'Draft'}),make('X-99','1999-01-01',{deleted:'2025-01-01'})];
 s.settings={...s.settings,reducedMotion:false,remember:false,repeatRoutes:'thick'};return s;});await start();
 await test('v0.5 installed offline globe and lossless airport resource load',async()=>{assert.deepEqual(await load(),original);const resource=await p.evaluate(async()=>{const r=await fetch('./data/airports-global.json.gz');const rows=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();return{records:rows.length,firstId:rows[0].id};});assert.equal(resource.records,86242);return{resource,defaultProfileUsed:false}});
 await test('compact completed/planned statistics and bilateral route ranking',async()=>{await stat('Completed',3);await stat('Airports',2);await stat('Airlines',1);const g=require('geographiclib-geodesic').Geodesic.WGS84;const f=original.flights[2];await stat('km',((100000+16093.44+g.Inverse(f.from.lat,f.from.lon,f.to.lat,f.to.lon).s12)/1000).toLocaleString('en-US',{maximumFractionDigits:0}));assert.ok((await p.locator('.summary-secondary').innerText()).includes('1 planned · 1 draft'));assert.ok((await p.locator('.summary-secondary').innerText()).includes('3×'));await shot('01-summary-all')});
 await test('local departure years descending; undated only All; Trash excluded',async()=>{assert.deepEqual(await p.getByLabel('Time range',{exact:true}).locator('option').allTextContents(),['All','2026','2025','2024']);await p.getByLabel('Time range',{exact:true}).selectOption('2024');await stat('Completed',2);assert.equal(await p.locator('.flight-select').count(),2);await p.waitForFunction(()=>__ajTestGlobe.entities.values.filter(e=>e.id.startsWith('route-')).every(e=>e.properties.flightIds.getValue().every(id=>id.startsWith('R-24'))));await shot('02-year-2024')});
 await test('year intersects existing search filters and map, Insights uses same summary',async()=>{await p.getByLabel('Search flights',{exact:true}).fill('return');await stat('Completed',1);assert.equal(await p.locator('.flight-select').count(),1);await button('Insights');await stat('Completed',1);await button('Flights');await p.getByLabel('Search flights',{exact:true}).fill('');await p.getByLabel('Time range',{exact:true}).selectOption('All');await stat('Completed',3)});
 await test('planned year intersects status filter without contributing completed totals',async()=>{await p.getByLabel('Time range',{exact:true}).selectOption('2025');await stat('Completed',0);assert.equal(await p.locator('.flight-select').count(),1);await button('☷ Filters');const status=p.locator('.filters label').filter({hasText:/^Status/}).locator('select');await status.selectOption('Recorded');assert.equal(await p.locator('.flight-select').count(),0);await p.waitForFunction(()=>__ajTestGlobe.entities.values.every(e=>!e.id.startsWith('route-')));await status.selectOption('Planned');assert.equal(await p.locator('.flight-select').count(),1);await button('Clear filters');await button('☷ Filters')});
 await test('create/edit/delete updates year options immediately and invalid selection returns All',async()=>{
  await button('+ Add flight');await p.getByLabel('Flight number',{exact:true}).fill('NEW-YEAR');
  for(const [group,code,name]of [['Departure','PEK','Beijing Capital'],['Arrival','LHR','London Heathrow']]){
   const g=p.locator('fieldset').filter({has:p.locator(`legend:text-is("${group}")`)});
   await g.getByPlaceholder('Code, airport, city or country').fill(code);await g.getByRole('option').filter({hasText:name}).first().click();
  }
  const dep=p.locator('fieldset').filter({has:p.locator('legend:text-is("Departure")')});await dep.getByLabel('Time precision',{exact:true}).selectOption('Date only');await dep.getByLabel('Local date',{exact:true}).fill('2031-03-04');await button('Save flight');
  await p.getByLabel('Time range',{exact:true}).selectOption('2031');await stat('Completed',1);await pick('NEW-YEAR');await button('Edit flight');await dep.getByLabel('Local date',{exact:true}).fill('2032-03-04');await button('Save flight');
  assert.equal(await p.getByLabel('Time range',{exact:true}).inputValue(),'All');assert.ok((await p.getByLabel('Time range',{exact:true}).locator('option').allTextContents()).includes('2032'));assert.ok(!(await p.getByLabel('Time range',{exact:true}).locator('option').allTextContents()).includes('2031'));
  await p.getByLabel('Time range',{exact:true}).selectOption('2032');await pick('NEW-YEAR');await button('Move to Trash');assert.equal(await p.getByLabel('Time range',{exact:true}).inputValue(),'All');assert.ok(!(await p.getByLabel('Time range',{exact:true}).locator('option').allTextContents()).includes('2032'));
 });
 await test('default route color changes immediately; selected routes contrast in both repeated modes',async()=>{await button('Settings');await button('Map');await setColor('#d33165');assert.equal((await load()).settings.routeColor,'#d33165');await button('Flights');
  for(const theme of ['Light','Dark']){
   await button('Settings');await button('Appearance');await p.locator('.settings label').filter({hasText:/^Theme/}).locator('select').selectOption(theme);await button('Flights');
   for(const mode of ['thick','separate']){await p.getByLabel('Map repeated routes',{exact:true}).selectOption(mode);await wait(700);await pick('R-24-return');const detail=await p.evaluate(()=>__ajTestGlobe.entities.values.filter(e=>e.id.startsWith('route-')).map(e=>({selected:e.properties.selected.getValue(),color:e.polyline.material.color.getValue().toCssHexString(),alpha:e.polyline.material.color.getValue().alpha})));assert.ok(detail.some(r=>r.selected&&r.color!=='#d33165'&&r.alpha===1));await card('R-24-return').click();await wait(250);assert.ok((await p.evaluate(()=>__ajTestGlobe.entities.values.filter(e=>e.id.startsWith('route-')).map(e=>e.polyline.material.color.getValue().toCssHexString()))).every(c=>c.slice(0,7)==='#d33165'));}
  }await shot('03-color-dark')});
 await test('color persists through real process restart and Reset color changes only color',async()=>{const before=await load();await app.close();app=null;await start();assert.deepEqual(await load(),before);await button('Settings');await button('Map');assert.equal(await p.getByLabel('Default route color',{exact:true}).inputValue(),'#d33165');await button('Reset color');const after=await load();assert.equal(after.settings.routeColor,'#3b86df');const a={...before.settings,routeColor:after.settings.routeColor};assert.deepEqual(after.settings,a);await setColor('#d33165');await button('Flights')});
 await test('sidebar resizes continuously without skipped frames, rebuilding globe or moving camera',async()=>{
  await pick('R-24-return');await wait(1000);
  await p.evaluate(()=>{window.__v05Widget=__ajTestGlobe;window.__v05Camera=Array.from([__ajTestGlobe.camera.position.x,__ajTestGlobe.camera.position.y,__ajTestGlobe.camera.position.z]);});
  const sample=await p.evaluate(async()=>{
    const v=__ajTestGlobe,d=__ajMapDiagnostics,rows=[],start={frames:d.frames,skipped:d.skippedFrames,rebuilds:d.rebuilds};
    document.getElementById('sidebar-toggle').click();await new Promise(requestAnimationFrame);
    const aside=document.querySelector('aside'),resizer=document.querySelector('.resizer');
    const animations=document.getAnimations().filter(a=>[aside,resizer].includes(a.effect?.target));
    if(!animations.length)throw Error('Expected real sidebar width transitions');animations.forEach(a=>a.pause());
    for(const time of [0,55,110,165,220]){
      animations.forEach(a=>a.currentTime=time);
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{remove();reject(Error('No frame at transition sample'))},15000);const remove=v.scene.postRender.addEventListener(()=>{clearTimeout(timer);remove();resolve()});v.scene.requestRender()});
      const c=v.canvas;rows.push({time,width:c.clientWidth,height:c.clientHeight,bw:c.width,bh:c.height,aspect:v.camera.frustum.aspectRatio,frames:d.frames});
    }
    animations.forEach(a=>a.finish());
    return{rows,start,end:{frames:d.frames,skipped:d.skippedFrames,rebuilds:d.rebuilds},same:v===window.__v05Widget,camera:[v.camera.position.x,v.camera.position.y,v.camera.position.z],original:window.__v05Camera,method:'Actual CSS width transitions sampled at five paused timeline positions; no map resize/render bypass; natural timing remains manual review'};
  });
  fs.writeFileSync(path.join(out,"sidebar-samples.json"),JSON.stringify(sample,null,2));
  assert.ok(sample.same);assert.equal(sample.end.rebuilds,sample.start.rebuilds);assert.equal(sample.end.skipped,sample.start.skipped);assert.deepEqual(sample.camera,sample.original);assert.ok(new Set(sample.rows.map(r=>r.width)).size>=4);assert.ok(sample.rows.every(r=>Math.abs(r.aspect-r.width/r.height)<.005&&Math.abs(r.bw/r.bh-r.width/r.height)<.008));
  await button('◨ Show sidebar');await shot('04-sidebar-restored');return sample;
 });
 await test('rapid toggles and window resizing preserve selection, camera and correct framebuffer',async()=>{
  await p.evaluate(async()=>{for(let i=0;i<8;i++){document.getElementById('sidebar-toggle').click();await new Promise(r=>setTimeout(r,35));}});await wait(500);
  for(const [w,h]of [[1024,720],[1500,900],[1280,850]]){await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setContentSize(...size),[w,h]);await p.waitForFunction(()=>{const v=__ajTestGlobe;return Math.abs(v.camera.frustum.aspectRatio-v.canvas.clientWidth/v.canvas.clientHeight)<.005},null,{timeout:15000});const r=await p.evaluate(()=>({w:__ajTestGlobe.canvas.clientWidth,h:__ajTestGlobe.canvas.clientHeight,aspect:__ajTestGlobe.camera.frustum.aspectRatio,same:__ajTestGlobe===__v05Widget,selected:__ajTestGlobe.entities.values.some(e=>e.id.startsWith('route-')&&e.properties.selected.getValue()),errors:__ajMapDiagnostics.errors}));assert.ok(r.same&&r.selected);assert.ok(Math.abs(r.aspect-r.w/r.h)<.005);assert.deepEqual(r.errors,[])}
 });
 await test('complete backup restores color, mode and unmodified historical flight snapshots',async()=>{await button('Settings');await button('Data & backup');const before=await load();await button('Export backup');let file;for(let i=0;i<200;i++){file=fs.readdirSync(profile).find(n=>n==='AirJourney-v0.5.airjourney');if(file)break;await wait(100)}assert.ok(file);fs.copyFileSync(path.join(profile,file),path.join(profile,'import-next.bin'));await button('Map');await setColor('#00aa33');await button('Data & backup');await button('Import backup');await p.getByLabel('Conflict policy').selectOption('Replace entire personal library');await button('Confirm import');assert.deepEqual(await load(),before)});
 await test('ordinary hidden launch has no test hooks and maintains saved statistics',async()=>{const before=await load();await app.close();app=null;await start(false);assert.deepEqual(await load(),before);assert.equal(await p.evaluate(()=>!!window.__ajTestGlobe),false);await stat('Completed',3);await shot('05-normal-mode')});
 assert.deepEqual(errors,[]);
}catch(e){console.error(e);results.push({name:'suite failure',status:'FAIL',error:e.stack});await p?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1;
}finally{await app?.close().catch(()=>{});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({version:'v0.5',exe,results,errors,hiddenOffscreen:true,nativeInputUsed:false,visualConfirmation:'Pending manual foreground review'},null,2))}})();
