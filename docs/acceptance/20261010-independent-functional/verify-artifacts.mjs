import fs from 'node:fs';
import crypto from 'node:crypto';
import asar from '@electron/asar';
import {unzipSync} from 'fflate';
const root='docs/acceptance/20261010-independent-functional/logs/';
const rows=JSON.parse(fs.readFileSync(root+'resource-rows.json','utf8').replace(/^\uFEFF/,''));
const mismatches=[];
for(const r of rows){try{let b;if(r.local_path.includes('::')){const [p,entry]=r.local_path.split('::');b=asar.extractFile(p,entry.replaceAll('/','\\'))}else b=fs.readFileSync(r.local_path);if(crypto.createHash('sha256').update(b).digest('hex')!==r.sha256)mismatches.push(r.local_path)}catch(e){mismatches.push({path:r.local_path,error:String(e)})}}
fs.writeFileSync(root+'resource-check-final.json',JSON.stringify({entries:rows.length,mismatches},null,2));
const files=unzipSync(fs.readFileSync('release/AirJourney-v0.0-source.zip'));const code=[],docs=[];let compared=0;
for(const [p,b] of Object.entries(files)){if(fs.existsSync(p)&&fs.statSync(p).isFile()){if(/^(src\/|desktop\/|scripts\/|tests\/|package|tsconfig|vite\.config)/.test(p)){compared++;if(!b.equals?.(fs.readFileSync(p))&& !Buffer.from(b).equals(fs.readFileSync(p)))code.push(p)}else if(p.startsWith('docs/planning/')&&!Buffer.from(b).equals(fs.readFileSync(p)))docs.push(p)}}
fs.writeFileSync(root+'source-zip-comparison.json',JSON.stringify({entries:Object.keys(files).length,codeCompared:compared,changedCode:code,changedPlanningDocs:docs},null,2));
console.log({resources:rows.length,mismatches:mismatches.length,codeCompared:compared,changedCode:code,changedPlanningDocs:docs});
