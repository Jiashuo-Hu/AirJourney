import json,copy,sys
from pathlib import Path
from lxml import etree as E
from fontTools.svgLib.path import parse_path
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
out=Path(sys.argv[1] if len(sys.argv)>1 else '.tools/v0.3-sources/expanded');out.mkdir(exist_ok=True,parents=True)
for p in Path('public/logos/airlines').glob('*-full.svg'):
    root=E.fromstring(p.read_bytes())
    for el in list(root.iter('{http://www.w3.org/2000/svg}path')):
        pen=RecordingPen();parse_path(el.get('d',''),pen)
        contours=[];current=[]
        for op,pts in pen.value:
            if op=='moveTo' and current:contours.append(current);current=[]
            current.append((op,pts))
        if current:contours.append(current)
        if len(contours)<2:continue
        group=E.Element('{http://www.w3.org/2000/svg}g')
        group.set('data-contour-group','true')
        for k,v in el.attrib.items():
            if k!='d':group.set(k,v)
        for ops in contours:
            dst=SVGPathPen(None)
            for op,pts in ops:getattr(dst,op)(*pts)
            child=E.SubElement(group,'{http://www.w3.org/2000/svg}path');child.set('d',dst.getCommands())
        el.getparent().replace(el,group)
    (out/p.name).write_bytes(E.tostring(root))
