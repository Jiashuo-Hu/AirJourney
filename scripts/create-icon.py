"""Run render-app-icon.cjs first. All rasters come from public/app-logo.svg."""
from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parent.parent
im=Image.open(root/'public/app-icon.png').convert('RGBA')
assert im.size==(512,512) and im.getpixel((0,0))[3]==0
sizes=[16,20,24,32,40,48,64,128,256]
im.save(root/'public/app.ico',sizes=[(n,n) for n in sizes])
folder=root/'public/icons';folder.mkdir(exist_ok=True)
for n in sizes: im.resize((n,n),Image.Resampling.LANCZOS).save(folder/f'app-{n}.png')
print('Generated transparent multi-size ICO and PNGs from canonical SVG')
