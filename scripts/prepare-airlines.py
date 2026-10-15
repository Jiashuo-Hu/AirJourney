"""Deterministically prepare local airline references from fixed downloaded snapshots.
No network calls. Derived database: ODbL 1.0; Wikidata additions: CC0.
"""
import csv, json, re, hashlib, shutil, unicodedata
from pathlib import Path
from collections import Counter, defaultdict
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'.tools/v0.3-sources'
OUT=ROOT/'public/data'
if not (SOURCE/'openflights-airlines.dat').exists(): SOURCE=OUT/'airline-sources'
def norm(x): return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',x).encode('ascii','ignore').decode().lower())
def text(x): return '' if x.strip() in ('',r'\N','N/A','-') else x.strip()
def clean_code(x): return text(x).upper() if re.fullmatch('[A-Za-z0-9]{2}',text(x)) else ''
def region(x): return {'Taiwan':'Taiwan, China','Hong Kong':'Hong Kong, China','Macao':'Macao, China','Macau':'Macao, China'}.get(x,x)
def main():
    rows=[]; duplicates=[]; invalid=[]; seen={}; id_seen=set()
    raw=list(csv.reader((SOURCE/'openflights-airlines.dat').open(encoding='utf-8')))
    for a in raw:
        sid,name,alias,code,icao,call,country,active=a
        if int(sid)<2 or not text(name): continue
        if text(code) and not clean_code(code): invalid.append({'sourceId':sid,'code':code})
        r={'id':'of-airline-'+sid,'name':name.strip(),'code':clean_code(code),'icao':text(icao),'aliases':text(alias),'region':region(text(country)),
           'airlineStatus':'inactive' if active=='N' else 'unknown','statusSource':'OpenFlights flag '+active+'; not current verification',
           'source':'OpenFlights snapshot 2026-10-15','sourceId':sid}
        key=(norm(r['name']),r['code'],r['icao'],r['region'])
        if key in seen:
            duplicates.append({'kept':seen[key]['id'],'duplicate':r['id']})
            seen[key]['aliases']='; '.join(filter(None,[seen[key]['aliases'],r['aliases']]))
            continue
        seen[key]=r; rows.append(r); id_seen.add(r['id'])
    entities=defaultdict(list)
    bindings=json.loads((SOURCE/'wikidata-airlines.json').read_text(encoding='utf-8'))['results']['bindings']
    for b in bindings: entities[b['item']['value'].split('/')[-1]].append({k:v['value'] for k,v in b.items()})
    merged=0; added=0; rejected=[]
    by_name=defaultdict(list)
    for r in rows:by_name[norm(r['name'])].append(r)
    for q,bs in sorted(entities.items()):
        names=sorted({b['itemLabel'] for b in bs if not re.fullmatch('Q[0-9]+',b['itemLabel'])})
        if not names: rejected.append(q); continue
        codes=sorted({clean_code(b['iata']) for b in bs if clean_code(b['iata'])})
        if not codes: rejected.append(q); continue
        icaos=sorted({b.get('icao','') for b in bs if b.get('icao')})
        matching=[r for n in {norm(n) for n in names} for r in by_name.get(n,[]) if r['code'] in codes or (not r['code'] and r.get('icao') in icaos)]
        ends=sorted({b['end'][:10] for b in bs if b.get('end') and b['end'][:10]<='2026-10-15'})
        if len(matching)==1:
            r=matching[0];merged+=1;r['sourceId']+='; '+q;r['source']+=' + Wikidata'
            r['aliases']='; '.join(dict.fromkeys(filter(None,[r.get('aliases'),*names])))
        else:
            r={'id':'wd-airline-'+q,'name':names[0],'code':codes[0],'icao':icaos[0] if len(icaos)==1 else '',
               'region':region(bs[0].get('countryLabel','')),'aliases':'; '.join(names[1:]),'airlineStatus':'unknown',
               'statusSource':'Wikidata; operational status not independently verified','source':'Wikidata snapshot 2026-10-15','sourceId':q}
            rows.append(r);by_name[norm(r['name'])].append(r);added+=1
        if len(codes)>1:
            r['codeNote']='Source assignments (possibly historical): '+', '.join(codes)
            r['aliases']='; '.join(filter(None,[r.get('aliases'),*codes]))
        if ends: r.update(airlineStatus='inactive',statusSource='Wikidata dissolution date '+ends[-1])
    # Brand mapping is by name AND code, never by a reused code alone.
    brands=json.loads((SOURCE/'brands.json').read_text(encoding='utf-8'))
    for key,name,code,url,file in brands:
        for r in rows:
            if r['code']==code and norm(r['name'])==norm(name):
                r['brandKey']=key
                r['airlineStatus']='active'
                r['statusSource']='Operating/booking or corporate website checked 2026-10-15: '+url+'; no live-flight verification'
    # Explicitly reviewed same-operator trade/legal names; do not collapse code reuse.
    for name,alias,code in [('Qantas','Qantas Airways','QF'),('KLM','KLM Royal Dutch Airlines','KL')]:
        primary=next((r for r in rows if r['name']==name and r.get('code')==code),None)
        others=[r for r in rows if r['name']==alias and r.get('code')==code and r.get('icao')==primary.get('icao')] if primary else []
        for r in others:
            primary['aliases']='; '.join(filter(None,[primary.get('aliases'),alias]))
            duplicates.append({'kept':primary['id'],'duplicate':r['id'],'reason':'Reviewed trade/legal name alias with same IATA and ICAO'})
            rows.remove(r)
    for r in rows:
        if r.get('brandKey')=='finnair':
            r['historicalAliases']='Aero O/Y; Aero Oy; Aero Ltd'
            r['aliases']='; '.join(filter(None,[r.get('aliases'),r['historicalAliases']]))
    counts=Counter(r['code'] for r in rows if r['code'])
    reused={c:[r['id'] for r in rows if r['code']==c] for c,n in sorted(counts.items()) if n>1}
    for r in rows:
        if r['code'] in reused: r['codeNote']='Code shared/reused; choose by name and source ID. '+r.get('codeNote','')
    rows.sort(key=lambda r:(norm(r['name']),r['id']))
    for r in rows:
        for k in list(r):
            if r[k]=='': del r[k]
    OUT.mkdir(exist_ok=True,parents=True)
    data=json.dumps(rows,ensure_ascii=False,separators=(',',':')).encode('utf-8')
    (OUT/'airlines-global.json').write_bytes(data)
    snap=OUT/'airline-sources';snap.mkdir(exist_ok=True)
    for name in ['openflights-airlines.dat','wikidata-airlines.json']:
        if (SOURCE/name).resolve()!=(snap/name).resolve():shutil.copyfile(SOURCE/name,snap/name)
    manifest={'date':'2026-10-15','records':len(rows),'openFlightsSourceRows':len(raw),'excludedPseudoEntries':2,
      'exactDuplicatesMerged':duplicates,'invalidSourceCodesPreservedInAudit':invalid,'wikidataSourceBindings':len(bindings),
      'wikidataEntities':len(entities),'wikidataMerged':merged,'wikidataAdded':added,'wikidataMissingLabelOrValidCode':rejected,
      'missingCode':sum(not r.get('code') for r in rows),'statusCounts':dict(Counter(r['airlineStatus'] for r in rows)),
      'countryRegionNames':len({r.get('region') for r in rows if r.get('region')}),'reusedCodes':reused,
      'resourceSha256':hashlib.sha256(data).hexdigest(),'sources':[
      {'url':'https://github.com/jpatokal/openflights/blob/master/data/airlines.dat','license':'ODbL 1.0 / DbCL 1.0','sha256':hashlib.sha256((SOURCE/'openflights-airlines.dat').read_bytes()).hexdigest()},
      {'url':'https://query.wikidata.org/','query':'P229 airline designator, P230 ICAO, P17 country, P576 dissolution; English labels','license':'CC0','sha256':hashlib.sha256((SOURCE/'wikidata-airlines.json').read_bytes()).hexdigest()}],
      'limitations':['Not an authoritative/current IATA register. OpenFlights active=Y is deliberately Unknown because the source warns it is unreliable.',
      'N is source-listed inactive; P576 is source-listed dissolution. Unknown is not inferred active. Aliases may be historical and are not separate current operators.',
      'P229 can include non-flight transport operators; retained as source references, not flight-validation authority.',
      'Country/region names are source labels, not a count of internationally recognized countries. Codes are never unique IDs.']}
    (OUT/'airlines-global-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:manifest[k] for k in ['records','missingCode','statusCounts','wikidataAdded','wikidataMerged','countryRegionNames']},ensure_ascii=False))
if __name__=='__main__':main()
