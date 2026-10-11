from PIL import Image, ImageDraw
from pathlib import Path
root=Path(__file__).resolve().parent.parent
im=Image.new('RGBA',(256,256),(0,0,0,0));d=ImageDraw.Draw(im)
d.rounded_rectangle((0,0,255,255),radius=60,fill='#245fd6')
d.line([(64,192),(192,64)],fill='white',width=18)
d.line([(105,64),(192,64),(192,151)],fill='white',width=18,joint='curve')
im.save(root/'public/app.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
im.save(root/'public/app-icon.png')
