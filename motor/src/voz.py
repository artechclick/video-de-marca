"""Voz y tiempos.  Desde la carpeta del proyecto:
  python3 05_motor/src/voz.py tts                -> voz sintética (Kokoro) de 00_brief/guion_voz.txt
  python3 05_motor/src/voz.py propia ARCHIVO     -> usa la grabación del cliente y la alinea palabra por palabra
  python3 05_motor/src/voz.py lectura            -> sin voz: tiempos por velocidad de lectura (texto en pantalla + música)
Salida: 02_voz/voz.wav (48 kHz mono, salvo 'lectura') y 02_voz/tiempos.json
"""
import sys, os, re, json, ctypes, subprocess, numpy as np
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROY = json.load(open(f'{RAIZ}/05_motor/proyecto.json'))
MARCA = json.load(open(f'{RAIZ}/01_marca/marca.json'))
V = {**{'idioma': 'es', 'voz': 'em_alex', 'velocidad': 1.0, 'pausa_oracion': .30, 'pausa_parrafo': .65}, **MARCA.get('voz', {}), **PROY.get('voz', {})}
SR = 48000
ESPEAK = {'es': 'es-419', 'en': 'en-us', 'pt': 'pt-br', 'fr': 'fr-fr', 'it': 'it'}
KOKORO = {'es': 'es', 'en': 'en-us', 'pt': 'pt-br', 'fr': 'fr-fr', 'it': 'it'}

def oraciones():
    txt = open(f'{RAIZ}/00_brief/guion_voz.txt', encoding='utf-8').read().strip()
    out = []
    for pi, par in enumerate(p for p in re.split(r'\n\s*\n', txt) if p.strip()):
        for s in re.split(r'(?<=[.!?…])\s+', ' '.join(par.split())):
            if s.strip(): out.append({'texto': s.strip(), 'parrafo': pi})
    return out

def palabras(s):  # [(palabra, inicio_char, fin_char)]
    return [(m.group(), m.start(), m.end()) for m in re.finditer(r'\S+', s)]

def espeak_sintetico(ors):
    """Síntesis guía con espeak-ng: devuelve audio 16 kHz y, por oración, tiempos sintéticos de cada palabra."""
    import espeakng_loader as EL
    lib = ctypes.cdll.LoadLibrary(EL.get_library_path())
    class EV(ctypes.Structure):
        _fields_ = [('type', ctypes.c_int), ('uid', ctypes.c_uint), ('text_position', ctypes.c_int), ('length', ctypes.c_int), ('audio_position', ctypes.c_int), ('sample', ctypes.c_int), ('user_data', ctypes.c_void_p), ('id', ctypes.c_char * 8)]
    CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.POINTER(EV))
    sr = lib.espeak_Initialize(1, 500, EL.get_data_path().encode(), 0)
    lib.espeak_SetVoiceByName(ESPEAK.get(V['idioma'], V['idioma']).encode()); lib.espeak_SetParameter(1, 175, 0)
    buf, ev, cur = [], [], {'off': 0}
    @CB
    def cb(wav, n, e):
        if n > 0: buf.append(np.ctypeslib.as_array(wav, shape=(n,)).copy())
        i = 0
        while e[i].type != 0:
            if e[i].type == 1: ev.append((cur['k'], e[i].text_position, cur['off'] + e[i].sample))
            i += 1
        return 0
    lib.espeak_SetSynthCallback(cb)
    lims = []
    for k, o in enumerate(ors):
        cur['k'] = k; cur['off'] = sum(len(b) for b in buf); a = cur['off']
        b = o['texto'].encode('utf-8'); lib.espeak_Synth(b, len(b) + 1, 0, 0, 0, 0x1, None, None); lib.espeak_Synchronize()
        lims.append((a / sr, sum(len(x) for x in buf) / sr))
        buf.append(np.zeros(int((V['pausa_parrafo'] if k + 1 < len(ors) and ors[k + 1]['parrafo'] != o['parrafo'] else V['pausa_oracion']) * sr), np.int16))
    y = np.concatenate(buf).astype(np.float32) / 32768
    sint = []
    for k, o in enumerate(ors):  # tiempo sintético de cada palabra (posición de carácter -> palabra)
        ws = palabras(o['texto']); t = [None] * len(ws)
        for (kk, tp, smp) in ev:
            if kk != k: continue
            c = tp - 1; j = next((i for i, (_, a, b) in enumerate(ws) if a <= c < b), None)
            if j is not None and t[j] is None: t[j] = smp / sr
        a, b = lims[k]; known = [(i, x) for i, x in enumerate(t) if x is not None]
        if not known: known = [(0, a)]
        for i in range(len(t)):  # interpola palabras sin evento
            if t[i] is None:
                prev = max([q for q in known if q[0] < i], default=(-1, a), key=lambda q: q[0]); nxt = min([q for q in known if q[0] > i], default=(len(t), b), key=lambda q: q[0])
                t[i] = prev[1] + (nxt[1] - prev[1]) * (i - prev[0]) / (nxt[0] - prev[0])
        sint.append({'palabras': t, 'fin': b})
    import librosa
    return librosa.resample(y, orig_sr=sr, target_sr=16000), sint

