// A fixed regional coverage list, not an airline/flight crawler. Development only.
import fs from 'node:fs';
const dir='.tools/v0.4-sources';
const target=[
 ['iberia','Iberia','IB','Iberia (airline)','https://www.iberia.com/','Europe',['Iberia Airlines']],
 ['vueling','Vueling','VY','Vueling','https://www.vueling.com/','Europe'],
 ['easyjet','easyJet','U2','EasyJet','https://www.easyjet.com/','Europe'],
 ['ryanair','Ryanair','FR','Ryanair','https://www.ryanair.com/','Europe'],
 ['sas','Scandinavian Airlines','SK','Scandinavian Airlines','https://www.flysas.com/','Europe',['Scandinavian Airlines System','SAS']],
 ['lot','LOT Polish Airlines','LO','LOT Polish Airlines','https://www.lot.com/','Europe'],
 ['tap','TAP Air Portugal','TP','TAP Air Portugal','https://www.flytap.com/','Europe',['TAP Portugal']],
 ['austrian','Austrian Airlines','OS','Austrian Airlines','https://www.austrian.com/','Europe'],
 ['brussels','Brussels Airlines','SN','Brussels Airlines','https://www.brusselsairlines.com/','Europe'],
 ['aer-lingus','Aer Lingus','EI','Aer Lingus','https://www.aerlingus.com/','Europe'],
 ['air-europa','Air Europa','UX','Air Europa','https://www.aireuropa.com/','Europe'],
 ['ita','ITA Airways','AZ','ITA Airways','https://www.ita-airways.com/','Europe'],
 ['aegean','Aegean Airlines','A3','Aegean Airlines','https://en.aegeanair.com/','Europe'],
 ['icelandair','Icelandair','FI','Icelandair','https://www.icelandair.com/','Europe'],
 ['airbaltic','airBaltic','BT','AirBaltic','https://www.airbaltic.com/','Europe',['Air Baltic']],
 ['wizz','Wizz Air','W6','Wizz Air','https://wizzair.com/','Europe'],
 ['norwegian','Norwegian Air Shuttle','DY','Norwegian Air Shuttle','https://www.norwegian.com/','Europe'],
 ['eurowings','Eurowings','EW','Eurowings','https://www.eurowings.com/','Europe'],
 ['condor','Condor','DE','Condor (airline)','https://www.condor.com/','Europe',['Condor Flugdienst']],
 ['air-serbia','Air Serbia','JU','Air Serbia','https://www.airserbia.com/','Europe'],
 ['air-india','Air India','AI','Air India','https://www.airindia.com/','Asia'],
 ['china-airlines','China Airlines','CI','China Airlines','https://www.china-airlines.com/','Asia'],
 ['asiana','Asiana Airlines','OZ','Asiana Airlines','https://flyasiana.com/','Asia'],
 ['starlux','STARLUX Airlines','JX','Starlux Airlines','https://www.starlux-airlines.com/','Asia'],
 ['hk-express','HK Express','UO','HK Express','https://www.hkexpress.com/','Asia',['Hong Kong Express Airways']],
 ['hong-kong-airlines','Hong Kong Airlines','HX','Hong Kong Airlines','https://www.hongkongairlines.com/','Asia'],
 ['juneyao','Juneyao Air','HO','Juneyao Air','https://www.juneyaoair.com/','Asia',['Juneyao Airlines']],
 ['spring','Spring Airlines','9C','Spring Airlines','https://en.ch.com/','Asia'],
 ['peach','Peach Aviation','MM','Peach Aviation','https://www.flypeach.com/','Asia',['Peach']],
 ['tigerair-taiwan','Tigerair Taiwan','IT','Tigerair Taiwan','https://www.tigerairtw.com/','Asia'],
 ['jeju','Jeju Air','7C','Jeju Air','https://www.jejuair.net/','Asia'],
 ['jin-air','Jin Air','LJ','Jin Air','https://www.jinair.com/','Asia'],
 ['tway',"T'way Air",'TW',"T'way Air",'https://www.twayair.com/','Asia',["Tway Airlines"]],
 ['vietjet','VietJet Air','VJ','VietJet Air','https://www.vietjetair.com/','Asia',['VietJetAir']],
 ['bangkok','Bangkok Airways','PG','Bangkok Airways','https://www.bangkokair.com/','Asia'],
 ['cebu','Cebu Pacific','5J','Cebu Pacific','https://www.cebupacificair.com/','Asia'],
 ['lion','Lion Air','JT','Lion Air','https://www.lionair.co.id/','Asia'],
 ['saudia','Saudia','SV','Saudia','https://www.saudia.com/','Asia',['Saudi Arabian Airlines']],
 ['oman','Oman Air','WY','Oman Air','https://www.omanair.com/','Asia'],
 ['gulf','Gulf Air','GF','Gulf Air','https://www.gulfair.com/','Asia'],
 ['flydubai','flydubai','FZ','Flydubai','https://www.flydubai.com/','Asia'],
 ['air-arabia','Air Arabia','G9','Air Arabia','https://www.airarabia.com/','Asia'],
 ['air-astana','Air Astana','KC','Air Astana','https://airastana.com/','Asia'],
 ['alaska','Alaska Airlines','AS','Alaska Airlines','https://www.alaskaair.com/','Americas'],
 ['hawaiian','Hawaiian Airlines','HA','Hawaiian Airlines','https://www.hawaiianairlines.com/','Americas'],
 ['westjet','WestJet','WS','WestJet','https://www.westjet.com/','Americas'],
 ['air-transat','Air Transat','TS','Air Transat','https://www.airtransat.com/','Americas'],
 ['porter','Porter Airlines','PD','Porter Airlines','https://www.flyporter.com/','Americas'],
 ['latam','LATAM Airlines','LA','LATAM Airlines','https://www.latamairlines.com/','Americas'],
 ['avianca','Avianca','AV','Avianca','https://www.avianca.com/','Americas'],
 ['copa','Copa Airlines','CM','Copa Airlines','https://www.copaair.com/','Americas'],
 ['aeromexico','Aeroméxico','AM','Aeroméxico','https://www.aeromexico.com/','Americas',['Aeromexico']],
 ['gol','GOL Linhas Aéreas','G3','Gol Linhas Aéreas Inteligentes','https://www.voegol.com.br/','Americas',['Gol Transportes Aéreos']],
 ['azul','Azul Brazilian Airlines','AD','Azul Brazilian Airlines','https://www.voeazul.com.br/','Americas',['Azul']],
 ['aerolineas','Aerolíneas Argentinas','AR','Aerolíneas Argentinas','https://www.aerolineas.com/','Americas',['Aerolineas Argentinas']],
 ['jetsmart','JetSMART','JA','JetSmart','https://jetsmart.com/','Americas'],
 ['frontier','Frontier Airlines','F9','Frontier Airlines','https://www.flyfrontier.com/','Americas'],
 ['spirit','Spirit Airlines','NK','Spirit Airlines','https://www.spirit.com/','Americas'],
 ['allegiant','Allegiant Air','G4','Allegiant Air','https://www.allegiantair.com/','Americas'],
 ['sun-country','Sun Country Airlines','SY','Sun Country Airlines','https://www.suncountry.com/','Americas'],
 ['breeze','Breeze Airways','MX','Breeze Airways','https://www.flybreeze.com/','Americas'],
 ['virgin-australia','Virgin Australia','VA','Virgin Australia','https://www.virginaustralia.com/','Oceania'],
 ['jetstar','Jetstar Airways','JQ','Jetstar','https://www.jetstar.com/','Oceania'],
 ['fiji','Fiji Airways','FJ','Fiji Airways','https://www.fijiairways.com/','Oceania'],
 ['air-tahiti-nui','Air Tahiti Nui','TN','Air Tahiti Nui','https://www.airtahitinui.com/','Oceania'],
 ['aircalin','Aircalin','SB','Aircalin','https://www.aircalin.com/','Oceania'],
 ['air-niugini','Air Niugini','PX','Air Niugini','https://www.airniugini.com.pg/','Oceania'],
 ['ethiopian','Ethiopian Airlines','ET','Ethiopian Airlines','https://www.ethiopianairlines.com/','Africa'],
 ['kenya','Kenya Airways','KQ','Kenya Airways','https://www.kenya-airways.com/','Africa'],
 ['egyptair','Egyptair','MS','Egyptair','https://www.egyptair.com/','Africa',['EgyptAir']],
 ['royal-air-maroc','Royal Air Maroc','AT','Royal Air Maroc','https://www.royalairmaroc.com/','Africa'],
];
let rows=JSON.parse(fs.readFileSync(dir+'/brand-research.json'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'AirJourney/0.4 fixed local vector research'}});if(!r.ok){const err=Error('HTTP '+r.status);err.retry=r.headers.get('retry-after');throw err;}return r;}
// Batch title discovery prevents one API request per missing filename.
for(let i=0;i<target.length;i+=15){const batch=target.slice(i,i+15).filter(([key])=>!rows.find(r=>r.key===key));if(!batch.length)continue;await wait(4500);
 const titles=batch.map(t=>t[3]).join('|');let pages=[];
 try{const d=await(await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=revisions&rvprop=content&rvsection=0&rvslots=main&titles='+encodeURIComponent(titles))).json();pages=Object.values(d.query.pages);}catch(e){console.log('Title batch',e.message,e.retry||'');}
 for(const [key,name,code,article,official,region,names]of batch){const p=pages.find(p=>p.title.toLowerCase()===article.toLowerCase())||pages.find(p=>p.title.replace(/ \(airline\)$/,'').toLowerCase()===article.replace(/ \(airline\)$/,'').toLowerCase());const text=p?.revisions?.[0]?.slots?.main?.['*']||'';let file=text.match(/\|\s*logo\s*=\s*([^\n]+)/i)?.[1]?.trim().replace(/^\[\[(?:File:)?/i,'').replace(/\|.*$/,'').replace(/\]\]$/,'');rows.push({key,name,code,article:'https://en.wikipedia.org/wiki/'+encodeURIComponent(article),official,region,names:names||[],file,checked:'2026-10-15',vectorStatus:'Pending fixed-list lookup',worldvectorlogoUsage:'Not downloaded: site terms do not grant general modification/transfer rights.',termsUrl:'https://worldvectorlogo.com/terms-of-use'});}
}
fs.writeFileSync(dir+'/regional-targets.json',JSON.stringify(target,null,2)+'\n');
const pending=rows.filter(r=>target.some(t=>t[0]===r.key)&&!r.svgBytes);
for(let i=0;i<pending.length;i+=10){const batch=pending.slice(i,i+10),files=batch.filter(r=>r.file?.toLowerCase().endsWith('.svg'));for(const host of ['commons.wikimedia.org','en.wikipedia.org']){const remaining=files.filter(r=>!r.imageinfo);if(!remaining.length)continue;await wait(5500);try{const d=await(await get('https://'+host+'/w/api.php?action=query&format=json&redirects=1&prop=imageinfo&iiprop=url%7Cextmetadata&titles='+encodeURIComponent(remaining.map(r=>'File:'+r.file).join('|')))).json();for(const p of Object.values(d.query.pages)){if(!p.imageinfo?.[0])continue;const match=remaining.find(r=>('File:'+r.file).replaceAll('_',' ').toLowerCase()===p.title.replaceAll('_',' ').toLowerCase());if(match)match.imageinfo=p.imageinfo[0];}}catch(e){console.log('Metadata batch',host,e.message,e.retry||'');}}
 for(const r of batch){if(!r.imageinfo){r.vectorStatus='No attributable SVG found in fixed lookup; placeholder until official vector is reviewed';continue;}try{await wait(1200);const raw=await(await get(r.imageinfo.url)).text();if(!/<svg[\s>]/i.test(raw)||/<image\b/i.test(raw))throw Error('No standalone vector');fs.writeFileSync(dir+'/'+r.key+'-original.svg',raw);r.svgBytes=Buffer.byteLength(raw);r.vectorStatus='Attributable vector obtained';}catch(e){r.vectorStatus=String(e);}console.log(r.key,r.svgBytes||r.vectorStatus);}
 fs.writeFileSync(dir+'/brand-research.json',JSON.stringify(rows,null,2)+'\n');
}
// Official pages are separate sources; no assumption that HTTP 200 grants reuse.
for(let i=0;i<pending.length;i+=4)await Promise.all(pending.slice(i,i+4).map(async r=>{try{const raw=await(await get(r.official)).text();fs.writeFileSync(dir+'/'+r.key+'-official.html',raw);r.officialStatus='HTTP 200';r.officialLogoLinks=[...raw.matchAll(/(?:src|href)=["']([^"']*(?:logo|brand)[^"']*\.svg[^"']*)["']/gi)].map(m=>{try{return new URL(m[1],r.official).href}catch{return''}}).filter(Boolean).slice(0,8);}catch(e){r.officialStatus=String(e);}}));
fs.writeFileSync(dir+'/brand-research.json',JSON.stringify(rows,null,2)+'\n');
console.log('Regional additions',pending.length,'vectors',pending.filter(r=>r.svgBytes).length);
