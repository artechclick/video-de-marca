"""Hoja de contacto de los cuadros de prueba.  python3 05_motor/src/hoja.py 06_pruebas/9x16 [salida.jpg]"""
import sys, glob, os
from PIL import Image, ImageDraw
fs = sorted(glob.glob(os.path.join(sys.argv[1], 't*.jpg'))); out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(sys.argv[1], 'hoja.jpg')
w0, h0 = Image.open(fs[0]).size; s = 560 / max(w0, h0); w, h = int(w0 * s), int(h0 * s); cols = 3 if w >= h else 5; rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows))
for i, f in enumerate(fs):
    im = Image.open(f).resize((w, h)); d = ImageDraw.Draw(im); d.rectangle([0, 0, 96, 20], fill='black'); d.text((5, 4), os.path.basename(f)[1:-4] + 's', fill='yellow'); S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(out, quality=85); print(out)
