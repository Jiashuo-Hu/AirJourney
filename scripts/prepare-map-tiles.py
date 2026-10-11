"""One-time local preparation from the existing Natural Earth source snapshot."""
from pathlib import Path
from PIL import Image
import io, json, zipfile, hashlib
root=Path(__file__).resolve().parent.parent
archive=root/'.tools/naturalearth-source.zip'
with zipfile.ZipFile(archive) as z:
    source=Image.open(io.BytesIO(z.read(next(n for n in z.namelist() if n.lower().endswith('.tif'))))).convert('RGB')
out=root/'public/maps/naturalearth'
for level in range(4):
    cols,rows=2**(level+1),2**level
    image=source.resize((cols*512,rows*512),Image.Resampling.LANCZOS)
    for x in range(cols):
        d=out/str(level)/str(x);d.mkdir(parents=True,exist_ok=True)
        for y in range(rows):image.crop((x*512,y*512,(x+1)*512,(y+1)*512)).save(d/f'{y}.jpg',quality=93,optimize=True,subsampling=0)
files=list(out.rglob('*.jpg'))
(out/'manifest.json').write_text(json.dumps({'version':'v0.1','source':'Natural Earth II 3.2.0','source_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'originalDimensions':list(source.size),'projection':'EPSG:4326','scheme':'Geographic; 2x1 root; north-origin Y','tileSize':512,'levels':[0,1,2,3],'effectiveMaximumDimensions':[8192,4096],'count':len(files),'bytes':sum(p.stat().st_size for p in files)},indent=2),encoding='utf-8')
print((out/'manifest.json').read_text())
