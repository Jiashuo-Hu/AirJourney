// Independent functional tests against the unchanged packaged application.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const targets = await (await fetch('http://127.0.0.1:9338/json/list')).json();
const target = targets.find(t => t.type === 'page' && t.url === 'airjourney://app/index.html');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let serial=0; const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const js=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const button=async text=>{await js(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing button '+${JSON.stringify(text)});b.click()})()`);await wait(180)};
const field=async(label,value,index=0)=>{await js(`(()=>{const l=[...document.querySelectorAll('label')].filter(x=>x.firstChild?.textContent.trim()===${JSON.stringify(label)})[${index}];const n=l?.querySelector('input,select,textarea');if(!n)throw Error('Missing field '+${JSON.stringify(label)});const p=n instanceof HTMLSelectElement?HTMLSelectElement.prototype:n instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(n,${JSON.stringify(value)});n.dispatchEvent(new Event(n instanceof HTMLSelectElement?'change':'input',{bubbles:true}))})()`);await wait(100)};
const value=(label,index=0)=>js(`(()=>{const l=[...document.querySelectorAll('label')].filter(x=>x.firstChild?.textContent.trim()===${JSON.stringify(label)})[${index}];return l.querySelector('input,select,textarea').value})()`);
const load=()=>js('window.airjourney.load()');
const text=()=>js('document.body.innerText');
const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(new URL('screenshots/'+name+'.png',root),Buffer.from(r.data,'base64'))};
const results=[]; const issues=[];
const test=async(name,fn)=>{try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name)}catch(e){results.push({name,status:'FAIL',error:String(e.stack)});console.log('FAIL',name,String(e));await shot('failure-'+results.length);throw e}};
try {
await test('process restart retains manually created and edited flight',async()=>{const s=await load();assert.equal(s.flights.length,1);assert.equal(s.flights[0].number,'ACC-MANUAL-01-EDIT');return {number:s.flights[0].number,dataPath:await js('window.airjourney.dataPath()')}});
await js('document.querySelector(".flight-select").click()');await wait(600);
await button('Edit flight');
await test('precision selector independent observation',async()=>{await field('Precision','Date and time');const actual=await value('Precision');issues.push({id:'AF-01',expected:'Date and time selected',actual});assert.equal(actual,'Unknown');return {expected:'Date and time',actual}});
await test('normal time and manual distance entry',async()=>{
await field('Date','2024-01-15',0);await field('Local time','10:00',0);await field('IANA time zone / UTC offset','+08:00',0);
await field('Date','2024-01-15',1);await field('Local time','14:00',1);await field('IANA time zone / UTC offset','+00:00',1);
await field('Airline','airline-LH');await field('Alliance override','None');await field('Recorded distance','1000');await field('Original unit','miles');await field('Notes','Independent synthetic material\n中文备注 "quoted"');
assert.ok((await text()).includes('720 minutes'));await button('Save flight');const s=await load();assert.equal(s.flights[0].distance,1000);assert.equal(s.flights[0].unit,'miles');assert.equal(s.flights[0].alliance,'None');assert.ok((await text()).includes('1,609.3 km'));return {distance:s.flights[0].distance,unit:s.flights[0].unit,alliance:s.flights[0].alliance}});
await shot('05-time-distance-logo');
await button('Edit flight');
await test('comma tag typing independent observation',async()=>{await field('Tags (comma separated)','alpha');await field('Tags (comma separated)','alpha,');const actual=await value('Tags (comma separated)');issues.push({id:'AF-02',expected:'alpha, remains ready to type second tag',actual});assert.equal(actual,'alpha');return {actual}});
await field('Tags (comma separated)','alpha, beta');await field('Duration override (minutes)','735');await button('Save flight');
await test('search filters list and globe counts',async()=>{await js(`(()=>{const n=document.getElementById('flight-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'not-present-acceptance');n.dispatchEvent(new Event('input',{bubbles:true}))})()`);await wait(200);assert.equal(await js('document.querySelectorAll(".flight-card").length'),0);assert.ok((await text()).includes('0 mapped flights'));await js(`(()=>{const n=document.getElementById('flight-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'中文备注');n.dispatchEvent(new Event('input',{bubbles:true}))})()`);await wait(200);assert.equal(await js('document.querySelectorAll(".flight-card").length'),1);await js(`(()=>{const n=document.getElementById('flight-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'');n.dispatchEvent(new Event('input',{bubbles:true}))})()`);await wait(200);await button('☷ Filters');await field('Status','Planned');assert.equal(await js('document.querySelectorAll(".flight-card").length'),0);await button('Clear filters');await button('☷ Filters')});
await button('+ Add flight');await field('Flight number','ACC-UNLOCATED');await field('Airport / place name','Acceptance origin',0);await field('Airport / place name','Acceptance destination',1);await field('Date','2025-02-01',0);
await test('custom unknown and date-only save without invented coordinates',async()=>{await button('Save flight');const f=(await load()).flights.find(f=>f.number==='ACC-UNLOCATED');assert.equal(f.from.lat,undefined);assert.equal(f.departure.time,'');assert.equal(f.departure.date,'2025-02-01');assert.equal(f.airline,undefined);assert.ok((await text()).includes('Needs location'));return f});
await shot('06-unlocated');
await button('Edit flight');await field('Latitude','0',0);await field('Longitude','0',0);await field('Latitude','10',1);await field('Longitude','20',1);await button('Save flight');
await test('adding coordinates produces mapped route',async()=>{assert.ok((await text()).includes('2 mapped flights'));assert.equal((await load()).flights.find(f=>f.number==='ACC-UNLOCATED').from.lat,0)});
await button('Library');
for(const [kind,name] of [['Airports','Acceptance library place'],['Airlines','Acceptance Air'],['Alliances','Acceptance Alliance'],['Aircraft','Acceptance Aircraft']]){
await button(kind);await button('+ Add new');await field('Name',name);if(kind==='Airports'){await field('Latitude','0');await field('Longitude','0')}
await button('Apply to future selections');
await test(kind+' custom create edit hide unhide',async()=>{let s=await load();const item=s.library[kind].find(r=>r.name===name);assert.ok(item);await js(`(()=>{const b=[...document.querySelectorAll('.reference-row')].find(b=>b.textContent.includes(${JSON.stringify(name)}));b.click()})()`);await wait(180);await field('Name',name+' edited');await js(`document.querySelector('.library-edit input[type=checkbox]').click()`);await wait(100);await button('Apply to future selections');s=await load();assert.equal(s.library[kind].find(r=>r.id===item.id).hidden,true);await js(`document.querySelector('.library > .row input[type=checkbox]').click()`);await wait(100);await js(`(()=>{const b=[...document.querySelectorAll('.reference-row')].find(b=>b.textContent.includes(${JSON.stringify(name+' edited')}));b.click()})()`);await wait(180);await js(`document.querySelector('.library-edit input[type=checkbox]').click()`);await wait(100);await button('Apply to future selections');assert.equal((await load()).library[kind].find(r=>r.id===item.id).hidden,false);return {id:item.id}})
}
await button('Flights');await js(`document.querySelector('.flight-select').click()`);await wait(180);
await test('trash and complete restore',async()=>{const before=await load();await button('Move to Trash');assert.equal((await load()).flights.filter(f=>f.deleted).length,1);await button('Trash');await js(`document.querySelector('.flight-select').click()`);await wait(180);await button('Restore flight');await button('Flights');const after=await load();for(let i=0;i<before.flights.length;i++){assert.deepEqual(after.flights[i],before.flights[i])}return {count:after.flights.length}});
await button('Settings');await field('Theme','Dark');await field('Distance unit','miles');await button('Map');await js(`document.querySelector('.settings input[type=range]').value='4';document.querySelector('.settings input[type=range]').dispatchEvent(new Event('input',{bubbles:true}))`);await wait(180);await js(`document.querySelector('.settings input[type=checkbox]:not(:disabled)').click()`);await wait(180);
await test('theme units map labels persisted through renderer reload',async()=>{const before=await load();await send('Page.reload');await wait(1600);const after=await load();assert.deepEqual(after,before);assert.equal(after.settings.theme,'Dark');assert.equal(after.settings.units,'miles');assert.equal(after.settings.labels,false);return after.settings});
await shot('07-dark-reload');
await button('Settings');await field('Theme','Light');await button('Data & backup');
await fs.writeFile(new URL('logs/state-before-native-backup.json',root),JSON.stringify(await load(),null,2));
}catch(e){console.log('Runner stopped:',String(e))}finally{
await fs.writeFile(new URL('logs/independent-results.json',root),JSON.stringify({results,issues},null,2));await fs.writeFile(new URL('logs/last-body.txt',root),await text());ws.close();
}
