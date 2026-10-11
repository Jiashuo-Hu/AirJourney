const fs=require('fs'), path=require('path'), crypto=require('crypto');
const asar=require('../../node_modules/@electron/asar');
const root=path.resolve(__dirname,'../..'), out=path.join(__dirname,'evidence');
const archive=path.join(root,'release/win-unpacked/resources/app.asar');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=[];
for(const folder of ['desktop','dist']) for(const file of fs.readdirSync(path.join(root,folder),{recursive:true})){
 const p=path.join(root,folder,file); if(!fs.statSync(p).isFile())continue;
 const name=folder+'/'+file.replaceAll('\\','/');
 try{const b=asar.extractFile(archive,path.normalize(name));rows.push({path:name,matches:hash(b)===hash(fs.readFileSync(p))});}catch(e){rows.push({path:name,matches:false,error:String(e)});}
}
const manifest=fs.readFileSync(path.join(root,'docs/implementation/resource_manifest.csv'),'utf8').split(/\r?\n/).filter(l=>l.includes('::'));
const checks=manifest.map(l=>{const c=l.match(/"([^"]*)"/g).map(x=>x.slice(1,-1));const p=c[3].split('::')[1];try{return{path:p,matches:hash(asar.extractFile(archive,path.normalize(p)))===c[6]}}catch(e){return{path:p,matches:false,error:String(e)}}});
const installed=path.join(out,'installed-app/resources/app.asar');
const result={packaged_vs_workspace:rows,asar_resource_rows:checks,installed_asar_matches:fs.existsSync(installed)&&hash(fs.readFileSync(installed))===hash(fs.readFileSync(archive)),unpacked_asar_sha256:hash(fs.readFileSync(archive)),package:JSON.parse(asar.extractFile(archive,'package.json').toString())};
fs.writeFileSync(path.join(out,'package-consistency.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({members:rows.length,mismatches:rows.filter(r=>!r.matches),asarResourceRows:checks.length,resourceMismatches:checks.filter(r=>!r.matches),installedMatches:result.installed_asar_matches}));
