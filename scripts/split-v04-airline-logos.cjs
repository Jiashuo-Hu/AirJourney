// Select complete closed contours, never crop a bitmap or clip a wordmark.
const fs=require('fs'),crypto=require('crypto');
const {chromium}=require(process.env.AIRJOURNEY_PLAYWRIGHT||'C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const rules={
 'air-new-zealand':{minX:180},thai:{maxX:110},eva:{minX:40},hainan:{maxX:60},
 shenzhen:{minX:210},xiamen:{maxY:24},vietnam:{maxX:31},malaysia:{minX:303},
 indigo:{minX:89},american:{minX:248,maxX:296},southwest:{minX:190},
 garuda:{maxY:3750},philippine:{maxX:116},
};
const relativeRules={iberia:{minX:.70},ryanair:{maxX:.125},tap:{maxX:.30},austrian:{minX:.74},brussels:{minX:.76},'aer-lingus':{minX:.81},'air-europa':{maxX:.28},aegean:{minX:.85},icelandair:{minX:.81},eurowings:{minX:.80,maxY:.50},condor:{minX:.82},'air-serbia':{maxX:.28},'air-india':{minX:.76},'china-airlines':{maxX:.20},starlux:{maxX:.24},'hong-kong-airlines':{maxX:.25},juneyao:{maxX:.27},'jin-air':{maxX:.23},tway:{maxX:.20},lion:{minX:.38,maxX:.64},saudia:{maxY:.61},oman:{minX:.77},gulf:{maxX:.38},'air-astana':{maxX:.20},hawaiian:{maxY:.65},westjet:{minX:.80},'air-transat':{maxX:.19},latam:{maxX:.17},avianca:{minX:.80},copa:{minX:.82},aeromexico:{maxX:.22},azul:{minX:.73},aerolineas:{maxY:.25},allegiant:{maxY:.45},'sun-country':{maxX:.12},breeze:{maxY:.50},'virgin-australia':{maxX:.40},jetstar:{minX:.70},fiji:{maxX:.18},aircalin:{maxX:.21},ethiopian:{minX:.72,maxY:.66},egyptair:{minX:.82},'royal-air-maroc':{maxY:.73},'virgin-atlantic':{minX:.79,maxY:.62},transavia:{maxX:.16},sunexpress:{maxX:.24},akasa:{maxX:.21},'south-african':{maxY:.70},'air-mauritius':{maxY:.48}};
Object.assign(relativeRules,{'air-serbia':{maxX:.30},starlux:{maxX:.30},eurowings:{minX:.76,maxY:.51},oman:{minX:.71},westjet:{minX:.79},'air-transat':{maxX:.21},avianca:{minX:.78},allegiant:{minX:.40,maxX:.73,maxY:.47},'sun-country':{maxX:.125},breeze:{maxY:.60},jetstar:{minX:.69},'air-astana':{maxX:.21},lion:{minX:.47,maxX:.71},fiji:{maxX:.20}});
delete relativeRules.gulf;
Object.assign(relativeRules,{norwegian:{minX:.85},gulf:{maxX:.33},'air-niugini':{maxX:.22}});
const contourRules={'hk-express':[0,1,2],lot:[1,2],peach:[2],'tigerair-taiwan':[2,3,13],bangkok:[20,21,22],cebu:[0,1,2,3,4],'air-tahiti-nui':[16,17],kenya:[10,11,12],'air-india':[12,13]};
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
const page=await browser.newPage();const manifest=JSON.parse(fs.readFileSync('public/logos/airlines/manifest.json')),assets=JSON.parse(fs.readFileSync('src/airline-brand-assets.json'));
const keys=JSON.parse(fs.readFileSync('public/data/airline-sources/v04-brand-research.json')).filter(b=>b.included).map(b=>b.key);
for(const key of keys){
 await page.setContent(fs.readFileSync('.tools/v0.4-sources/expanded/'+key+'-full.svg','utf8'));
 const result=await page.evaluate(({key,rule,relative,contours})=>{
  const svg=document.querySelector('svg'),inv=svg.getScreenCTM().inverse();const nodes=[...svg.querySelectorAll('path,rect,polygon,polyline,circle,ellipse,line')].filter(e=>!e.closest('defs,clipPath,mask'));
  const boxes=nodes.map(e=>{const b=e.getBBox(),m=inv.multiply(e.getScreenCTM());const ps=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));return{x:Math.min(...ps.map(p=>p.x)),y:Math.min(...ps.map(p=>p.y)),right:Math.max(...ps.map(p=>p.x)),bottom:Math.max(...ps.map(p=>p.y))};});
  if(relative){const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),w=Math.max(...boxes.map(b=>b.right))-x,h=Math.max(...boxes.map(b=>b.bottom))-y;rule=Object.fromEntries(Object.entries(relative).map(([k,v])=>[k,(k.endsWith('X')?x:y)+v*(k.endsWith('X')?w:h)]));}
  function make(indices){const root=svg.cloneNode(true);[...root.querySelectorAll('path,rect,polygon,polyline,circle,ellipse,line')].filter(e=>!e.closest('defs,clipPath,mask')).forEach((e,i)=>{if(!indices.includes(i))e.remove();});const bs=indices.map(i=>boxes[i]),x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y)),r=Math.max(...bs.map(b=>b.right)),b=Math.max(...bs.map(b=>b.bottom)),pad=Math.max(r-x,b-y)*.04;root.setAttribute('viewBox',`${x-pad} ${y-pad} ${r-x+2*pad} ${b-y+2*pad}`);
   if(['kenya','air-tahiti-nui'].includes(key)){const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const[k,v]of Object.entries({x:x-pad,y:y-pad,width:r-x+2*pad,height:b-y+2*pad,fill:key==='kenya'?'#17344e':'#2dccd3'}))bg.setAttribute(k,String(v));root.prepend(bg);}
   for(const g of root.querySelectorAll('[data-contour-group]')){const paths=[...g.children];if(paths.length){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',paths.map(p=>p.getAttribute('d')).join(' '));g.replaceChildren(p);}g.removeAttribute('data-contour-group');}for(const g of [...root.querySelectorAll('g')].reverse())if(!g.childElementCount&&!g.textContent.trim())g.remove();return new XMLSerializer().serializeToString(root);}
  const ids=nodes.map((_,i)=>i),selected=contours|| (rule?ids.filter(i=>{const b=boxes[i];return(rule.minX===undefined||b.x>=rule.minX)&&(rule.maxX===undefined||b.right<=rule.maxX)&&(rule.minY===undefined||b.y>=rule.minY)&&(rule.maxY===undefined||b.bottom<=rule.maxY);}):[]);
  return{full:make(ids),symbol:selected.length?make(selected):null,contours:selected.length,boxes};
 },{key,rule:rules[key],relative:relativeRules[key],contours:contourRules[key]});
 const a=assets[key],row=manifest.brands.find(b=>b.key===key);
 if(['kenya'].includes(key))row.presentationBackdrop='Navy presentation rectangle behind unmodified white artwork for visibility in both themes; original vector retained.';
 fs.writeFileSync('public/logos/airlines/'+key+'-full.svg',result.full+'\n');a.full='data:image/svg+xml;base64,'+Buffer.from(result.full).toString('base64');row.fullSha256=crypto.createHash('sha256').update(result.full+'\n').digest('hex');
 if(result.symbol){fs.writeFileSync('public/logos/airlines/'+key+'-symbol.svg',result.symbol+'\n');a.symbol='data:image/svg+xml;base64,'+Buffer.from(result.symbol).toString('base64');row.symbolPath='public/logos/airlines/'+key+'-symbol.svg';row.symbolContours=result.contours;row.symbolStatus='Complete vector contours selected; transforms, colors and holes retained; 4% optical margin; no clipping.';}
 else if(!a.symbol)row.symbolStatus='No verified independently separable graphic; complete wordmark/lockup retained.';
 fs.writeFileSync('.tools/v0.4-sources/'+key+'-bounds.json',JSON.stringify(result.boxes,null,2));console.log(key,'symbol contours',result.contours);
}
fs.writeFileSync('src/airline-brand-assets.json',JSON.stringify(assets)+'\n');fs.writeFileSync('public/logos/airlines/manifest.json',JSON.stringify(manifest,null,2)+'\n');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
