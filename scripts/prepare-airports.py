"""Offline resource preparation; input snapshots must already exist locally.
OurAirports: public domain. GeoNames cities500: CC BY 4.0.
Never infer an airport coordinate from a code or a country centroid.
"""
import csv, json, math, hashlib, pathlib, unicodedata, zipfile, collections
ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / '.tools/v0.2-sources'
OUT = ROOT / 'public/data'
def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s.casefold().strip()) if not unicodedata.combining(c))
def pair(a, b):
    try:
        a, b = float(a), float(b)
        return (a, b) if math.isfinite(a) and math.isfinite(b) and abs(a)<=90 and abs(b)<=180 else None
    except (ValueError, TypeError): return None
def resolve_location(row, cities):
    p = pair(row.get('latitude_deg'), row.get('longitude_deg'))
    if p: return {'lat':p[0], 'lon':p[1], 'locationKind':'airport', 'locationSource':'OurAirports airport coordinates'}
    matches = cities.get((row.get('iso_country',''),norm(row.get('municipality',''))), {})
    # Only one distinct named city in the same country; no fuzzy / largest-city guess.
    if len(matches)==1:
        city = next(iter(matches.values()))
        return {'lat':city['lat'], 'lon':city['lon'], 'locationKind':'approximate', 'locationSource':'GeoNames city '+city['id']+' (city centre, not airport)'}
    return {'locationKind':'unlocated', 'locationSource':'Airport coordinates absent or invalid; no unambiguous city match'}
def main():
    OUT.mkdir(exist_ok=True,parents=True)
    countries = {r['code']:r['name'] for r in csv.DictReader((RAW/'countries.csv').open(encoding='utf-8-sig'))}
    countries.update({'TW':'Taiwan, China','HK':'Hong Kong, China','MO':'Macao, China'})
    raw = list(csv.DictReader((RAW/'airports.csv').open(encoding='utf-8-sig')))
    cities = {}
    needs_city = any(not pair(r['latitude_deg'],r['longitude_deg']) for r in raw)
    if needs_city:
        with zipfile.ZipFile(RAW/'cities500.zip') as z:
            for line in z.read('cities500.txt').decode('utf-8').splitlines():
                c=line.split('\t'); p=pair(c[4],c[5])
                if not p: continue
                city={'id':c[0],'lat':p[0],'lon':p[1]}
                for name in set([c[1],c[2]]):
                    cities.setdefault((c[8],norm(name)),{})[c[0]]=city
    seen_ids=set();seen_idents=set(); entries=[];duplicates=[]
    for row in raw:
        ident=row['ident'].strip()
        if row['id'] in seen_ids or ident.casefold() in seen_idents:
            duplicates.append({'id':row['id'],'ident':ident});continue
        seen_ids.add(row['id']);seen_idents.add(ident.casefold())
        r={'id':'oa-'+row['id'],'name':row['name'].strip(),'ident':ident,'countryCode':row['iso_country'],'region':countries.get(row['iso_country'],row['iso_country']),'airportType':row['type'],'scheduled':row['scheduled_service']=='yes','source':'OurAirports · 2026-10-14',**resolve_location(row,cities)}
        for key,val in [('code',row['iata_code'] or row['icao_code'] or ident),('iata',row['iata_code']),('icao',row['icao_code']),('city',row['municipality']),('aliases',' '.join(dict.fromkeys(x for x in [row['gps_code'],row['local_code'],row['keywords']] if x)))]:
            if val:r[key]=val
        entries.append(r)
    priority={'large_airport':0,'medium_airport':1,'small_airport':2,'seaplane_base':3,'heliport':4,'balloonport':5,'closed':6,'closed_airport':6}
    entries.sort(key=lambda r:(not r['scheduled'],priority.get(r['airportType'],7),norm(r['name']),r['id']))
    counts=collections.Counter(r['countryCode'] for r in entries)
    location=collections.Counter(r['locationKind'] for r in entries)
    code_counts=collections.Counter(r.get('iata') for r in entries if r.get('iata'))
    coverage=[{'code':c,'name':n,'records':counts[c]} for c,n in sorted(countries.items())]
    manifest={'snapshot':'2026-10-14','runtimeNetworkRequired':False,'sources':[{'name':'OurAirports','url':'https://ourairports.com/data/','download':'https://davidmegginson.github.io/ourairports-data/airports.csv','license':'Public domain; no accuracy or completeness warranty','rawSha256':hashlib.sha256((RAW/'airports.csv').read_bytes()).hexdigest(),'countryRawSha256':hashlib.sha256((RAW/'countries.csv').read_bytes()).hexdigest()},{'name':'GeoNames cities500','url':'https://download.geonames.org/export/dump/readme.txt','license':'CC BY 4.0; attribution GeoNames contributors','rawSha256':hashlib.sha256((RAW/'cities500.zip').read_bytes()).hexdigest(),'appliedToRecords':location['approximate']}],'inputRows':len(raw),'records':len(entries),'removedDuplicateRows':duplicates,'locationCounts':dict(location),'airportTypes':dict(collections.Counter(r['airportType'] for r in entries)),'countriesWithRecords':len(counts),'coverage':coverage,'missingCity':sum(not r.get('city') for r in entries),'missingIata':sum(not r.get('iata') for r in entries),'missingIcao':sum(not r.get('icao') for r in entries),'iataCollisions':{c:n for c,n in code_counts.items() if n>1},'notes':['Source coordinates are not independently surveyed or guaranteed accurate.','Closed airports, heliports, seaplane bases and small airfields remain searchable with types.','City fallback requires unique same-country exact normalized city match; otherwise unlocated.','No airport timezone inferred from coordinates. Legacy suggestions and user values are retained.','Only source-ID/identifier duplicates removed. Shared names or IATA codes do not imply the same airport.']}
    data=OUT/'airports-global.json';data.write_text(json.dumps(entries,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    manifest['resourceBytes']=data.stat().st_size;manifest['resourceSha256']=hashlib.sha256(data.read_bytes()).hexdigest()
    (OUT/'airports-global-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in manifest.items() if k not in ['coverage','sources','iataCollisions']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
