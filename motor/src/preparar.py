"""Instala dependencias, baja fuentes (Google Fonts vía @fontsource) e íconos (Lucide).  python3 05_motor/src/preparar.py"""
import os, json, subprocess, shutil, glob, sys
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); M = f'{RAIZ}/05_motor'
MARCA = json.load(open(f'{RAIZ}/01_marca/marca.json')); PROY = json.load(open(f'{M}/proyecto.json'))
run = lambda *a, **k: subprocess.run(*a, check=True, **k)
modo = PROY.get('voz', {}).get('modo', 'tts')
pips = ['soundfile', 'scipy', 'numpy', 'pillow'] + (['kokoro-onnx', 'librosa', 'numba', 'espeakng-loader'] if modo in ('tts', 'propia') else [])
run([sys.executable, '-m', 'pip', 'install', '-q', '--break-system-packages', *pips])
if not os.path.exists(f'{M}/package.json'): run(['npm', 'init', '-y'], cwd=M, stdout=subprocess.DEVNULL)
pk = ['lucide-static@0.460.0'] + sorted({'@fontsource/' + f['fontsource'] for f in MARCA.get('tipografia', {}).values() if f.get('fontsource')})
run(['npm', 'install', '--silent', *pk], cwd=M)
os.makedirs(f'{M}/cache/iconos', exist_ok=True)
if not os.path.exists(f'{M}/cache/clips.json'): open(f'{M}/cache/clips.json', 'w').write('{}')
for f in glob.glob(f'{M}/node_modules/lucide-static/icons/*.svg'): shutil.copy(f, f'{M}/cache/iconos/')
os.makedirs(f'{RAIZ}/01_marca/fuentes', exist_ok=True); cambio = False
for rol, f in MARCA.get('tipografia', {}).items():   # copia el .woff2 del peso pedido y lo registra en marca.json
    if not f.get('fontsource'): continue
    src = f"{M}/node_modules/@fontsource/{f['fontsource']}/files/{f['fontsource']}-latin-{f.get('peso', 400)}-normal.woff2"
    if not os.path.exists(src): print('no existe ese peso:', src); continue
    dst = f"fuentes/{f['fontsource']}-{f.get('peso', 400)}.woff2"; shutil.copy(src, f'{RAIZ}/01_marca/{dst}')
    if f.get('archivo') != dst: f['archivo'] = dst; cambio = True
if cambio: json.dump(MARCA, open(f'{RAIZ}/01_marca/marca.json', 'w'), ensure_ascii=False, indent=2)
run(['node', '-e', "require('playwright')"]); run(['ffmpeg', '-version'], stdout=subprocess.DEVNULL)
print('listo: fuentes en 01_marca/fuentes, íconos en 05_motor/cache/iconos (' + str(len(os.listdir(f'{M}/cache/iconos'))) + ')')
