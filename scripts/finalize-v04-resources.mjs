// Offline provenance and coverage inventory; no saved user data is read or changed.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const assets=read('src/airline-brand-assets.json'),manifest=read('public/logos/airlines/manifest.json');
delete assets.tway.names; // Historical T'way is not silently assigned the current identity.
for(const b of manifest.brands){
 if(b.key==='tway')delete b.names;
 if(b.directOfficialSvg)b.selectedSourceUrl=b.directOfficialSvg;
 else b.selectedSourceUrl=b.imageinfo?.descriptionurl||b.official;
 if(b.key==='air-niugini')delete b.presentationBackdrop;
 if(!b.included&&b.key==='spring')b.missing='The located SVG wraps a bitmap. Rejected; placeholder retained. No reliable standalone vector obtained.';
 b.defaultPresentation=assets[b.key]?.symbol?'Independent graphic (integral brand glyphs, e.g. TAP/Virgin/KQ, may retain lettering)':assets[b.key]?'Complete wordmark retained as default because no reliable independent graphic is supplied.':'Placeholder; no reliable vector resource supplied.';
 for(const v of ['full','symbol']){
  const p=`public/logos/airlines/${b.key}-${v}.svg`;
  if(assets[b.key]?.[v]&&fs.existsSync(p))b[v+'Sha256']=createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 }
}
write('src/airline-brand-assets.json',assets);write('public/logos/airlines/manifest.json',manifest);
write('public/data/airline-sources/v04-brand-research.json',manifest.brands.filter(b=>b.checked==='2026-10-15'&&fs.existsSync(`.tools/v0.4-sources/${b.key}-original.svg`)||b.key==='spring'));
const airlines=read('public/data/airlines-global.json'),meta=read('public/data/airlines-global-manifest.json');
meta.statusCounts=Object.fromEntries(['unknown','inactive','active'].map(s=>[s,airlines.filter(r=>(r.airlineStatus||'unknown')===s).length]));
write('public/data/airlines-global-manifest.json',meta);
const oldRegions={ 'air-china':'Asia','china-eastern':'Asia','china-southern':'Asia',lufthansa:'Europe',singapore:'Asia','air-france':'Europe',emirates:'Asia','british-airways':'Europe',united:'Americas',qantas:'Oceania',jal:'Asia',delta:'Americas',turkish:'Europe',qatar:'Asia',ana:'Asia',klm:'Europe',cathay:'Asia',swiss:'Europe','air-canada':'Americas',finnair:'Europe'};
const coverage={checked:'2026-10-15',fullMarks:Object.keys(assets).length,symbols:Object.values(assets).filter(b=>b.symbol).length,regions:{},missing:manifest.brands.filter(b=>!assets[b.key]).map(b=>({key:b.key,name:b.name,reason:b.missing})),limitations:'Fixed major-carrier selection, not every airline. Region groups are for browsing coverage, not political classification. Current-brand verification is partial; see each source record.'};
Object.assign(oldRegions,{'air-new-zealand':'Oceania',american:'Americas',southwest:'Americas',jetblue:'Americas'});
for(const [key,b]of Object.entries(assets)){const region=oldRegions[key]||manifest.brands.find(r=>r.key===key)?.region||'Asia';(coverage.regions[region]??=[]).push({key,name:b.name,code:b.code,symbol:!!b.symbol});}
coverage.symbolGaps=Object.entries(assets).filter(([,b])=>!b.symbol).map(([key,b])=>({key,name:b.name,code:b.code,default:'full wordmark',fullRetained:true,reason:'No verified standalone graphic obtained; retain the complete wordmark, as explicitly requested. Do not mutilate it or invent a symbol.'}));
write('public/data/airline-sources/v04-coverage.json',coverage);
console.log('Coverage',coverage.fullMarks,'full',coverage.symbols,'symbols',Object.fromEntries(Object.entries(coverage.regions).map(([k,v])=>[k,v.length])));
