const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture,open}=require('./electron-background-test.cjs');
const exe=process.argv[2],out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
(async()=>{const runs=[];for(let i=0;i<3;i++){
 const profile=path.join(out,'profile-'+i);await fixture(profile);let app;
 try{const r=await open(exe,profile);app=r.app;
 await r.p.getByRole('button',{name:'+ Add flight',exact:true}).click();
 const input=r.p.getByPlaceholder('Code, airport, city or country').first();
 await input.fill('PEK');const start=performance.now();await r.p.getByRole('option').filter({hasText:'Beijing Capital'}).first().waitFor({timeout:30000});
 const searchMs=performance.now()-start;const map=await r.p.evaluate(()=>({frames:__ajMapDiagnostics.frames,drawn:__ajMapDiagnostics.drawnFrames}));
 assert.deepEqual(r.errors,[]);runs.push({uiMs:r.uiMs,globeMs:r.globeMs,searchMs,map});
 }finally{await app?.close();}
}const median=k=>runs.map(r=>r[k]).sort((a,b)=>a-b)[1];fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({exe,runs,median:{uiMs:median('uiMs'),globeMs:median('globeMs'),searchMs:median('searchMs')},method:'3 fresh isolated profiles/processes; same fixture; filesystem caches uncontrolled; sequential, no cold-machine claim; CDP hidden/offscreen'},null,2));console.log('Performance complete',out)})().catch(e=>{console.error(e);process.exitCode=1});
