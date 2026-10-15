"""Prepare fixed curated SVG sources, retaining originals and source metadata.
SVG geometry is kept; styles/local uses are expanded, never raster embedded.
"""
import json,re,copy,base64,hashlib,shutil
from pathlib import Path
from lxml import etree as E
ROOT=Path(__file__).resolve().parent.parent;SRC=ROOT/'.tools/v0.3-sources';OUT=ROOT/'public/logos/airlines'
if not (SRC/'brand-research.json').exists():SRC=OUT/'originals'
NS='http://www.w3.org/2000/svg'
def sanitize(raw):
    parser=E.XMLParser(resolve_entities=False,no_network=True,remove_comments=True)
    doc=E.fromstring(raw,parser)
    rules=[]
    for s in list(doc.iter('{'+NS+'}style')):
        for sel,body in re.findall(r'([^{}]+)\{([^{}]+)\}',s.text or ''):
            for key in sel.split(','):rules.append((key.strip(),body.strip()))
        s.getparent().remove(s)
    for el in list(doc.iter()):
        if not isinstance(el.tag,str):continue
        tag=E.QName(el).localname
        if E.QName(el).namespace!=NS or tag in ('metadata','namedview'):
            if el.getparent() is not None:el.getparent().remove(el)
            continue
        if tag in ('image','script','foreignObject','text'): raise ValueError('Non-portable element '+tag)
        extra=''
        for key,body in rules:
            if key==tag or (key.startswith('.') and key[1:] in el.get('class','').split()) or (key.startswith('#') and key[1:]==el.get('id')):extra+=body+';'
        if extra:el.set('style',extra+el.get('style',''))
        el.attrib.pop('class',None)
        for key in list(el.attrib):
            if key.startswith('{') and E.QName(key).namespace not in (NS,'http://www.w3.org/1999/xlink'):del el.attrib[key]
    for el in list(doc.iter('{'+NS+'}use')):
        ref=el.get('{http://www.w3.org/1999/xlink}href') or el.get('href','')
        if not ref.startswith('#'):raise ValueError('External use')
        match=doc.xpath('//*[@id=$name]',name=ref[1:])
        if len(match)!=1:raise ValueError('Unresolved local use')
        new=E.Element('{'+NS+'}g');new.append(copy.deepcopy(match[0]));
        for k,v in el.attrib.items():
            if E.QName(k).localname not in ('href','x','y'):new.set(k,v)
        new.set('transform',f"translate({el.get('x','0')} {el.get('y','0')}) "+new.get('transform',''))
        el.getparent().replace(el,new)
    if doc.get('viewBox') is None:
        w=float(re.sub('[^0-9.]','',doc.get('width','0')));h=float(re.sub('[^0-9.]','',doc.get('height','0')))
        if not w or not h:raise ValueError('No dimensions')
        doc.set('viewBox',f'0 0 {w} {h}')
    doc.attrib.pop('width',None);doc.attrib.pop('height',None)
    E.cleanup_namespaces(doc)
    return E.tostring(doc,encoding='unicode')
def main():
    OUT.mkdir(exist_ok=True,parents=True);originals=OUT/'originals';originals.mkdir(exist_ok=True)
    research=SRC/'brand-research.json'
    if not research.exists():research=ROOT/'public/data/airline-sources/brand-research.json'
    rows=json.loads(research.read_text(encoding='utf-8'));assets={}
    for r in rows:
        key=r['key'];sources=[]
        for suffix in ['original','official']:
            p=SRC/f'{key}-{suffix}.svg'
            if p.exists():
                if p.resolve()!=(originals/p.name).resolve():shutil.copyfile(p,originals/p.name)
                sources.append(p)
        # Official white Emirates badge cannot be used on a white tile; the
        # independently sourced red full mark stays intact instead.
        chosen=SRC/f'{key}-official.svg'
        if key=='emirates' or not chosen.exists():chosen=SRC/f'{key}-original.svg'
        r['included']=False
        if not chosen.exists():r['missing']='No reliable vector obtained';continue
        try:
            full=sanitize(chosen.read_bytes())
            if key=='emirates':
                root=E.fromstring(full.encode())
                # Entire unrelated editor sample above the original viewBox;
                # the Arabic and English brand paths remain untouched.
                first=next((n for n in root if E.QName(n).localname=='g'),None)
                if first is not None:root.remove(first)
                full=E.tostring(root,encoding='unicode')
            p=OUT/f'{key}-full.svg';p.write_text(full+'\n',encoding='utf-8')
            r['included']=True;r['chosenOriginal']=str(chosen.relative_to(ROOT)).replace('\\','/');r['fullPath']=str(p.relative_to(ROOT)).replace('\\','/')
            r['sanitization']='Preserve geometry; inline CSS; expand local uses; remove editor metadata and XML declarations'
            r['fullSha256']=hashlib.sha256(p.read_bytes()).hexdigest()
            r['symbolStatus']='Pending visual split review; whole mark retained'
            assets[key]={'name':r['name'],'code':r['code'],'full':'data:image/svg+xml;base64,'+base64.b64encode(full.encode()).decode()}
        except Exception as e:r['missing']=str(e)
        r['usage']='Brand identifiers remain trademarks; no endorsement or general redistribution license implied. See per-file source metadata.'
    (ROOT/'src/airline-brand-assets.json').write_text(json.dumps(assets,separators=(',',':'))+'\n',encoding='utf-8')
    (OUT/'manifest.json').write_text(json.dumps({'checked':'2026-10-15','brands':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Included',len(assets),'/',len(rows))
if __name__=='__main__':main()
