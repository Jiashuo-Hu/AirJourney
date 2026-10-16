"""Run render-app-icon.cjs first. All rasters come from public/app-logo.svg."""
from PIL import Image
import io,struct
from pathlib import Path
root=Path(__file__).resolve().parent.parent
im=Image.open(root/'public/app-icon.png').convert('RGBA')
assert im.size==(512,512) and im.getpixel((0,0))[3]==0
sizes=[16,20,24,32,40,48,64,128,256]
folder=root/'public/icons';folder.mkdir(exist_ok=True)
encoded=[]
for n in sizes:
    resized=im.resize((n,n),Image.Resampling.LANCZOS)
    # Lanczos can ring into fully transparent corners at small sizes (alpha 1-3).
    # Keep the smooth visible edge, remove only these invisible resampling specks.
    resized.putalpha(resized.getchannel('A').point(lambda a:0 if a<4 else a))
    assert resized.getpixel((0,0))[3]==0
    resized.save(folder/f'app-{n}.png')
    data=io.BytesIO();resized.save(data,format='PNG');encoded.append(data.getvalue())
offset=6+16*len(sizes);directory=[]
for n,data in zip(sizes,encoded):
    directory.append(struct.pack('<BBBBHHII',n if n<256 else 0,n if n<256 else 0,0,0,1,32,len(data),offset))
    offset+=len(data)
(root/'public/app.ico').write_bytes(struct.pack('<HHH',0,1,len(sizes))+b''.join(directory)+b''.join(encoded))
print('Generated transparent multi-size ICO and PNGs from canonical SVG')
