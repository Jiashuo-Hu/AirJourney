const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
module.exports = async (win, data) => {
  win.show();
  const js = (c) => win.webContents.executeJavaScript(c),
    wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(5000);
  await js(
    `(async()=>{const s=await window.airjourney.load()||null;if(!s)throw Error('Seed state required');s.flights=Array.from({length:1000},(_,i)=>({id:crypto.randomUUID(),created:new Date().toISOString(),updated:new Date().toISOString(),number:'SYNTHETIC-'+i,from:structuredClone(s.library.Airports[i%15]),to:structuredClone(s.library.Airports[(i*7+3)%15]),departure:{date:'2024-01-15',time:'',zone:''},arrival:{date:'',time:'',zone:''},status:'Recorded',unit:'km',tags:['Benchmark'],notes:'Synthetic performance fixture',fields:{},color:'',visible:true}));await window.airjourney.save(JSON.stringify(s));})()`,
  );
  win.webContents.reload();
  await wait(7000);
  const search = await js(
    `(async()=>{const values=[];const input=document.getElementById('flight-search'),setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(let i=0;i<30;i++){const start=performance.now();setter.call(input,'SYNTHETIC-'+(i%10));input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));values.push(performance.now()-start);}setter.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));return values;})()`,
  );
  const saves = await js(
    `(async()=>{const times=[],s=await window.airjourney.load();for(let i=0;i<30;i++){s.flights[0].notes='Benchmark '+i;const start=performance.now();await window.airjourney.save(JSON.stringify(s));times.push(performance.now()-start);}return times;})()`,
  );
  const frame = await js(
    `new Promise(resolve=>{const v=__ajTestGlobe,frames=[];let previous=performance.now();const remove=v.scene.postRender.addEventListener(()=>{const now=performance.now();frames.push(now-previous);previous=now;});const start=performance.now();function rotate(){v.camera.rotateRight(.002);v.scene.requestRender();if(performance.now()-start<5000)requestAnimationFrame(rotate);else{remove();resolve(frames);}}rotate();})`,
  );
  function pct(a, p) {
    const x = [...a].sort((a, b) => a - b);
    return x[Math.floor((x.length - 1) * p)];
  }
  const result = {
    records: 1000,
    search30ms: search,
    searchP95ms: pct(search, 0.95),
    storageCommit30ms: saves,
    storageCommitP95ms: pct(saves, 0.95),
    interactive5secMedianFPS: 1000 / pct(frame, 0.5),
    metrics: require("electron").app.getAppMetrics(),
    versions: process.versions,
    baselineMachine: false,
    fullAcceptanceBenchmark: false,
  };
  assert.equal((await js("window.airjourney.load()")).flights.length, 1000);
  fs.writeFileSync(
    path.join(data, "benchmark.json"),
    JSON.stringify(result, null, 2),
  );
  fs.writeFileSync(
    path.join(data, "benchmark.png"),
    (await win.webContents.capturePage()).toPNG(),
  );
};
