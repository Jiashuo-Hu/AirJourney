// Isolated profiles and CDP only; no native desktop input or window activation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron}=require(process.env.AIRJOURNEY_PLAYWRIGHT||'C:/Users/hjs20/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sql=require('sql.js');
async function fixture(profile,mutate=s=>s){
 fs.mkdirSync(profile,{recursive:true});const SQL=await sql({locateFile:f=>require.resolve('sql.js/dist/'+f)});
 const old=new SQL.Database(fs.readFileSync('tests/fixtures/v01-journal.sqlite'));
 const state=mutate(JSON.parse(old.exec('SELECT json FROM state WHERE id=1')[0].values[0][0]));old.close();
 const db=new SQL.Database();db.run('CREATE TABLE state(id INTEGER PRIMARY KEY,json TEXT NOT NULL)');db.run('INSERT INTO state VALUES(1,?)',[JSON.stringify(state)]);fs.writeFileSync(path.join(profile,'airjourney.sqlite'),Buffer.from(db.export()));db.close();return JSON.parse(JSON.stringify(state));
}
async function open(exe,profile,testing=true){
 const env={...process.env,AIRJOURNEY_TEST_DIR:path.resolve(profile),AIRJOURNEY_BACKGROUND_TEST:'1',AIRJOURNEY_SMOKE:'1',AIRJOURNEY_UI_TEST:'1'};
 delete env.ELECTRON_RUN_AS_NODE;delete env.AIRJOURNEY_BENCHMARK;
 if(!testing){delete env.AIRJOURNEY_SMOKE;delete env.AIRJOURNEY_UI_TEST;}
 const start=performance.now();const app=await _electron.launch({executablePath:path.resolve(exe),env,args:["--force-device-scale-factor=1"]});const p=await app.firstWindow();
 assert.ok(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().every(w=>!w.isVisible()&&!w.isFocused())), 'No test window may show/focus');
 const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.emulateMedia({reducedMotion:'no-preference'});
 await p.getByRole('button',{name:'+ Add flight',exact:true}).waitFor();const uiMs=performance.now()-start;
 if(testing)await p.waitForFunction(()=>window.__ajMapDiagnostics?.state==='running'&&window.__ajTestGlobe?.scene.globe.tilesLoaded,null,{timeout:60000});
 return {app,p,errors,uiMs,globeMs:performance.now()-start};
}
module.exports={fixture,open};
