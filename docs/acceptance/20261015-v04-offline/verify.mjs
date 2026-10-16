import fs from 'node:fs';
import crypto from 'node:crypto';
import asar from '@electron/asar';
import {unzipSync} from 'fflate';
const out='docs/acceptance/20261015-v04-offline/logs/';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const archive='release/v0.4/win-unpacked/resources/app.asar';
const list=asar.listPackage(archive).map(x=>x.replace(/^[/\\]/,''));
const changes=[];let codeFiles=0;
for(const p of list){const n=p.replaceAll('\\','/');if(!/^(dist\/|desktop\/|package.json$)/.test(n))continue;const s=asar.statFile(archive,p);if(s.files)continue;if(!fs.existsSync(n)){changes.push({path:n,missing:true});continue;}codeFiles++;if(hash(asar.extractFile(archive,p))!==hash(fs.readFileSync(n)))changes.push({path:n});}
const zip=unzipSync(fs.readFileSync('release/v0.4/AirJourney-v0.4-source.zip'));
const changedDocs=[],changedSource=[];let docs=0,source=0;
for(const [p,b] of Object.entries(zip)){if(!fs.existsSync(p)||!fs.statSync(p).isFile())continue;if(p.startsWith('docs/')){docs++;if(hash(b)!==hash(fs.readFileSync(p)))changedDocs.push(p)}else if(/^(src\/|desktop\/|scripts\/|tests\/|package|tsconfig|vite.config|suggestions\/)/.test(p)){source++;if(hash(b)!==hash(fs.readFileSync(p)))changedSource.push(p)}}
const artifacts=['release/v0.4/AirJourney-v0.4-x64-setup.exe','release/v0.4/AirJourney-v0.4-source.zip',archive].map(p=>({path:p,bytes:fs.statSync(p).size,sha256:hash(fs.readFileSync(p))}));
const rows=JSON.parse(fs.readFileSync(out+'resource-rows.json','utf8').replace(/^\uFEFF/,''));const mismatches=[];
for(const r of rows){try{let b;if(r.local_path.includes('::')){const [p,n]=r.local_path.split('::');b=asar.extractFile(p,n.replaceAll('/','\\'))}else b=fs.readFileSync(r.local_path);if(hash(b)!==r.sha256)mismatches.push(r.local_path)}catch(e){mismatches.push({path:r.local_path,error:String(e)})}}
const result={packageVersion:JSON.parse(asar.extractFile(archive,'package.json')).version,productionCompared:codeFiles,productionChanges:changes,sourceCompared:source,sourceChanges:changedSource,docsCompared:docs,docsChanges:changedDocs,resources:rows.length,resourceMismatches:mismatches,hasLatestPlanning:!!zip['docs/planning/18_V0_4_SCOPE.md'],hasPriorIssues:!!zip['docs/acceptance/20261010-independent-functional/issues.md'],artifacts};
result.packagedManifest=JSON.parse(asar.extractFile(archive,'package.json'));
result.manifestDifferenceExpected=changes.length===1&&changes[0].path==='package.json'&&result.packageVersion===JSON.parse(fs.readFileSync('package.json')).version;
fs.writeFileSync(out+'delivery-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));


