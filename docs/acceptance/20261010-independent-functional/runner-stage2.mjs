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
await button('Library');
for(const [kind,name] of [['Airports','Acceptance stage2 place'],['Airlines','Acceptance stage2 Air'],['Alliances','Acceptance stage2 Alliance'],['Aircraft','Acceptance stage2 Aircraft']]){
await button(kind);await js(`(()=>{const c=document.querySelector('.library > .row input[type=checkbox]');if(c.checked)c.click()})()`);await wait(100);await button('+ Add new');await field('Name',name);if(kind==='Airports'){await field('Latitude','0');await field('Longitude','0')}
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
await fs.writeFile(new URL('logs/independent-results-stage2.json',root),JSON.stringify({results,issues},null,2));await fs.writeFile(new URL('logs/last-body.txt',root),await text());ws.close();
}
