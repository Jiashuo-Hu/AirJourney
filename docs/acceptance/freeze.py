from pathlib import Path
import hashlib, json, csv, zipfile
root=Path(__file__).resolve().parents[2]
out=root/'docs/acceptance/evidence'
sha=lambda b:hashlib.sha256(b).hexdigest()
manifest=json.loads((root/'docs/implementation/delivery_manifest.json').read_text('utf-8'))
artifacts=[]
for a in manifest['artifacts']:
 p=root/a['path']; b=p.read_bytes(); artifacts.append({**a,'actual_sha256':sha(b),'actual_bytes':len(b),'matches':sha(b)==a['sha256'] and len(b)==a['bytes']})
source=[]
for folder in ['src','desktop','scripts','public','tests','docs/planning']:
 for p in sorted((root/folder).rglob('*')):
  if p.is_file(): source.append({'path':p.relative_to(root).as_posix(),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size})
for n in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','README.md']:
 p=root/n; source.append({'path':n,'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size})
archive=[]
with zipfile.ZipFile(root/'release/AirJourney-v0.0-source.zip') as z:
 for s in source:
  try: archive.append({'path':s['path'],'matches':sha(z.read(s['path']))==s['sha256']})
  except KeyError: archive.append({'path':s['path'],'matches':False,'reason':'absent'})
resources=list(csv.DictReader((root/'docs/implementation/resource_manifest.csv').open(encoding='utf-8-sig')))
local=[]
for r in resources:
 p=root/r['local_path']
 if '::' not in r['local_path']:
  local.append({'path':r['local_path'],'matches':p.is_file() and sha(p.read_bytes())==r['sha256']})
release=[{'path':p.relative_to(root).as_posix(),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted((root/'release/win-unpacked').rglob('*')) if p.is_file()]
result={'baseline':'v0.0','date':'2026-10-10 Asia/Shanghai','artifacts':artifacts,'source':source,'source_archive_comparison':archive,'resource_manifest_rows':len(resources),'local_resource_checks':local,'unpacked':release,'scope':'Product files frozen before testing; acceptance output excluded'}
(out/'candidate-freeze.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps({'artifacts':artifacts,'source_files':len(source),'archive_mismatches':[r for r in archive if not r['matches']],'local_resource_mismatches':[r for r in local if not r['matches']],'resource_rows':len(resources),'unpacked_files':len(release)},indent=2))
