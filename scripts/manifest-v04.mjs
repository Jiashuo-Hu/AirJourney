// Local, deterministic inventory of the actual prepared resources and runtime.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='docs/implementation/v0.4';
fs.mkdirSync(root,{recursive:true});
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name).replaceAll('\\','/')]);
const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=(p,h,r)=>fs.writeFileSync(p,[h,...r].map(r=>r.map(q).join(',')).join('\n')+'\n');
const brands=JSON.parse(fs.readFileSync('public/logos/airlines/manifest.json')).brands;
const rows=[];
for(const p of [...walk('dist'),...walk('release/v0.4/win-unpacked')]){
 let category='application',source='AirJourney source',license='Project source; bundled third-party notices apply',notes='Local production file';
 if(p.includes('/airline-sources/')||p.includes('airlines-global')){category='airline-reference';source='https://openflights.org/data.php; https://www.wikidata.org/';license='OpenFlights ODbL 1.0 / DbCL 1.0; Wikidata CC0; mixed source snapshots';notes='7764 records; not a current or authoritative IATA register; see airlines-global-manifest.json';}
 if(p.includes('/logos/airlines/')){const b=brands.find(b=>p.includes('/'+b.key+'-'));category='airline-brand-vector';source=b?.selectedSourceUrl||b?.imageinfo?.descriptionurl||b?.official||'public/logos/airlines/manifest.json';license=b?.chosenUsage||'Per-file copyright/trademark restrictions; consult manifest';notes=b?.officialUseRestriction||'Originals and full lockups retained; symbol if available; no blanket redistribution or commercial permission';}
 else if(p.includes('/logos/')){category='legacy-alliance-brand';source='docs/implementation/v0.2/asset_registry.csv';license='Per-file original copyright and trademark statements; see legacy registry';}
 if(p.includes('airports-global')){category='airport-reference';source='https://ourairports.com/data/';license='Public domain; no accuracy/completeness warranty';notes='86242 supplied records; source coordinates; fixed location policy; unchanged from v0.2';}
 if(p.includes('/maps/')||p.includes('NaturalEarthII')){category='static-map';source='https://www.naturalearthdata.com/downloads/50m-raster-data/50m-natural-earth-2/';license='Natural Earth public domain; Cesium dependency notices apply';notes='Local natural-color/shaded relief; geographic tiles levels 0–3, 512px; no authoritative mainland-standard political boundary layer';}
 else if(p.includes('/cesium/')){category='cesium-runtime';source='https://github.com/CesiumGS/cesium';license='Apache-2.0 and bundled third-party notices';}
 if(p.includes('inter-')){category='font';source='https://github.com/rsms/inter';license='SIL OFL 1.1';}
 if(p.includes('app-logo')||p.includes('app-icon')||p.includes('/icons/app-')){category='standard-app-logo';source='public/app-logo.svg';license='AirJourney project artwork';notes='All sizes derived from the same standard artwork; transparent corners';}
 if(p.startsWith('release/')){category='desktop-runtime';source='https://github.com/electron/electron/releases/tag/v38.2.0';license='Electron MIT; Chromium/third-party LICENSES.chromium.html; app.asar has application/resource notices';notes='Actual Windows x64 distribution; unsigned; archive contents independently checked by deliver-v04.mjs';}
 rows.push([p,category,'v0.4',source,license,hash(p),fs.statSync(p).size,notes]);
}
csv(root+'/resource_manifest.csv',['local_path','category','package_version','source','license','sha256','size_bytes','limitations_and_notes'],rows);
csv(root+'/asset_registry.csv',['brand_key','name','code','variant','local_path','source_page','official_page','checked','license_and_conditions','modifications','sha256','limitations'],brands.flatMap(b=>['full','symbol'].flatMap(v=>{const p='public/logos/airlines/'+b.key+'-'+v+'.svg';if(!fs.existsSync(p))return[];return[[b.key,b.name,b.code,v,p,b.selectedSourceUrl||b.imageinfo?.descriptionurl||b.official,b.official,b.checked,b.chosenUsage+' '+(b.officialUseRestriction||''),v==='symbol'?(b.symbolDerivation||b.symbolStatus):(b.fullDerivation||'Sanitized vector; fitted bounds; original retained'),hash(p),(b.currentBrandCheck||'')+' '+(b.defaultPresentation||'')+' '+(b.presentationBackdrop||'')]];})));
console.log('Resource inventory',rows.length,'files;',brands.length,'brand records');
