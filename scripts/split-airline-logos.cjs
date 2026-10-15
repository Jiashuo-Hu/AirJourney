const fs=require('fs');const {chromium}=require('C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const rules={'air-china':{maxX:155},'china-eastern':{maxX:15},'china-southern':{maxX:185},'lufthansa':{maxX:600},'air-france':{minX:164},'british-airways':{minX:140,maxY:23},'united':{minX:730},'qantas':{maxX:36},'delta':{maxX:39,maxY:36},'turkish':{maxX:28},'qatar':{minX:208},'klm':{maxY:16},'cathay':{maxX:51},'swiss':{maxX:47},'air-canada':{maxX:23}};
rules.jal={maxX:18};
rules.united={minX:700};
// The source has two complete bird contours to the right of the separate
// speedline and blue wordmark. Retain both bird contours without clipping.
rules.singapore={minX:255};
rules.emirates={maxY:65}; // Complete Arabic calligraphic mark above the English baseline.
rules.ana={minX:194}; // Both complete blue/cyan tail-stripe shapes; no ANA lettering.
rules['british-airways']={minX:140,maxY:26};
(async()=>{
const browser=await chromium.launch({headless:true,channel:'chrome'}),p=await browser.newPage();
const manifest=JSON.parse(fs.readFileSync('public/logos/airlines/manifest.json'));
const assets=JSON.parse(fs.readFileSync('src/airline-brand-assets.json'));
for(const [key,b] of Object.entries(assets)) {
 const raw=fs.readFileSync('.tools/v0.3-sources/expanded/'+key+'-full.svg','utf8');
 await p.setContent(raw);const result=await p.evaluate(({rule,key})=>{
 const svg=document.querySelector('svg'),all=[...svg.querySelectorAll('path,polygon,polyline,circle,ellipse,rect,line')].filter(e=>!e.closest('defs,clipPath,mask'));
 const inverse=svg.getScreenCTM().inverse(),measured=new Map();
 const box=e=>{if(measured.has(e))return measured.get(e);const b=e.getBBox(),m=inverse.multiply(e.getScreenCTM());const pts=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));const result={x:Math.min(...pts.map(p=>p.x)),y:Math.min(...pts.map(p=>p.y)),right:Math.max(...pts.map(p=>p.x)),bottom:Math.max(...pts.map(p=>p.y))};measured.set(e,result);return result;};
 const normalize=(root,nodes)=>{if(!nodes.length)throw Error('Empty mark: '+key);const bs=nodes.map(box),x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y)),r=Math.max(...bs.map(b=>b.right)),b=Math.max(...bs.map(b=>b.bottom)),pad=Math.max(r-x,b-y)*.015;root.setAttribute('viewBox',`${x-pad} ${y-pad} ${r-x+pad*2} ${b-y+pad*2}`);};
 // Remove only complete contours; no rectangular clipping or geometry stretching.
 let symbol=null,kept=0;const selected=rule?all.filter(e=>{const b=box(e);return(rule.minX===undefined||b.x>=rule.minX)&&(rule.maxX===undefined||b.right<=rule.maxX)&&(rule.maxY===undefined||b.bottom<=rule.maxY);}):[];
 if(selected.length){normalize(svg,selected);const clone=svg.cloneNode(true),paths=[...clone.querySelectorAll('path,polygon,polyline,circle,ellipse,rect,line')].filter(e=>!e.closest('defs,clipPath,mask'));paths.forEach((e,i)=>{if(!selected.includes(all[i]))e.remove();});symbol=clone.outerHTML;kept=selected.length;}
 // A Delta newsroom lockup contains extra newsroom and alliance lettering.
 // The supplied corporate lockup retains the actual Delta mark + name only.
 let full=svg.cloneNode(true);if(key==='delta'){const selectedFull=all.filter(e=>{const b=box(e);return b.bottom<=36&&b.right<193;});normalize(svg,selectedFull);full=svg.cloneNode(true);[...full.querySelectorAll('path,polygon,polyline,circle,ellipse,rect,line')].filter(e=>!e.closest('defs,clipPath,mask')).forEach((e,i)=>{if(!selectedFull.includes(all[i]))e.remove();});}
 else {normalize(svg,all);full=svg.cloneNode(true);}
 const recombine=markup=>{const doc=new DOMParser().parseFromString(markup,'image/svg+xml');for(const g of doc.querySelectorAll('[data-contour-group]')){const contours=[...g.children];if(contours.length){const p=doc.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',contours.map(c=>c.getAttribute('d')).join(' '));g.replaceChildren(p);}g.removeAttribute('data-contour-group');}for(const g of [...doc.querySelectorAll('g')].reverse()){if(!g.childElementCount&&!g.textContent.trim())g.remove();}if(doc.querySelector('parsererror'))throw Error('Invalid vector XML: '+key);return new XMLSerializer().serializeToString(doc.documentElement);};
 return {symbol:symbol?recombine(symbol):null,full:recombine(full.outerHTML),kept,total:all.length};
 },{rule:rules[key],key});
 fs.writeFileSync('public/logos/airlines/'+key+'-full.svg',result.full+'\n');b.full='data:image/svg+xml;base64,'+Buffer.from(result.full).toString('base64');
 const row=manifest.brands.find(r=>r.key===key);row.fullSha256=require('crypto').createHash('sha256').update(result.full+'\n').digest('hex');
 if(key==='singapore')row.symbolDerivation='Two complete gold bird contours retained from the original SVG; separate speedline and blue company lettering excluded. No clipping or geometry stretching. Original and full lockup retained. Checked 2026-10-15.';
 if(key==='emirates')row.symbolDerivation='Complete upper Arabic calligraphic mark retained; lower English Emirates lettering and its dot excluded by complete-contour selection. Original and full lockup retained. Checked 2026-10-15.';
 if(key==='ana')row.symbolDerivation='Both complete blue/cyan tail-stripe contours retained; ANA lettering excluded. Original and full lockup retained. Checked 2026-10-15.';
 if(result.symbol){fs.writeFileSync('public/logos/airlines/'+key+'-symbol.svg',result.symbol+'\n');b.symbol='data:image/svg+xml;base64,'+Buffer.from(result.symbol).toString('base64');row.symbolStatus='Complete closed vector contours extracted; transforms retained; viewBox fits all selected geometry with margin';row.symbolPath='public/logos/airlines/'+key+'-symbol.svg';row.symbolContours=result.kept;}
 else row.symbolStatus=key==='singapore'?'Full mark retained: symbol connects to extended underline; no clean isolated variant obtained':key==='emirates'?'Full calligraphic/word mark retained; not misrepresented as a separate pictogram':'Wordmark retained; no reliable separate symbol obtained';
 console.log(key,result.kept+'/'+result.total);
}
fs.writeFileSync('src/airline-brand-assets.json',JSON.stringify(assets)+'\n');fs.writeFileSync('public/logos/airlines/manifest.json',JSON.stringify(manifest,null,2)+'\n');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
