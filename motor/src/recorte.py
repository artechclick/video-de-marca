"""Quita el fondo blanco o liso de un personaje, producto o logo.  python3 05_motor/src/recorte.py entrada.png salida.png [tolerancia=22]"""
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
im = Image.open(sys.argv[1]).convert('RGB'); a = np.asarray(im).astype(np.float32); tol = float(sys.argv[3]) if len(sys.argv) > 3 else 22
ref = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), 0)            # color de fondo = mediana del borde
fondo = np.abs(a - ref).max(2) < tol
lab, _ = ndimage.label(fondo); borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
alfa = ~np.isin(lab, list(borde)); alfa = ndimage.binary_opening(alfa, iterations=1)
m = Image.fromarray((alfa * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)); out = im.copy(); out.putalpha(m)
bb = out.getbbox(); out.crop(bb).save(sys.argv[2]); print(sys.argv[2], out.crop(bb).size)
