// Documentation-only source refresh after explicit repository synchronization authorization.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { zipSync, unzipSync } from 'fflate';
const rel='release/v0.4',root='docs/implementation/v0.4';
const source=rel+'/AirJourney-v0.4-source.zip',installer=rel+'/AirJourney-v0.4-x64-setup.exe';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const digest=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const originalSource='4654c536121465bb581e82a0be8b9216c5822a697589004d5f9c84e272ea944e';
const originalInstaller='9b2c9ba998f31e108c3232fd431fc183b962fcf32cfbd310b2207257f1dd288f';
assert.equal(hash(installer),originalInstaller);
const snapshot=rel+'/local-delivery-snapshot';fs.mkdirSync(snapshot,{recursive:true});
if(!fs.existsSync(snapshot+'/AirJourney-v0.4-source.zip')){
  assert.equal(hash(source),originalSource);
  for(const n of ['AirJourney-v0.4-source.zip','SHA256SUMS.txt','delivery_manifest.json','package-verification.json'])fs.copyFileSync(rel+'/'+n,snapshot+'/'+n);
}
assert.equal(hash(snapshot+'/AirJourney-v0.4-source.zip'),originalSource);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).filter(e=>e.name!=='__pycache__').flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name).replaceAll('\\','/')]);
const base=['README.md','LICENSE','.gitignore','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','update_log.txt'];
const evidence=json(root+'/evidence_index.json').evidence.map(e=>{assert.equal(hash(e.path),e.sha256);return e.path;});
const note={date:'2026-10-16',scope:'Documentation and independent offline acceptance additions; application and installer unchanged',originalSourceSha256:originalSource,githubAuthorization:'User: 完善更新文档，推送至 GitHub',releaseCreated:false,artifactUploads:false};
write(root+'/delivery_manifest.json',{...json(root+'/delivery_manifest.json'),sourceRevision:note});
const files=[...new Set([...base,...['src','desktop','scripts','public','tests','docs','suggestions'].flatMap(walk),...evidence])].filter(p=>!p.startsWith('docs/acceptance/evidence/')&&!/^docs\/acceptance\/.*\/data\//.test(p)&&!p.endsWith('.pyc'));
for(const p of files)assert.ok(!/^(?:release|node_modules|\.tools|\.git)\//.test(p));
const entries={};for(const p of files)entries[p]=[fs.readFileSync(p),{level:/\.(png|jpg|jpeg|ico|airjourney)$/i.test(p)?0:6}];
fs.writeFileSync(source,zipSync(entries));const recovered=unzipSync(fs.readFileSync(source));
for(const p of files)assert.equal(digest(recovered[p]),hash(p),'Source ZIP differs: '+p);
for(const p of ['docs/implementation/github_sync_v0.4.md','docs/acceptance/20261015-v04-offline/report.md','docs/acceptance/20261015-v04-offline/logs/tests.log'])assert.ok(recovered[p]);
assert.equal(hash(installer),originalInstaller);
const proof={...json(snapshot+'/package-verification.json'),date:'2026-10-16',sourceFiles:files.length,allDocumentationFilesMatched:files.filter(p=>p.startsWith('docs/')).length,sourceSha256:hash(source),sourceRevision:note};
write(rel+'/package-verification.json',proof);write('evidence/v0.4/package-verification.json',proof);
const artifacts=[installer,source].map(p=>({path:p,bytes:fs.statSync(p).size,sha256:hash(p)}));
fs.writeFileSync(rel+'/SHA256SUMS.txt',artifacts.map(a=>a.sha256+'  '+path.basename(a.path)).join('\n')+'\n');
write(rel+'/delivery_manifest.json',{...json(rel+'/delivery_manifest.json'),...json(root+'/delivery_manifest.json'),artifacts,packageVerification:proof});
console.log(JSON.stringify({status:'PASS',artifacts,sourceFiles:files.length,sourceRevision:note},null,2));
