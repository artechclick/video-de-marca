"""Videos -> cuadros JPG que el motor lee sin decodificar video en el navegador.
  python3 05_motor/src/clips.py revisar 03_material/videos/x.mp4 [cada_seg]  -> hoja de contacto con tiempos (elige rangos útiles)
  python3 05_motor/src/clips.py [formato]                                     -> extrae todo lo listado en 05_motor/clips.json
clips.json: [{"clave": "oficina", "archivo": "03_material/videos/x.mp4", "desde": 12.5, "dur": 4, "recorte": "crop=1280:720:0:0"}]
"""
import sys, os, json, subprocess, glob
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FMT = {'16:9': (1920, 1080), '9:16': (1080, 1920), '4:5': (1080, 1350), '1:1': (1080, 1080)}
if len(sys.argv) > 2 and sys.argv[1] == 'revisar':
    from PIL import Image, ImageDraw
    v = os.path.join(RAIZ, sys.argv[2]); cada = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    tmp = f'{RAIZ}/05_motor/cache/revisar'; os.makedirs(tmp, exist_ok=True); [os.remove(f) for f in glob.glob(tmp + '/*.jpg')]
    subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-vf', f'fps=1/{cada},scale=384:-2', f'{tmp}/%05d.jpg'], check=True)
    fs = sorted(glob.glob(tmp + '/*.jpg'))[:200]; w, h = Image.open(fs[0]).size; cols = 8; rows = (len(fs) + cols - 1) // cols
    S = Image.new('RGB', (w * cols, h * rows))
    for i, f in enumerate(fs):
        im = Image.open(f); d = ImageDraw.Draw(im); d.rectangle([0, 0, 70, 18], fill='black'); d.text((4, 3), f'{i * cada:.1f}s', fill='yellow'); S.paste(im, ((i % cols) * w, (i // cols) * h))
    out = f"{RAIZ}/06_pruebas/hoja_{os.path.splitext(os.path.basename(v))[0]}.jpg"; os.makedirs(os.path.dirname(out), exist_ok=True); S.save(out, quality=85); print(out); sys.exit()
fmt = sys.argv[1] if len(sys.argv) > 1 else json.load(open(f'{RAIZ}/05_motor/proyecto.json'))['formato']
W, H = FMT.get(fmt, (1920, 1080)); meta = {}
for c in json.load(open(f'{RAIZ}/05_motor/clips.json')):
    o = f"{RAIZ}/05_motor/cache/clips/{c['clave']}"; os.makedirs(o, exist_ok=True); [os.remove(f) for f in glob.glob(o + '/*.jpg')]
    # escala para cubrir el formato con 15 % de margen (permite zoom y paneo sin perder nitidez)
    vf = (c['recorte'] + ',' if c.get('recorte') else '') + f"scale='if(gt(iw/ih,{W}/{H}),-2,{int(W * 1.15)})':'if(gt(iw/ih,{W}/{H}),{int(H * 1.15)},-2)':flags=lanczos,fps=30"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(c.get('desde', 0)), '-t', str(c.get('dur', 4)), '-i', f"{RAIZ}/{c['archivo']}", '-an', '-vf', vf, '-q:v', '3', f'{o}/%04d.jpg'], check=True)
    meta[c['clave']] = {'n': len(glob.glob(o + '/*.jpg'))}; print(c['clave'], meta[c['clave']]['n'], 'cuadros')
json.dump(meta, open(f'{RAIZ}/05_motor/cache/clips.json', 'w'))
