// Refresh source/documentation after independent acceptance and upload authorization.
// Does not rebuild the tested installer, use Git, or perform any network requests.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {zipSync,unzipSync} from 'fflate';
import asar from '@electron/asar';
const rel='release/v0.3',docs='docs/implementation/v0.3';
const source=rel+'/AirJourney-v0.3-source.zip',installer=rel+'/AirJourney-v0.3-x64-setup.exe';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const sha=b=>createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).filter(e=>e.name!=='__pycache__').flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name).replaceAll('\\','/')]);
const originalSha='457fcfeff6d485c77b89f337182bfe78efc205f43b35aa21e5df90203523987d';
const snapshot=rel+'/local-delivery-snapshot/AirJourney-v0.3-source.zip';
fs.mkdirSync(path.dirname(snapshot),{recursive:true});
if(!fs.existsSync(snapshot)){assert.equal(hash(source),originalSha);fs.copyFileSync(source,snapshot);}
assert.equal(hash(snapshot),originalSha);
assert.equal(hash(installer),'dc1a0417fda6bd092f0d5335b8ea9a5a27b2181691445efa372f93914afb696a');
const archive=rel+'/win-unpacked/resources/app.asar';let production=0;
for(const n of asar.listPackage(archive).map(n=>n.replaceAll('\\','/').replace(/^\//,''))){if((n.startsWith('dist/')||n.startsWith('desktop/'))&&fs.existsSync(n)&&fs.statSync(n).isFile()){assert.equal(sha(asar.extractFile(archive,path.normalize(n))),hash(n),'Runtime differs: '+n);production++;}}
assert.equal(production,693);
const priorEntries=unzipSync(fs.readFileSync(snapshot));
const install=json('evidence/v0.3/install.json');assert.equal(hash(path.join(path.dirname(install.installedExe),'resources/app.asar')),hash(archive));
const currentManifest={...json(docs+'/delivery_manifest.json'),localOnly:false,repositorySyncAuthorized:true,stage:'post-acceptance repository synchronization',releasePublished:false,artifactUploads:false,installerUnchanged:true,originalLocalSourceSha256:originalSha,originalLocalSourceSnapshot:snapshot,independentAcceptance:'docs/acceptance/20261015-v03-independent/report.md',repositorySyncNotes:'docs/implementation/github_sync_v0.3.md'};
write(docs+'/delivery_manifest.json',currentManifest);
let files=[...Object.keys(priorEntries),...['src','desktop','scripts','public','tests','docs','suggestions'].flatMap(walk),'README.md','update_log.txt'];
files=[...new Set(files)].filter(p=>fs.existsSync(p)&&!p.startsWith('docs/acceptance/evidence/')&&!/^docs\/acceptance\/.*\/data\//.test(p)&&!p.endsWith('.pyc'));
assert.ok(files.every(p=>!p.startsWith('.tools/')&&!p.startsWith('node_modules/')&&!p.startsWith('release/')));
const entries={};for(const p of files)entries[p]=[fs.readFileSync(p),{level:/\.(png|jpg|jpeg|ico|airjourney)$/i.test(p)?0:6}];
fs.writeFileSync(source,zipSync(entries));const recovered=unzipSync(fs.readFileSync(source));
for(const p of files)assert.equal(sha(recovered[p]),hash(p),'Source differs: '+p);
for(const p of ['docs/implementation/github_sync_v0.3.md','docs/acceptance/20261015-v03-independent/report.md','docs/acceptance/20261015-v03-independent/acceptance_results.csv','update_log.txt'])assert.ok(recovered[p]);
const proof={...json(rel+'/package-verification.json'),date:'2026-10-15',localOnly:false,noGitHubActions:false,repositorySyncAuthorized:true,releasePublished:false,artifactUploads:false,installerUnchanged:true,originalLocalSourceSha256:originalSha,sourceFiles:files.length,allDocumentationFilesMatched:files.filter(p=>p.startsWith('docs/')).length,productionFilesMatched:production,sourceSha256:hash(source),installerSha256:hash(installer),archiveSha256:hash(archive),installedArchiveMatches:true,status:'PASS'};
write(rel+'/package-verification.json',proof);write('evidence/v0.3/package-verification-post-acceptance.json',proof);
const artifacts=[installer,source].map(p=>({path:p,bytes:fs.statSync(p).size,sha256:hash(p)}));
fs.writeFileSync(rel+'/SHA256SUMS.txt',artifacts.map(a=>a.sha256+'  '+path.basename(a.path)).join('\n')+'\n');
write(rel+'/delivery_manifest.json',{...currentManifest,artifacts,packageVerification:proof});
console.log(JSON.stringify({artifacts,sourceFiles:files.length,documentationFiles:proof.allDocumentationFilesMatched,productionFilesMatched:production,originalSourceSnapshot:snapshot},null,2));
