// Finish the same fixed coverage list after API templates/HTTP 429 responses.
// No rate-limit bypass: serialize downloads and honor Retry-After/backoff.
import fs from 'node:fs';
const dir='.tools/v0.4-sources',file=dir+'/brand-research.json';let rows=JSON.parse(fs.readFileSync(file));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(22000),headers:{'User-Agent':'AirJourney/0.4 fixed local vector research'}});if(!r.ok){const e=Error('HTTP '+r.status);e.status=r.status;e.retry=Number(r.headers.get('retry-after'))||30;throw e;}return r;}
for(const [key,name,code,article,official,region] of [
 ['virgin-atlantic','Virgin Atlantic','VS','Virgin Atlantic','https://www.virginatlantic.com/','Europe'],
 ['transavia','Transavia','HV','Transavia','https://www.transavia.com/','Europe'],
 ['pegasus','Pegasus Airlines','PC','Pegasus Airlines','https://www.flypgs.com/','Europe'],
 ['sunexpress','SunExpress','XQ','SunExpress','https://www.sunexpress.com/','Europe'],
 ['akasa','Akasa Air','QP','Akasa Air','https://www.akasaair.com/','Asia'],
 ['south-african','South African Airways','SA','South African Airways','https://www.flysaa.com/','Africa'],
 ['air-mauritius','Air Mauritius','MK','Air Mauritius','https://www.airmauritius.com/','Africa'],
])if(!rows.some(r=>r.key===key))rows.push({key,name,code,article:'https://en.wikipedia.org/wiki/'+encodeURIComponent(article),official,region,checked:'2026-10-15',worldvectorlogoUsage:'Reference terms checked; no file copied from WorldVectorLogo.',termsUrl:'https://worldvectorlogo.com/terms-of-use'});
for(const r of rows){if(r.file)r.file=r.file.replace(/^File:/i,'').match(/^.*?\.svg/i)?.[0]||r.file;}
const fixes={ita:'ITA Airways Logo.svg',aegean:'Aegean Airlines Logo 2020.svg',gol:'Gol Linhas Aéreas Inteligentes logo (2015, without the slogan).svg'};
for(const r of rows)if(fixes[r.key])r.file=fixes[r.key];
const trinity=rows.find(r=>r.key==='tway');trinity.name='Trinity Airways';trinity.file='Trinity Airways.svg';trinity.official='https://www.trinityairways.com/';trinity.article='https://en.wikipedia.org/wiki/Trinity_Airways';trinity.brandVerificationSource='https://www.trinityairways.com/app/company/NEWS/retrieve/4080';trinity.historicalBrand='T’way Air until 2026-09-09; existing references/snapshots are not renamed.';
const discover=rows.filter(r=>!r.file||!r.file.toLowerCase().endsWith('.svg'));
if(discover.length){await wait(6000);const d=await(await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=revisions&rvprop=content&rvsection=0&rvslots=main&titles='+encodeURIComponent(discover.map(r=>decodeURIComponent(r.article.split('/wiki/')[1])).join('|')))).json();for(const p of Object.values(d.query.pages)){const r=discover.find(r=>decodeURIComponent(r.article.split('/wiki/')[1]).replaceAll('_',' ').toLowerCase()===p.title.toLowerCase());if(!r)continue;const text=p.revisions?.[0]?.slots?.main?.['*']||'',block=text.match(/\|\s*logo\s*=([\s\S]{0,500})/i)?.[1]||'';r.file=block.match(/(?:File:)?([^=\n|{}\[\]]{2,130}\.svg)/i)?.[1]?.trim();}}
const needs=rows.filter(r=>!r.svgBytes&&r.file?.toLowerCase().endsWith('.svg'));
function norm(s){return s.replaceAll('_',' ').toLowerCase();}
for(let i=0;i<needs.length;i+=12){const batch=needs.slice(i,i+12);for(const host of ['commons.wikimedia.org','en.wikipedia.org']){const remaining=batch.filter(r=>!r.imageinfo);if(!remaining.length)continue;await wait(6000);try{const d=await(await get('https://'+host+'/w/api.php?action=query&format=json&redirects=1&prop=imageinfo&iiprop=url%7Cextmetadata&titles='+encodeURIComponent(remaining.map(r=>'File:'+r.file).join('|')))).json();const aliases=[...(d.query.normalized||[]),...(d.query.redirects||[])];for(const r of remaining){let title='File:'+r.file;for(let j=0;j<8;j++){const a=aliases.find(a=>norm(a.from)===norm(title));if(!a)break;title=a.to;}const p=Object.values(d.query.pages).find(p=>norm(p.title)===norm(title));if(p?.imageinfo?.[0])r.imageinfo=p.imageinfo[0];}}catch(e){console.log('Metadata',host,e.message);if(e.status===429)await wait(Math.min(60000,e.retry*1000));}}
}
fs.writeFileSync(file,JSON.stringify(rows,null,2)+'\n');
for(const r of needs){if(!r.imageinfo)continue;await wait(7500);for(let attempt=0;attempt<2;attempt++){try{const raw=await(await get(r.imageinfo.url)).text();if(!/<svg[\s>]/i.test(raw)||/<image\b/i.test(raw))throw Error('No standalone vector');fs.writeFileSync(dir+'/'+r.key+'-original.svg',raw);r.svgBytes=Buffer.byteLength(raw);r.vectorStatus='Attributable vector obtained';console.log(r.key,r.svgBytes);break;}catch(e){r.vectorStatus=String(e);console.log(r.key,r.vectorStatus);if(e.status!==429||attempt===1)break;await wait(Math.min(60000,e.retry*1000));}}fs.writeFileSync(file,JSON.stringify(rows,null,2)+'\n');}
const official=rows.filter(r=>!r.officialStatus);for(let i=0;i<official.length;i+=3)await Promise.all(official.slice(i,i+3).map(async r=>{try{const t=await(await get(r.official)).text();fs.writeFileSync(dir+'/'+r.key+'-official.html',t);r.officialStatus='HTTP 200';}catch(e){r.officialStatus=String(e);}}));
fs.writeFileSync(file,JSON.stringify(rows,null,2)+'\n');console.log('Total fixed v0.4 targets',rows.length,'vectors',rows.filter(r=>r.svgBytes).length);
