import fs from 'node:fs';
const dir='.tools/v0.4-sources',file=dir+'/brand-research.json',rows=JSON.parse(fs.readFileSync(file));
const official={jetsmart:'https://jetsmart.com/images/header/jetsmart-logo-colored-simple.svg',kenya:'https://www.kenya-airways.com/globalassets/commercial/kenya-airways-logo.svg'};
for(const r of rows.filter(r=>!r.svgBytes&&r.key!=='spring')){
 await new Promise(resolve=>setTimeout(resolve,8500));
 const url=official[r.key]||r.imageinfo?.url?.split('?')[0];if(!url)continue;
 try{const res=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'AirJourney/0.4 local airline resource preparation'}});if(!res.ok)throw Error('HTTP '+res.status);const raw=await res.text();if(!/<svg[\s>]/i.test(raw)||/<image\b/i.test(raw))throw Error('Not standalone vector');fs.writeFileSync(dir+'/'+r.key+'-original.svg',raw);r.svgBytes=Buffer.byteLength(raw);r.vectorStatus='Attributable vector obtained';if(official[r.key]){r.directOfficialSvg=url;r.directOfficialTerms='Official website asset; no general redistribution or modification license verified. Brand copyright and trademark retained.';}console.log(r.key,r.svgBytes);}catch(e){r.vectorStatus=String(e);console.log(r.key,r.vectorStatus);}
 fs.writeFileSync(file,JSON.stringify(rows,null,2)+'\n');
}
console.log('Targets',rows.length,'obtained',rows.filter(r=>r.svgBytes).length);
