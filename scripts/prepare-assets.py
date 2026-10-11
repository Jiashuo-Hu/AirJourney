import csv,hashlib,json,zipfile,io
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
codes=['PEK','PVG','CAN','HKG','TPE','LHR','JFK','LAX','HND','SIN','AKL','SYD','CDG','FRA','DXB']
zones=['Asia/Shanghai','Asia/Shanghai','Asia/Shanghai','Asia/Hong_Kong','Asia/Taipei','Europe/London','America/New_York','America/Los_Angeles','Asia/Tokyo','Asia/Singapore','Pacific/Auckland','Australia/Sydney','Europe/Paris','Europe/Berlin','Asia/Dubai']
regions=['China','China','China','China','China','United Kingdom','United States','United States','Japan','Singapore','New Zealand','Australia','France','Germany','United Arab Emirates']
source=root/'.tools/airports-source.csv'
rows={r['iata_code']:r for r in csv.DictReader(source.open(encoding='utf-8')) if r['iata_code'] in codes and r['type'] in ['large_airport','medium_airport']}
airports=[]
for code,zone,region in zip(codes,zones,regions):
    r=rows[code]
    airports.append(dict(id='airport-'+code,code=code,name=r['name'],city=r['municipality'],region=region,lat=float(r['latitude_deg']),lon=float(r['longitude_deg']),zone=zone,source='Bundled'))
(root/'public/data').mkdir(exist_ok=True)
for name in ['src/data-airports.json','public/data/airports.json']:(root/name).write_text(json.dumps(airports,ensure_ascii=False,indent=2),encoding='utf-8')
zpath=root/'.tools/naturalearth-source.zip'
if zpath.exists():
    with zipfile.ZipFile(zpath) as z:
        tif=next(n for n in z.namelist() if n.lower().endswith('.tif'))
        im=Image.open(io.BytesIO(z.read(tif))).convert('RGB')
        original=im.size
        (root/'public/maps').mkdir(exist_ok=True)
        for width in [2048,4096]:im.resize((width,width//2),Image.Resampling.LANCZOS).save(root/f'public/maps/naturalearth-{width}.jpg',quality=90,optimize=True)
else:original=None
metadata={'date':'2026-10-10','airports_source':'https://davidmegginson.github.io/ourairports-data/airports.csv','airports_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'airport_count':len(airports),'airport_fields':'name, code, municipality, WGS84 latitude/longitude; manual IANA suggestions and region display rules','imagery_source':'https://naturalearth.s3.amazonaws.com/50m_raster/NE2_50M_SR_W.zip','imagery_version':'3.2.0','imagery_source_dimensions':original,'imagery_sha256':hashlib.sha256(zpath.read_bytes()).hexdigest() if zpath.exists() else None,'projection':'EPSG:4326, [-180,-90,180,90], north at top','license':'Public domain; no accuracy guarantee'}
(root/'public/data/source-snapshots.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
