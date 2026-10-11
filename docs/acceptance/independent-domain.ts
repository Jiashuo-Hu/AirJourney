import fs from 'node:fs';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {initialState} from '../../src/seed';
import {resolveTime,duration,distance,route,safeSvg,validateState,csv,applyReference} from '../../src/domain';
import {backup,parseBackup} from '../../src/storage';
import {zipSync,strToU8} from 'fflate';
import type {Flight} from '../../src/types';
const out=new URL('./evidence/',import.meta.url);const results:any[]=[];
const test=async(name:string,fn:()=>any)=>{try{results.push({name,status:'PASS',detail:await fn()});}catch(e){results.push({name,status:'FAIL',error:String(e)});}fs.writeFileSync(new URL('independent-domain.json',out),JSON.stringify(results,null,2));};
const empty={date:'',time:'',zone:''};
const f:Flight={id:'independent-flight',created:'2026-10-10T00:00:00Z',updated:'2026-10-10T00:00:00Z',number:'AJ-SYNTHETIC',from:{id:'a',name:'A',lat:0,lon:0},to:{id:'b',name:'B',lat:0,lon:1},departure:{...empty},arrival:{...empty},unit:'km',status:'Recorded',tags:[],notes:'合成\n=1+1',fields:{},color:'',visible:true};
await test('Independent UTC oracle FX03/04/05/06',()=>{
 const cases:[any,string|null][]=[
 [{date:'2024-01-15',time:'10:00',zone:'Asia/Shanghai'},'2024-01-15T02:00:00.000Z'],
 [{date:'2024-01-15',time:'18:00',zone:'Asia/Tokyo'},'2024-01-15T09:00:00.000Z'],
 [{date:'2024-01-15',time:'10:00',zone:'America/Los_Angeles'},'2024-01-15T18:00:00.000Z'],
 [{date:'2024-03-10',time:'02:30',zone:'America/New_York'},null],
 [{date:'2024-11-03',time:'01:30',zone:'America/New_York'},null],
 [{date:'2024-11-03',time:'01:30',zone:'-04:00'},'2024-11-03T05:30:00.000Z'],
 [{date:'2024-11-03',time:'01:30',zone:'-05:00'},'2024-11-03T06:30:00.000Z']];
 for(const [input,expected]of cases)assert.equal(resolveTime(input).utc,expected);assert.equal(duration({...f,departure:{date:'2024-01-15',time:'10:00',zone:'+08:00'},arrival:{date:'2024-01-15',time:'10:00',zone:'+08:00'}}),null);return cases;
});
await test('Independent analytic WGS84 equator 1 degree / meridian to pole',()=>{assert.ok(Math.abs(distance(f.from,f.to)!-111319.49079327357)<0.001);assert.ok(Math.abs(distance(f.from,{id:'p',name:'P',lat:90,lon:0})!-10001965.729312722)<0.001);return{equator:111319.49079327357,meridian:10001965.729312722,source:'WGS84 semi-major 6378137 * pi/180; independent meridian integral reference'};});
await test('Pole same-point route must stay legal WGS84 latitude',()=>{const p={id:'pole',name:'Pole',lat:90,lon:0};const points=route(p,p);assert.ok(points.every(p=>Math.abs(p[1])<=90),'Same-point ring at pole generates latitude above 90 degrees');return points;});
await test('Antimeridian same-point loop must normalize longitude',()=>{const p={id:'date-line',name:'Date line',lat:0,lon:180};assert.ok(route(p,p).every(p=>Math.abs(p[0])<=180),'Same-point ring crosses +180 without normalization');});
await test('Near-antipodal and polar route finite / endpoints',()=>{for(const end of [{lat:0.00001,lon:179.99999},{lat:89.99999,lon:-179.99999},{lat:0,lon:180}]){const ps=route(f.from,{id:'x',name:'X',...end});assert.equal(ps.length,97);assert.ok(ps.flat().every(Number.isFinite));}return{cases:3};});
await test('Personal SVG + old snapshot + full portable backup equal',async()=>{const s=initialState();const logo=safeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="#c11" d="M0 0H10V10Z"/></svg>');s.flights=[{...f,airline:{id:'custom-airline',name:'Custom',logo}}];s.library.Airlines.push({id:'custom-airline',name:'Custom',logo});s.fields=[{id:'field',label:'Custom field',type:'text',options:'',hidden:false}];s.flights[0].fields={field:'原样\n"quote"'};s.tags=['Test'];s.flights[0].tags=['Test'];const bytes=await backup(s);fs.writeFileSync(new URL('../fixtures/independent.airjourney',out),bytes);assert.deepEqual(await parseBackup(bytes),s);return{bytes:bytes.length,assetsEmbedded:true};});
await test('SVG attack rejection matrix / bundled true vectors',()=>{for(const raw of ['<script>alert(1)</script>','<foreignObject/>','<image href="data:image/png;base64,eA=="/>','<path onload="alert(1)" d="M0 0"/>','<path style="fill:url(https://example.invalid/a)" d="M0 0"/>','<use href="#a"/>'])assert.throws(()=>safeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0H10V10Z"/>${raw}</svg>`));for(const n of ['lufthansa','star-alliance','oneworld'])safeSvg(fs.readFileSync(new URL('../../public/logos/'+n+'.svg',import.meta.url),'utf8'));return{rejected:6,bundled:3};});
await test('Malformed backup structure missing display number rejected',()=>{const s=initialState();s.flights=[structuredClone(f)];delete(s.flights[0]as any).number;assert.throws(()=>validateState(s),'Record missing number should be rejected before rendering sorting');});
await test('Malformed visible/deleted/reference boolean types rejected',()=>{for(const [key,value]of [['visible','false'],['deleted',123],['number',42],['updated',{}]]as const){const s=initialState();s.flights=[{...structuredClone(f),[key]:value} as any];assert.throws(()=>validateState(s),`Invalid ${key} accepted`);}});
await test('Malformed map/sidebar/setting fields rejected',()=>{for(const [key,value]of [['sidebarWidth','banana'],['labels','false'],['dateFormat',{}],['remember',true]]as const){if(key==='remember')continue;const s=initialState();(s.settings as any)[key]=value;assert.throws(()=>validateState(s),`Invalid ${key} accepted`);}});
await test('Unsupported version / path / checksum / truncation reject',async()=>{const b=await backup(initialState());for(const bytes of [b.slice(0,30),zipSync({'../data.json':strToU8('{}')}),zipSync({'manifest.json':strToU8(JSON.stringify({format:'airjourney',version:2})),'data.json':strToU8('{}')}),zipSync({'manifest.json':strToU8(JSON.stringify({format:'airjourney',version:1,sha256:'bad'})),'data.json':strToU8('{}')})])await assert.rejects(()=>parseBackup(bytes));return{rejected:4};});
await test('CSV beginning whitespace then formula must be neutralized',()=>{const str=csv([{...f,number:'\n=1+1'}]);assert.ok(str.includes('"\'\n=1+1"'),'Leading LF formula prefix exported without neutralization');});
await test('Manual distance source retained in model',()=>{const manual={...f,distance:1000,unit:'miles',distanceSource:'Synthetic handbook'};const s=initialState();s.flights=[manual as Flight];validateState(s);assert.ok(csv(s.flights).includes('Synthetic handbook'),'No UI/model documented source field or CSV column');});
await test('Alliance rename tracks airline suggestions',()=>{const s=initialState();const old=s.library.Alliances[0],next={...old,name:'Renamed alliance'};const airlines=s.library.Airlines.filter(a=>a.alliance===old.name);const changed=applyReference({...f,airline:airlines[0],alliance:old.name},'Alliances',old,next);assert.equal(changed.alliance,next.name);assert.equal(changed.airline?.alliance,next.name,'Airline suggestion retains old alliance name');});
console.log(JSON.stringify({total:results.length,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length}));
