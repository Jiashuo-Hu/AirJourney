import fs from 'node:fs';
import crypto from 'node:crypto';
import asar from '@electron/asar';
import {gunzipSync} from 'node:zlib';
const out='docs/acceptance/20261017-v05-background/logs/';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const old='release/v0.4/win-unpacked/resources/app.asar',current='release/v0.5/win-unpacked/resources/app.asar';
const files=p=>asar.listPackage(p).map(s=>s.replaceAll('\\','/').replace(/^\//,'')).filter(s=>!asar.statFile(p,s.replaceAll('/','\\')).files);
const read=(a,p)=>asar.extractFile(a,p.replaceAll('/','\\'));
const checked=[],changes=[];
for(const p of files(old)){
 if(!/^dist\/(logos\/|icons\/|maps\/|cesium\/|app-icon\.png|app-logo\.svg|app\.ico|assets\/.*\.woff2?$|data\/airports-global\.json$|data\/airlines-global\.json$)/.test(p))continue;
 checked.push(p);
 try{const b=p==='dist/data/airports-global.json'?gunzipSync(read(current,p+'.gz')):read(current,p);if(hash(b)!==hash(read(old,p)))changes.push(p);}catch(e){changes.push({path:p,error:String(e)})}
}
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const size=p=>{const a=walk(p);return{files:a.length,bytes:a.reduce((s,p)=>s+fs.statSync(p).size,0)}};
const evidence=JSON.parse(fs.readFileSync('docs/implementation/v0.5/evidence_index.json')).evidence.map(e=>({path:e.path,matches:hash(fs.readFileSync(e.path))===e.sha256}));
const result={retainedResourcesCompared:checked.length,resourceChanges:changes,airports:JSON.parse(gunzipSync(read(current,'dist/data/airports-global.json.gz'))).length,airlines:JSON.parse(read(current,'dist/data/airlines-global.json')).length,sqlRuntimeFiles:files(current).filter(p=>p.startsWith('node_modules/sql.js/')),dist:size('dist'),unpacked:size('release/v0.5/win-unpacked'),installerBytes:fs.statSync('release/v0.5/AirJourney-v0.5-x64-setup.exe').size,existingEvidenceHashes:evidence};
fs.writeFileSync(out+'resources-and-sizes.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
