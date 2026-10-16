"""Read-only comparison of PE/window icon extracts against canonical derivatives."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
install=json.loads((root/'evidence/v0.4/install.json').read_text(encoding='utf-8-sig'))
directory=root/'evidence/v0.4/verified-regression-final/native-icons'
rows=[]
for p in directory.glob('*.png'):
    actual=Image.open(p).convert('RGBA');w,h=actual.size
    ref=root/('public/app-icon.png' if w==512 else f'public/icons/app-{w}.png')
    expected=Image.open(ref).convert('RGBA');assert expected.size==actual.size
    compared=mismatched=0
    for a,b in zip(actual.getdata(),expected.getdata()):
        if b[3]>200:
            compared+=1
            # WM_GETICON -> System.Drawing keeps premultiplied RGB at soft edges;
            # PE PNG extraction is straight RGBA. Compare each declared format.
            rgb=[round(b[i]*b[3]/255) for i in range(3)] if p.name.startswith('window-') else b[:3]
            if max([abs(a[i]-rgb[i]) for i in range(3)]+[abs(a[3]-b[3])])>3:mismatched+=1
    assert actual.getpixel((0,0))[3]==0 and mismatched==0,(p,mismatched)
    rows.append({'path':str(p.relative_to(root)),'reference':str(ref.relative_to(root)),'size':w,'opaqueCompared':compared,'opaqueMismatched':mismatched,'cornerAlpha':0,'rgbFormat':'premultiplied' if p.name.startswith('window-') else 'straight'})
assert len(rows)==4
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report={'status':'PASS','finalInstallerSha256':install['installerSha256'],'finalInstalledExeSha256':hashfile(Path(install['installedExe'])),'finalNativeIconPixels':rows,'method':'PE and WM_GETICON images compared to the canonical PNG derivatives, opaque RGBA tolerance 3. No desktop input or screenshots.','nativeWindowVisualReview':{'candidateInstallerSha256':'d7a0690b6a84926c4e636a9e49c648f0417dc127059268a9f58d8c2f9af72727','sameCanonicalArtwork':True,'windowTitle':'AirJourney v0.4','observation':'Before user requested background-only work: actual title-bar and app header both displayed the new blue globe/airplane; route endpoints visible. Final package is compared by resource pixels, not a new foreground observation.','finalForegroundReviewRepeated':False},'taskbarIndependentPixels':False,'existingPinnedCacheChecked':False,'userDesktopNotUsedForFinalTests':True}
(root/'evidence/v0.4/native-visual-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS 4 final PE/window icon comparisons')