def alinear(ors, wav48, limites=None):
    """DTW entre la síntesis guía y la voz real (MFCC + deltas + voz/silencio). Precisión típica: ±0,1 s."""
    import librosa, numba
    guia, sint = espeak_sintetico(ors); real = librosa.resample(wav48, orig_sr=SR, target_sr=16000); hop = 320
    def feats(y):
        m = librosa.feature.mfcc(y=y, sr=16000, n_mfcc=20, hop_length=hop, n_fft=1024)[1:]; f = np.vstack([m, librosa.feature.delta(m)]).T
        f = (f - f.mean(0)) / (f.std(0) + 1e-6); r = 20 * np.log10(librosa.feature.rms(y=y, hop_length=hop, frame_length=1024)[0] + 1e-6)
        v = (r > np.percentile(r, 95) - 30).astype(np.float32)[:len(f)]; return np.hstack([f, 3 * v[:, None]]).astype(np.float32)
    A, B = feats(guia), feats(real); n, m = len(A), len(B); band = int(min(1500, max(300, abs(n - m) + .12 * max(n, m))))
    @numba.njit(cache=False)
    def dtw(A, B, band):
        n, m = A.shape[0], B.shape[0]; D = np.full((n + 1, 2 * band + 1), np.inf); P = np.zeros((n + 1, 2 * band + 1), np.int8); D[0, band] = 0.0
        for i in range(1, n + 1):
            ci = int(i * m / n); cp = int((i - 1) * m / n)
            for c in range(2 * band + 1):
                j = ci + c - band
                if j < 1 or j > m: continue
                d = 0.0
                for k in range(A.shape[1]): t = A[i - 1, k] - B[j - 1, k]; d += t * t
                d = np.sqrt(d); best = np.inf; bp = 0
                cc = j - 1 - cp + band
                if 0 <= cc < 2 * band + 1 and D[i - 1, cc] < best: best = D[i - 1, cc]; bp = 0
                cc = j - cp + band
                if 0 <= cc < 2 * band + 1 and D[i - 1, cc] + d * .5 < best: best = D[i - 1, cc] + d * .5; bp = 1
                if c >= 1 and D[i, c - 1] + d * .5 < best: best = D[i, c - 1] + d * .5; bp = 2
                D[i, c] = best + d; P[i, c] = bp
        i, j, k = n, m, 0; pi = np.zeros(n + m, np.int64); pj = np.zeros(n + m, np.int64)
        while i > 0 and j > 0:
            pi[k] = i - 1; pj[k] = j - 1; k += 1; b = P[i, j - int(i * m / n) + band]
            if b == 0: i -= 1; j -= 1
            elif b == 1: i -= 1
            else: j -= 1
        return pi[:k][::-1], pj[:k][::-1]
    pi, pj = dtw(A, B, band); mapa = np.interp(np.arange(n), pi, pj)
    real_t = lambda ts: float(mapa[min(n - 1, int(ts * 16000 / hop))] * hop / 16000)
    out = []
    for k, o in enumerate(ors):
        ws = palabras(o['texto']); t = [real_t(x) for x in sint[k]['palabras']]; fin = real_t(sint[k]['fin'])
        if limites: a, b = limites[k]; t = [min(max(x, a), b - .05) for x in t]; t[0] = a; fin = b
        t = list(np.maximum.accumulate(t))
        out.append({'t0': round(t[0], 3), 't1': round(max(fin, t[-1] + .15), 3), 'texto': o['texto'], 'parrafo': o['parrafo'],
                    'palabras': [[w, round(t[i], 3), round(t[i + 1] if i + 1 < len(t) else max(fin, t[i] + .15), 3)] for i, (w, _, _) in enumerate(ws)]})
    return out

