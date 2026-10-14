import csv,json,math,pathlib,hashlib,collections
root=pathlib.Path.cwd();out=root/'docs/acceptance/20261014-v02-independent/logs'
rows=json.loads((root/'public/data/airports-global.json').read_text(encoding='utf-8'))
meta=json.loads((root/'public/data/airports-global-manifest.json').read_text(encoding='utf-8'))
raw=list(csv.DictReader((root/'.tools/v0.2-sources/airports.csv').open(encoding='utf-8-sig')))
byid={r['id']:r for r in raw};mismatches=[];bad=[]
for r in rows:
 s=byid.get(r['id'].removeprefix('oa-'))
 if not s:mismatches.append({'id':r['id'],'missingSource':True});continue
 expected={'name':s['name'].strip(),'ident':s['ident'].strip(),'countryCode':s['iso_country'],'airportType':s['type'],'code':s['iata_code'] or s['icao_code'] or s['ident'].strip(),'iata':s['iata_code'] or None,'icao':s['icao_code'] or None,'city':s['municipality'] or None,'lat':float(s['latitude_deg']),'lon':float(s['longitude_deg'])}
 diff={k:{'expected':v,'actual':r.get(k)} for k,v in expected.items() if r.get(k)!=v}
 if diff:mismatches.append({'id':r['id'],'differences':diff})
 if not (math.isfinite(r.get('lat',float('nan'))) and math.isfinite(r.get('lon',float('nan'))) and abs(r['lat'])<=90 and abs(r['lon'])<=180):bad.append(r['id'])
codes=['OMDB','ZSPD','RJTT','WSSS','VABB','FAOR','HKJK','HECA','EGLL','EDDM','BIKF','KJFK','MMMX','SBGR','SCEL','NZWN','NFFN']
samples=[]
for code in codes:
 matches=[r for r in rows if code in [r.get('ident'),r.get('icao'),r.get('iata')]]
 samples.append({'query':code,'matches':[{k:r.get(k) for k in ['id','name','iata','icao','ident','city','countryCode','lat','lon','locationKind','locationSource']} for r in matches]})
collisions=collections.Counter(r.get('iata') for r in rows if r.get('iata'))
repeated={k:n for k,n in collisions.items() if n>1}
result={'records':len(rows),'rawRecords':len(raw),'countries':len(set(r['countryCode'] for r in rows)),'uniqueIds':len(set(r['id'] for r in rows)),'uniqueIdentifiersCasefold':len(set(r['ident'].casefold() for r in rows)),'sourceMismatches':mismatches,'invalidCoordinatePairs':bad,'locationTypes':dict(collections.Counter(r.get('locationKind') for r in rows)),'missingCity':sum(not r.get('city') for r in rows),'missingIata':sum(not r.get('iata') for r in rows),'missingIcao':sum(not r.get('icao') for r in rows),'iataCollisions':repeated,'zeroCoordinatePairs':[r for r in rows if r['lat']==0 and r['lon']==0],'rawHashMatches':hashlib.sha256((root/'.tools/v0.2-sources/airports.csv').read_bytes()).hexdigest()==meta['sources'][0]['rawSha256'],'resourceHashMatches':hashlib.sha256((root/'public/data/airports-global.json').read_bytes()).hexdigest()==meta['resourceSha256'],'samples':samples,'locationGroundTruth':'Compared against local independent source snapshot and ranges; no independent survey or current airport reality lookup'}
(out/'airport-data-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['samples','iataCollisions','zeroCoordinatePairs']},ensure_ascii=False));print('IATA collision groups:',len(repeated),list(repeated.items())[:12]);print('Zero pairs:',len(result['zeroCoordinatePairs']))
