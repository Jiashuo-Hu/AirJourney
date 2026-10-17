const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {open}=require('./electron-background-test.cjs');
const exe=process.argv[2],profile=path.resolve(process.argv[3]);fs.mkdirSync(profile,{recursive:true});
(async()=>{let app;try{const r=await open(exe,profile);app=r.app;
 await app.evaluate(async({BrowserWindow},args)=>{
  await process.mainModule.require(args.script)(BrowserWindow.getAllWindows()[0],args.profile);
 },{script:path.resolve('scripts/v05-legacy-flow.cjs'),profile});
 const report=JSON.parse(fs.readFileSync(path.join(profile,'smoke-results.json')));assert.equal(report.results.length,16);assert.ok(report.results.every(t=>t.status==='PASS'));assert.deepEqual(r.errors,[]);
 console.log('Legacy v0.5 adapted flows: 16 PASS');
}finally{await app?.close()}})().catch(e=>{console.error(e);fs.writeFileSync(path.join(profile,'runner-error.txt'),e.stack);process.exitCode=1});
