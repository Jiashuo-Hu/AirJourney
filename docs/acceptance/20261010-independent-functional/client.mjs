// Independent functional tests against the unchanged packaged application.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const targets = await (await fetch('http://127.0.0.1:9338/json/list')).json();
const target = targets.find(t => t.type === 'page' && t.url === 'airjourney://app/index.html');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let serial=0; const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const js=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const button=async text=>{await js(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing button '+${JSON.stringify(text)});b.click()})()`);await wait(180)};
const field=async(label,value,index=0)=>{await js(`(()=>{const l=[...document.querySelectorAll('label')].filter(x=>x.firstChild?.textContent.trim()===${JSON.stringify(label)})[${index}];const n=l?.querySelector('input,select,textarea');if(!n)throw Error('Missing field '+${JSON.stringify(label)});const p=n instanceof HTMLSelectElement?HTMLSelectElement.prototype:n instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(n,${JSON.stringify(value)});n.dispatchEvent(new Event(n instanceof HTMLSelectElement?'change':'input',{bubbles:true}))})()`);await wait(100)};
const value=(label,index=0)=>js(`(()=>{const l=[...document.querySelectorAll('label')].filter(x=>x.firstChild?.textContent.trim()===${JSON.stringify(label)})[${index}];return l.querySelector('input,select,textarea').value})()`);
const load=()=>js('window.airjourney.load()');
const text=()=>js('document.body.innerText');
const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(new URL('screenshots/'+name+'.png',root),Buffer.from(r.data,'base64'))};
const results=[]; const issues=[];
const test=async(name,fn)=>{try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name)}catch(e){results.push({name,status:'FAIL',error:String(e.stack)});console.log('FAIL',name,String(e));await shot('failure-'+results.length);throw e}};

export {ws,send,js,button,field,value,load,text,shot,wait};
