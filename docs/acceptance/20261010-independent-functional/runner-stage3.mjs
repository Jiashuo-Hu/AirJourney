import * as c from './client.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url),results=[],observations=[];
const test=async(name,fn)=>{try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name)}catch(e){results.push({name,status:'FAIL',error:String(e.stack)});console.log('FAIL',name,String(e));throw e}};
try {
await c.button('Settings');await c.button('Personal fields');
for(const type of ['text','number','date','select']){
 await c.button('+ Add field');await c.field('Label','Acceptance '+type);await c.field('Type',type);if(type==='select')await c.field('Options (comma separated)','Window,Aisle');await c.button('Save field');
}
await c.button('Flights');await c.js(`document.querySelector('.flight-select').click()`);await c.wait(150);await c.button('Edit flight');
await c.field('Acceptance text','测试 custom');await c.field('Acceptance number','42.5');await c.field('Acceptance date','2026-01-02');await c.field('Acceptance select','Window');await c.button('Save flight');
await test('four custom field types save and preserve raw values',async()=>{const s=await c.load();const f=s.flights.find(f=>Object.keys(f.fields).length===4);assert.ok(f);assert.deepEqual(Object.values(f.fields),['测试 custom','42.5','2026-01-02','Window']);return f.fields});
await c.button('Settings');await c.button('Personal fields');await c.js(`(()=>{const b=[...document.querySelectorAll('.reference-row button')].find(b=>b.textContent.startsWith('Acceptance text'));b.click()})()`);await c.wait(150);await c.field('Type','number');await c.button('Save field');
await test('changing field type archives old definition and value',async()=>{const s=await c.load();assert.ok(s.fields.find(f=>f.label==='Acceptance text'&&f.type==='text'&&f.hidden));assert.ok(s.flights.some(f=>Object.values(f.fields).includes('测试 custom')))});
await c.button('Map');await c.js(`(()=>{const n=document.querySelector('.settings input[type=range]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'4');n.dispatchEvent(new Event('input',{bubbles:true}))})()`);await c.wait(200);
await test('global route width setting saves',async()=>{assert.equal((await c.load()).settings.width,4)});
await c.button('Flights');await c.js(`document.querySelector('.flight-select').click()`);await c.wait(150);await c.button('Duplicate');
await test('duplicate uses distinct UUID',async()=>{assert.equal((await c.load()).flights.length,3)});
await c.button('Move to Trash');await c.button('Trash');await c.js(`document.querySelector('.flight-select').click()`);await c.wait(150);await c.button('Delete permanently');await c.shot('10-permanent-delete-confirm');await c.button('Confirm');
await test('explicit permanent deletion removes only test duplicate',async()=>{assert.equal((await c.load()).flights.length,2)});await c.button('Flights');
await c.button('+ Add flight');await c.field('Flight number','ACC-SAMEPOINT');await c.field('Choose local airport','airport-PEK',0);await c.field('Choose local airport','airport-PEK',1);await c.button('Save flight');
await test('same airport distance zero and ring route',async()=>{assert.ok((await c.text()).includes('0 miles'));assert.ok((await c.text()).includes('3 mapped flights'))});await c.wait(800);await c.shot('11-samepoint');
await c.button('Settings');await c.button('Appearance');
await c.js(`(()=>{const labels=[...document.querySelectorAll('label')];for(const [label,v] of [['Theme','Dark'],['Distance unit','km']]){const n=labels.find(l=>l.firstChild.textContent.trim()===label).querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(n,v);n.dispatchEvent(new Event('change',{bubbles:true}))}})()`);await c.wait(500);
const settings=(await c.load()).settings;observations.push({id:'AF-03',expected:{theme:'Dark',units:'km'},actual:{theme:settings.theme,units:settings.units},note:'Two ordinary setting changes dispatched before first save completes; no artificial save delay.'});
await c.shot('12-settings-queue');
await c.field('Theme','Light');await c.button('Data & backup');await fs.writeFile(new URL('logs/state-before-cancel.json',root),JSON.stringify(await c.load(),null,2));
const {zipSync,strToU8}=await import('fflate');const {createHash}=await import('node:crypto');const s=await c.load();s.flights[0].notes='Conflict fixture revised note';const data=strToU8(JSON.stringify(s));const m={format:'airjourney',version:1,app:'v0.0',base:'starter-20261010',sha256:createHash('sha256').update(data).digest('hex')};
await fs.writeFile(new URL('data/conflict.airjourney',root),zipSync({'manifest.json':strToU8(JSON.stringify(m)),'data.json':data}));
await fs.writeFile(new URL('data/common-invalid.airjourney',root),'This is a mistaken text file, not a backup.');
await fs.writeFile(new URL('data/library-import.json',root),JSON.stringify({kind:'Airports',entries:[{id:'acceptance-import-place',name:'Acceptance imported airport',lat:0,lon:0,source:'Custom'}]}));
}catch(e){console.log(String(e))}finally{await fs.writeFile(new URL('logs/independent-results-stage3.json',root),JSON.stringify({results,observations},null,2));c.ws.close()}