def recortar_silencio(y, sr, umbral=.012):
    v = np.where(np.abs(y) > umbral)[0]
    if not len(v): return y
    a = max(0, v[0] - int(.03 * sr)); b = min(len(y), v[-1] + int(.06 * sr)); return y[a:b]

def guardar(ors, modo, wav=None):
    os.makedirs(f'{RAIZ}/02_voz', exist_ok=True)
    if wav is not None:
        import soundfile as sf; sf.write(f'{RAIZ}/02_voz/voz.wav', wav.astype(np.float32), SR)
    dur = max(o['t1'] for o in ors)
    json.dump({'modo': modo, 'duracion': round(dur, 3), 'oraciones': ors}, open(f'{RAIZ}/02_voz/tiempos.json', 'w'), ensure_ascii=False, indent=1)
    print(f'{modo}: {len(ors)} oraciones, {dur:.1f} s -> 02_voz/tiempos.json')

def modo_tts():
    from kokoro_onnx import Kokoro
    from scipy.signal import resample_poly
    cache = os.path.expanduser('~/.cache/kokoro'); os.makedirs(cache, exist_ok=True)
    base = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
    for f in ['kokoro-v1.0.onnx', 'voices-v1.0.bin']:
        if not os.path.exists(f'{cache}/{f}'): subprocess.run(['curl', '-sSL', '-o', f'{cache}/{f}', base + f], check=True)
    k = Kokoro(f'{cache}/kokoro-v1.0.onnx', f'{cache}/voices-v1.0.bin')
    ors = oraciones(); partes, lim, t = [], [], 0.0
    for i, o in enumerate(ors):
        y, sr = k.create(o['texto'], voice=V['voz'], speed=V['velocidad'], lang=KOKORO.get(V['idioma'], V['idioma']))
        y = resample_poly(recortar_silencio(y, sr), SR, sr).astype(np.float32); lim.append((t, t + len(y) / SR)); partes.append(y); t += len(y) / SR
        p = V['pausa_parrafo'] if i + 1 < len(ors) and ors[i + 1]['parrafo'] != o['parrafo'] else V['pausa_oracion']
        partes.append(np.zeros(int(p * SR), np.float32)); t += p
    wav = np.concatenate(partes); wav = wav / (np.abs(wav).max() + 1e-9) * .89
    guardar(alinear(ors, wav, lim), 'tts', wav)

def modo_propia(archivo):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', archivo, '-ac', '1', '-ar', str(SR), '-af', 'highpass=f=70', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    wav = np.frombuffer(raw, np.float32).copy(); wav = wav / (np.abs(wav).max() + 1e-9) * .89
    guardar(alinear(oraciones(), wav), 'propia', wav)

def modo_lectura():
    ors, t = oraciones(), 0.0
    for i, o in enumerate(ors):
        ws = palabras(o['texto']); d = max(1.4, .33 * len(ws) + .5); paso = (d - .4) / len(ws)
        o.update({'t0': round(t, 3), 't1': round(t + d, 3), 'palabras': [[w, round(t + j * paso, 3), round(t + (j + 1) * paso, 3)] for j, (w, _, _) in enumerate(ws)]})
        t += d + (.5 if i + 1 < len(ors) and ors[i + 1]['parrafo'] != o['parrafo'] else .15)
    guardar(ors, 'lectura')

if __name__ == '__main__':
    m = sys.argv[1] if len(sys.argv) > 1 else 'tts'
    {'tts': modo_tts, 'lectura': modo_lectura}.get(m, lambda: modo_propia(sys.argv[2]))()
