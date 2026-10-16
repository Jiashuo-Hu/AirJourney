// One-time preparation of a fixed, curated list. Never called by the app.
import fs from 'node:fs';
const out='.tools/v0.4-sources';fs.mkdirSync(out,{recursive:true});
const targets=[
 ['air-new-zealand','Air New Zealand','NZ','https://www.airnewzealand.com/','Air New Zealand logo.svg','air-new-zealand-2'],
 ['thai','Thai Airways','TG','https://www.thaiairways.com/','Thai Airways logo.svg','thai-airways'],
 ['eva','EVA Air','BR','https://www.evaair.com/en-global/index.html','EVA Air logo.svg','eva-air'],
 ['hainan','Hainan Airlines','HU','https://www.hainanairlines.com/','Hainan Airlines Logo.svg','hainan-airlines'],
 ['shenzhen','Shenzhen Airlines','ZH','https://global.shenzhenair.com/','Shenzhen Airlines logo.svg','shenzhen-airlines'],
 ['xiamen','Xiamen Airlines','MF','https://www.xiamenair.com/','XiamenAir.svg','xiamen-airlines'],
 ['vietnam','Vietnam Airlines','VN','https://www.vietnamairlines.com/','Vietnam Airlines logo 2015.svg','vietnam-airlines'],
 ['malaysia','Malaysia Airlines','MH','https://www.malaysiaairlines.com/','Malaysia Airlines Logo.svg','malaysia-airlines'],
 ['airasia','AirAsia','AK','https://www.airasia.com/','AirAsia New Logo.svg','airasia'],
 ['scoot','Scoot','TR','https://www.flyscoot.com/','Scoot logo.svg','scoot'],
 ['etihad','Etihad Airways','EY','https://www.etihad.com/','Etihad-airways-logo.svg','etihad-airways'],
 ['korean','Korean Air','KE','https://www.koreanair.com/','Korean Air 2025.svg','korean-air'],
 ['indigo','IndiGo','6E','https://www.goindigo.in/','IndiGo.svg','indigo'],
 ['american','American Airlines','AA','https://news.aa.com/','American Airlines logo 2013.svg','american-airlines'],
 ['southwest','Southwest Airlines','WN','https://www.southwest.com/','Southwest Airlines logo 2014.svg','southwest-airlines'],
 ['jetblue','JetBlue Airways','B6','https://www.jetblue.com/','JetBlue Airways Logo.svg','jetblue-airways'],
 ['garuda','Garuda Indonesia','GA','https://www.garuda-indonesia.com/','Garuda Indonesia Logo.svg','garuda-indonesia'],
 ['philippine','Philippine Airlines','PR','https://www.philippineairlines.com/','Philippine Airlines logo.svg','philippine-airlines'],
];
async function get(url){await new Promise(r=>setTimeout(r,4000));const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'AirJourney/0.4 local static brand research'}});if(!r.ok)throw Error('HTTP '+r.status+(r.headers.get('retry-after')?' Retry-After '+r.headers.get('retry-after'):''));return r;}
const rows=[];
const cache=fs.existsSync(out+'/brand-research.json')?JSON.parse(fs.readFileSync(out+'/brand-research.json')):[];
for(let i=0;i<targets.length;i+=1)await Promise.all(targets.slice(i,i+1).map(async([key,name,code,official,file,wvl])=>{
 const prior=cache.find(r=>r.key===key);
 const row=prior||{key,name,code,official,file,checked:'2026-10-15',worldvectorlogo:'https://worldvectorlogo.com/logo/'+wvl,worldvectorlogoUsage:'Reference only; terms limit personal/non-commercial use and modification/transfer. No WorldVectorLogo file copied into bundle.',termsUrl:'https://worldvectorlogo.com/terms-of-use'};
 if(row.svgBytes){rows.push(row);return;}
 row.file=file;
 if(row.imageinfo?.url)try{const raw=await(await get(row.imageinfo.url)).text();if(!/<svg[\s>]/i.test(raw)||/<image\b/i.test(raw))throw Error('Not vector');fs.writeFileSync(out+'/'+key+'-original.svg',raw);row.svgBytes=Buffer.byteLength(raw);rows.push(row);return;}catch(e){row.fetchError=String(e);}
 if(!prior)try{const t=await(await get(official)).text();fs.writeFileSync(out+'/'+key+'-official.html',t);row.officialStatus='HTTP 200';row.officialLogoLinks=[...t.matchAll(/(?:src|href)=["']([^"']*(?:logo|brand)[^"']*\.svg[^"']*)["']/gi)].map(m=>new URL(m[1],official).href).slice(0,12);}catch(e){row.officialStatus=String(e);}
 // Prefer a file with an attributable record. Do not infer a reuse license
 // from the fact that an official website exposes its logo.
 for(const host of ['commons.wikimedia.org','en.wikipedia.org']){
  try{const d=await(await get('https://'+host+'/w/api.php?action=query&format=json&redirects=1&prop=imageinfo&iiprop=url%7Cextmetadata&titles='+encodeURIComponent('File:'+file))).json();const p=Object.values(d.query.pages)[0];if(!p.imageinfo?.[0])continue;row.imageinfo=p.imageinfo[0];const raw=await(await get(row.imageinfo.url)).text();if(!/<svg[\s>]/i.test(raw)||/<image\b/i.test(raw))throw Error('Not a standalone vector');fs.writeFileSync(out+'/'+key+'-original.svg',raw);row.svgBytes=Buffer.byteLength(raw);break;}catch(e){row.fetchError=String(e);}
 }
 row.vectorStatus=row.svgBytes?'Attributable vector file obtained':'Missing; placeholder retained';rows.push(row);console.log(key,row.officialStatus,row.svgBytes||row.vectorStatus);
}));
// Current Korean Air identity has a separately supplied Taegeuk symbol.
const korean=rows.find(r=>r.key==='korean');
try{const d=await(await get('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&titles='+encodeURIComponent('File:Korean Air 2025 (Taegeuk).svg'))).json();korean.symbolImageinfo=Object.values(d.query.pages)[0].imageinfo[0];fs.writeFileSync(out+'/korean-symbol-original.svg',await(await get(korean.symbolImageinfo.url)).text());}catch(e){korean.symbolFetchError=String(e);}
fs.writeFileSync(out+'/brand-research.json',JSON.stringify(rows,null,2)+'\n');
