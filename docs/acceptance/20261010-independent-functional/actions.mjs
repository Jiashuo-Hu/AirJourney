import * as c from './client.mjs';
import fs from 'node:fs/promises';
const root=new URL('./',import.meta.url);
try {
switch(process.argv[2]) {
case 'logo':
 await fs.writeFile(new URL('data/acceptance-logo.svg',root),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="120" height="40" fill="#245fd6"/><path d="M15 30L40 10L65 30L40 23Z" fill="#ffffff"/></svg>');
 await c.button('Library');await c.button('Airlines');await c.js(`(()=>{const b=[...document.querySelectorAll('.reference-row')].find(b=>b.textContent.includes('Acceptance stage2 Air edited'));b.click()})()`);await c.wait(150);await c.button('Choose SVG');break;
case 'save-logo':
 await c.shot('08-personal-svg');await c.button('Apply to future selections');await c.button('Settings');await c.button('Data & backup');await fs.writeFile(new URL('logs/state-before-native-backup.json',root),JSON.stringify(await c.load(),null,2));await c.button('Export backup');break;
case 'import':await c.button('Import backup');break;
case 'blank-import':await c.button('Settings');await c.button('Data & backup');await c.button('Import backup');break;
case 'blank-verify': {
 const a=JSON.parse(await fs.readFile(new URL('logs/state-before-native-backup.json',root)));const b=await c.load();await fs.writeFile(new URL('logs/fresh-profile-restore.json',root),JSON.stringify({equal:JSON.stringify(a)===JSON.stringify(b),flights:b.flights.length,personalSVG:b.library.Airlines.some(r=>r.name==='Acceptance stage2 Air edited'&&r.logo?.startsWith('data:')),dataPath:await c.js('window.airjourney.dataPath()')},null,2));await c.shot('17-fresh-profile-restored');break;}
case 'cancel-verify': {
 await c.shot('13-conflict-preview');await c.button('Cancel');const before=JSON.parse(await fs.readFile(new URL('logs/state-before-cancel.json',root)));const after=await c.load();await fs.writeFile(new URL('logs/import-cancel.json',root),JSON.stringify({equal:JSON.stringify(before)===JSON.stringify(after)},null,2));await c.button('Import backup');break;}
case 'invalid-verify': {
 const before=JSON.parse(await fs.readFile(new URL('logs/state-before-cancel.json',root)));const after=await c.load();await c.shot('14-invalid-backup');await fs.writeFile(new URL('logs/import-invalid.json',root),JSON.stringify({equal:JSON.stringify(before)===JSON.stringify(after),message:await c.text()},null,2));await c.button('Library');await c.button('Airports');await c.button('Import');break;}
case 'library-switch':
 await c.shot('15-library-import-preview');await c.button('Airlines');await c.shot('16-library-import-other-tab');await c.button('Confirm import');await fs.writeFile(new URL('logs/library-import-wrong-category.json',root),JSON.stringify({Airports:(await c.load()).library.Airports.filter(r=>r.id==='acceptance-import-place'),Airlines:(await c.load()).library.Airlines.filter(r=>r.id==='acceptance-import-place')},null,2));break;
case 'restore':await c.field('Conflict policy','Replace entire personal library');await c.shot('09-native-backup-preview');await c.button('Confirm import');break;
case 'verify': {
 const a=JSON.parse(await fs.readFile(new URL('logs/state-before-native-backup.json',root)));const b=await c.load();await fs.writeFile(new URL('logs/native-backup-roundtrip.json',root),JSON.stringify({equal:JSON.stringify(a)===JSON.stringify(b),flights:b.flights.length,personalSVG:b.library.Airlines.some(r=>r.name==='Acceptance stage2 Air edited'&&r.logo?.startsWith('data:')),settings:b.settings},null,2));await c.button('Export CSV');break;}
case 'state':console.log(JSON.stringify(await c.load()));break;
case 'logo-remove':
 await c.button('Library');await c.button('Airlines');await c.js(`(()=>{const b=[...document.querySelectorAll('.reference-row')].find(b=>b.textContent.includes('Acceptance stage2 Air edited'));b.click()})()`);await c.wait(150);await c.button('Remove logo');await c.button('Apply to future selections');console.log('Logo removed:',!(await c.load()).library.Airlines.find(r=>r.name==='Acceptance stage2 Air edited').logo);break;
}
}finally{c.ws.close()}
