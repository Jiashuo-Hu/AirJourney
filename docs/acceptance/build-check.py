from pathlib import Path
import zipfile,hashlib,json
root=Path(__file__).resolve().parents[2];out=root/'docs/acceptance/evidence';dest=out/'source-build'
dest.mkdir(exist_ok=True)
with zipfile.ZipFile(root/'release/AirJourney-v0.0-source.zip') as z:
 for name in z.namelist():
  if name.startswith(('src/','public/','scripts/','tests/','desktop/')) or name in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html']:
   target=(dest/name).resolve();assert target.is_relative_to(dest.resolve());target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(name))
print('Extracted frozen source to acceptance/evidence/source-build; dependency installation not rerun')
