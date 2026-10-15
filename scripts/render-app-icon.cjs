// One canonical existing blue/white arrow logo; rasterization only, no redrawing.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.AIRJOURNEY_PLAYWRIGHT||'C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const p=await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});
 const svg=fs.readFileSync('public/app-logo.svg','utf8');
 await p.setContent('<style>html,body{margin:0;background:transparent}svg{width:512px;height:512px;display:block}</style>'+svg);
 await p.screenshot({path:path.resolve('public/app-icon.png'),omitBackground:true});
 await browser.close();
 console.log('Rendered canonical SVG to transparent 512px PNG');
})().catch(e=>{console.error(e);process.exit(1);});
