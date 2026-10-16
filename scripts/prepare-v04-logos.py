"""Prepare the fixed v0.4 SVG additions offline; keep prior brand bytes intact."""
import json,base64,hashlib,shutil,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('svg_prep',ROOT/'scripts/prepare-airline-logos.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
src=ROOT/'.tools/v0.4-sources';out=ROOT/'public/logos/airlines';originals=out/'originals'
research=src/'brand-research.json'
if not research.exists():
    src=originals
    research=ROOT/'public/data/airline-sources/v04-brand-research.json'
rows=json.loads(research.read_text(encoding='utf-8'))
manifest=json.loads((out/'manifest.json').read_text(encoding='utf-8'))
assets=json.loads((ROOT/'src/airline-brand-assets.json').read_text(encoding='utf-8'))
for r in rows:
    key=r['key'];p=src/f'{key}-original.svg'
    r['included']=False
    if not p.exists():
        r['missing']='No verified vector file obtained; diamond placeholder'
        manifest['brands']=[b for b in manifest['brands'] if b['key']!=key]+[r]
        continue
    try:
        full=module.sanitize(p.read_bytes())
        # XML serializes multiline attribute whitespace as numeric entities;
        # normalize those attributes before the application's strict validator.
        doc=module.E.fromstring(full.encode())
        if key=='air-niugini':
            # This source's clip is the whole original canvas, not artwork.
            # An expanded <use> group is not a valid direct clipPath child.
            for clip in list(doc.iter('{'+module.NS+'}clipPath')):
                clip.getparent().remove(clip)
            for el in doc.iter():el.attrib.pop('clip-path',None)
            r['clipRepair']='Removed redundant whole-canvas clipping rectangle; no artwork clipped or moved.'
        for el in doc.iter():
            for name,value in list(el.attrib.items()):
                el.set(name,' '.join(value.split()))
        full=module.E.tostring(doc,encoding='unicode')
        if p.resolve()!=(originals/p.name).resolve():shutil.copyfile(p,originals/p.name)
        (out/f'{key}-full.svg').write_text(full+'\n',encoding='utf-8')
        r['included']=True;r['fullPath']=f'public/logos/airlines/{key}-full.svg';r['chosenOriginal']=f'public/logos/airlines/originals/{key}-original.svg'
        r['chosenUsage']=r.get('directOfficialTerms') or ('Source-file statement: '+r.get('imageinfo',{}).get('extmetadata',{}).get('LicenseShortName',{}).get('value','No general reuse license verified')+'; copyright and trademark rights retained; local identification only, no blanket commercial/redistribution permission.')
        r['currentBrandCheck']='Attributable SVG identity/contact-sheet review 2026-10-15; official HTML fetch '+r.get('officialStatus','not completed')+'; this alone does not prove every current brand variant. Specific primary verification, if available, is recorded separately.'
        r['worldvectorlogoReview']='Page/preview consulted; source not bundled because the site terms do not grant general modification/transfer rights' if key in ['air-new-zealand','thai','eva'] else 'Candidate reference URL only; page not independently checked. No file obtained from WorldVectorLogo.'
        r['fullSha256']=hashlib.sha256((full+'\n').encode()).hexdigest()
        r['sanitization']='Inline CSS/local uses; preserve geometry/colors; strip metadata; no embedded bitmap or live text'
        r['symbolStatus']='Pending complete-contour review; full lockup retained'
        a={'name':r['name'],'code':r['code'],'full':'data:image/svg+xml;base64,'+base64.b64encode(full.encode()).decode()}
        if r.get('names'):a['names']=r['names']
        if key=='thai':a['names']=['Thai Airways International']
        if key=='indigo':a['names']=['IndiGo Airlines']
        assets[key]=a
        if key=='korean' and (src/'korean-symbol-original.svg').exists():
            raw=src/'korean-symbol-original.svg'
            if raw.resolve()!=(originals/raw.name).resolve():shutil.copyfile(raw,originals/raw.name)
            symbol=module.sanitize(raw.read_bytes());(out/'korean-symbol.svg').write_text(symbol+'\n',encoding='utf-8')
            a['symbol']='data:image/svg+xml;base64,'+base64.b64encode(symbol.encode()).decode()
            r['symbolPath']='public/logos/airlines/korean-symbol.svg';r['symbolStatus']='Separately supplied 2025 Taegeuk vector; no wordmark extraction'
            r['brandVerificationSource']='https://www.lippincott.com/work/korean-air/'
    except Exception as e:r['missing']=str(e)
    manifest['brands']=[b for b in manifest['brands'] if b['key']!=key]+[r]
manifest['checked']='2026-10-15';manifest['version']='v0.4'
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'src/airline-brand-assets.json').write_text(json.dumps(assets,separators=(',',':'))+'\n',encoding='utf-8')
(ROOT/'public/data/airline-sources/v04-brand-research.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Total brands',len(assets),'additions',sum(r['included'] for r in rows),'/',len(rows))
# Focused correction to the supplied reference only; never rewrite saved flights.
airlines_path=ROOT/'public/data/airlines-global.json'
airlines=json.loads(airlines_path.read_text(encoding='utf-8'))
scoot=next(r for r in airlines if r['id']=='of-airline-17891')
scoot.update(code='TR',icao='TGW',historicalAliases='Scoot (TZ / SCO before the 2017 merger)',codeNote='Current TR; historic TZ kept as an alias. Shared/reused codes remain separate entries. Reference correction checked 2026-10-15: https://www.iata.org/en/about/members/airline-list/scoot/581/')
airlines_path.write_text(json.dumps(airlines,separators=(',',':'))+'\n',encoding='utf-8')
meta_path=ROOT/'public/data/airlines-global-manifest.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
import unicodedata
def namekey(s):return ''.join(c for c in unicodedata.normalize('NFKD',s).casefold() if not unicodedata.combining(c)).strip()
added=[]
for r in rows:
    if not r.get('included'):continue
    names=[r['name']]+r.get('names',[])
    if not any(p.get('code')==r['code'] and namekey(p['name']) in [namekey(n) for n in names] for p in airlines):
        entry={'id':'v04-brand-'+r['key'],'name':r['name'],'code':r['code'],'aliases':'; '.join(r.get('names',[])),'brandKey':r['key'],'airlineStatus':'unknown','statusSource':'Curated brand identity; operating status not independently verified','source':'v0.4 fixed brand supplement; '+r['official'],'sourceId':r['key'],'region':r.get('region',''),'codeNote':'Choose by name; shared and historic codes stay separate. Existing flight snapshots are unchanged.'}
        airlines.append(entry);added.append(entry['id'])
airlines_path.write_text(json.dumps(airlines,separators=(',',':'))+'\n',encoding='utf-8')
meta['records']=len(airlines)
meta['v04BrandSupplementIds']=[p['id'] for p in airlines if p['id'].startswith('v04-brand-')]
meta['resourceSha256']=hashlib.sha256(airlines_path.read_bytes()).hexdigest()
meta['referenceCorrectionsV04']=[{'id':scoot['id'],'oldCode':'TZ','currentCode':'TR','historicalAliasRetained':True,'source':'https://www.iata.org/en/about/members/airline-list/scoot/581/','checked':'2026-10-15','savedSnapshotsChanged':False}]
meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
