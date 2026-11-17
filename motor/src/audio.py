"""Música generada + efectos de sonido + voz -> 04_audio/mezcla.wav (-14 LUFS, -1 dBTP).
Desde la carpeta del proyecto, DESPUÉS de `node 05_motor/src/render.js info`:  python3 05_motor/src/audio.py
"""
import json, os, glob, subprocess, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROY = json.load(open(f'{RAIZ}/05_motor/proyecto.json'))
TM = json.load(open(f'{RAIZ}/02_voz/tiempos.json'))
CUES = json.load(open(f'{RAIZ}/05_motor/cache/cues.json'))
SECC = json.load(open(f'{RAIZ}/05_motor/cache/secciones.json'))
MUS = {**{'bpm': 100, 'tonalidad': 'menor', 'volumen': 1.0, 'archivo': None}, **PROY.get('musica', {})}
SR = 48000; OFF = PROY.get('preroll', .8); FIN = TM['duracion'] + OFF + PROY.get('cola', 3); N = int(FIN * SR)
rng = np.random.default_rng(7)
def t_(d): return np.arange(int(round(d * SR))) / SR
def noise(d): return rng.standard_normal(int(round(d * SR))).astype(np.float32)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def env(n, a, r, sus=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)); dur = n / SR
    e *= np.exp(-np.maximum(0, t - a) / max(r, 1e-4)) if sus is None else np.clip((dur - t) / max(r, 1e-4), 0, 1)
    return e
def sweep(f0, f1, d, kind='exp'):
    t = t_(d); f = f0 * (f1 / f0) ** (t / d) if kind == 'exp' else f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def saw(f, d):
    t = t_(d); ph = (np.cumsum(np.broadcast_to(f, t.shape)) / SR) % 1.0; return 2 * ph - 1
def sq(f, d): return np.sign(np.sin(2 * np.pi * f * t_(d)))
def st(x, pan=0.0):  # mono -> stereo with pan -1..1
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4); return np.stack([x * l, x * r], 1)

# ------------------------------------------------------------ SFX library
def S_whoosh(d=.5, hi=3500):
    n = noise(d); n = bp(n, 250, hi, 2); e = np.sin(np.pi * np.clip(t_(d) / d, 0, 1)) ** 2
    m = n * e; pan = np.linspace(-.7, .7, len(m)); return np.stack([m * np.cos((pan + 1) * np.pi / 4), m * np.sin((pan + 1) * np.pi / 4)], 1) * 1.6
def S_swoosh(): return S_whoosh(.35, 6000) * .8
def S_hit():
    d = 1.2; t = t_(d); x = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 5) * 1.2 + lp(noise(d), 2500) * np.exp(-t * 30) * .8
    return st(np.tanh(x * 1.4))
def S_impact():
    d = 2.5; t = t_(d); f = 90 * np.exp(-t * 2) + 32; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) * 1.4
    x += lp(noise(d), 1800) * np.exp(-t * 6) * 1.0 + hp(noise(d), 3000) * np.exp(-t * 40) * .4
    return st(np.tanh(x * 1.5))
def S_boom():
    d = 3.0; t = t_(d); x = np.sin(2 * np.pi * (42 + 20 * np.exp(-t * 3)) * t) * np.exp(-t * 1.1) * 1.3 + lp(noise(d), 300) * np.exp(-t * 1.5) * .7
    return st(np.tanh(x * 1.3))
def S_braam():
    d = 3.2; t = t_(d); x = np.zeros_like(t)
    for f in [36.71, 73.42, 110.0, 146.83, 174.6]:
        for dt in [-.6, 0, .7]: x += saw(f + dt, d) / (1 + f / 120)
    cut = 150 + 2200 * np.exp(-t * 1.2) * np.clip(t / .08, 0, 1)
    y = np.zeros_like(x); blk = 2400
    for i in range(0, len(x), blk):  # time-varying lowpass in blocks
        y[i:i + blk] = lp(x[max(0, i - 4800):i + blk], max(80, cut[i]))[-len(x[i:i + blk]):]
    y = np.tanh(y * 1.4) * np.clip(t / .03, 0, 1) * np.exp(-t * .9)
    return st(y * .9)
def S_riser(d=1.5):
    d = max(.4, d); t = t_(d); x = bp(noise(d), 400, 8000) * (t / d) ** 2 * .7 + sweep(200, 1600, d) * (t / d) ** 2 * .35
    return st(x)
def S_blip(): t = t_(.09); return st(np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 40) * .5)
def S_pop(): t = t_(.14); return st(np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t * 25) + 250) / SR) * np.exp(-t * 28) * .7)
def S_pin(): t = t_(.5); return st((np.sin(2 * np.pi * 1568 * t) + .6 * np.sin(2 * np.pi * 2352 * t)) * np.exp(-t * 9) * .35, .2)
def S_stamp():
    d = .7; t = t_(d); x = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 18) * 1.2 + lp(noise(d), 4000) * np.exp(-t * 35) * 1.0
    return st(np.tanh(x * 1.6))
def S_slam():
    d = .9; t = t_(d); x = np.sin(2 * np.pi * 70 * t) * np.exp(-t * 10) + bp(noise(d), 300, 6000) * np.exp(-t * 22) * 1.1
    return st(np.tanh(x * 1.5))
def S_static(d=.6): d = max(.15, d); n = bp(noise(d), 800, 9000) * (rng.random(int(round(d * SR))) > .3); return st(n * .35 * env(len(n), .02, .1, True))
def S_counter(d=1.0):
    d = max(.3, d); out = np.zeros(int(round(d * SR))); k = 0; tt = 0
    while tt < d: i = int(tt * SR); c = np.sin(2 * np.pi * 2600 * t_(.012)) * np.exp(-t_(.012) * 300); out[i:i + len(c)] += c[:len(out) - i] * .3; tt += .035 + .06 * (tt / d) ** 2
    return st(out)
def S_flap(): t = t_(.05); return st(bp(noise(.05), 1500, 6000) * np.exp(-t * 120) * .6, rng.uniform(-.4, .4))
def S_check(): a = np.sin(2 * np.pi * 880 * t_(.12)) * np.exp(-t_(.12) * 25); b = np.sin(2 * np.pi * 1320 * t_(.3)) * np.exp(-t_(.3) * 12); return st(np.concatenate([a, b]) * .35)
def S_glitch():
    d = .35; out = np.zeros(int(round(d * SR)))
    for k in range(8):
        i = rng.integers(0, len(out) - 2000); L = rng.integers(400, 2400); f = rng.choice([220, 440, 880, 1760, 3520])
        seg = np.sign(np.sin(2 * np.pi * f * np.arange(L) / SR)) * .4 if rng.random() < .5 else rng.standard_normal(L) * .5
        out[i:i + L] += np.round(seg * 4) / 4
    return st(out * .7, rng.uniform(-.3, .3))
def S_notif(): a = np.sin(2 * np.pi * 1046 * t_(.12)) * np.exp(-t_(.12) * 20); b = np.sin(2 * np.pi * 1568 * t_(.4)) * np.exp(-t_(.4) * 8); return st(np.concatenate([a, b]) * .3, rng.uniform(-.6, .6))
def S_tick(): t = t_(.04); return st(hp(noise(.04), 2000) * np.exp(-t * 200) * .9)
def S_drone(d=3):
    d = max(1, d); t = t_(d); x = (saw(55, d) + saw(55.4, d) + .6 * saw(82.4, d)) * .25; x = lp(x, 500)
    return st(x * env(len(x), min(1, d / 3), min(1.2, d / 3), True))
def S_buzz(): t = t_(.45); x = sq(110, .45) * (0.6 + .4 * sq(30, .45)) * .25; return st(lp(x, 2500) * env(len(x), .005, .05, True))
def S_data(d=1.5):
    d = max(.3, d); out = np.zeros(int(round(d * SR))); tt = 0
    while tt < d - .05: L = .02 + rng.random() * .04; f = rng.choice([900, 1200, 1800, 2400, 3000]); i = int(tt * SR); s = np.sin(2 * np.pi * f * t_(L)) * .18; out[i:i + len(s)] += s[:len(out) - i]; tt += L + rng.random() * .03
    return st(out)
def S_powerdown(): t = t_(1.0); x = saw(np.linspace(420, 25, len(t)), 1.0) * np.exp(-t * 2.5) * .4; return st(lp(x, 1500))
def S_type(d=1.0):
    d = max(.3, d); out = np.zeros(int(round(d * SR))); tt = 0
    while tt < d - .03: i = int(tt * SR); c = bp(noise(.025), 1500, 7000) * np.exp(-t_(.025) * 250) * .5; out[i:i + len(c)] += c[:len(out) - i]; tt += .06 + rng.random() * .08
    return st(out)
def S_scratch(): t = t_(.45); f = 600 + 500 * np.sin(2 * np.pi * 6 * t); x = bp(noise(.45), 300, 3000) * .6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .3; return st(x * env(len(x), .01, .1, True))
def S_beep(): return st(np.sin(2 * np.pi * 1000 * t_(.15)) * .3 * env(int(round(.15 * SR)), .005, .03, True))
def S_ding(): t = t_(1.6); x = (np.sin(2 * np.pi * 2093 * t) + .4 * np.sin(2 * np.pi * 5230 * t)) * np.exp(-t * 3) * .35; return st(x)
def S_lock(): a = hp(noise(.03), 2000) * np.exp(-t_(.03) * 150); b = np.sin(2 * np.pi * 180 * t_(.15)) * np.exp(-t_(.15) * 30); return st(np.concatenate([a, np.zeros(2400), b]) * .7)
def S_rewind(): t = t_(.8); x = np.sin(2 * np.pi * np.cumsum(3000 * (1 - t / .8) ** 2 + 200 + 400 * np.sin(2 * np.pi * 18 * t)) / SR) * .2 + bp(noise(.8), 1000, 6000) * .15; return st(x * env(len(x), .05, .1, True))
def S_boing(): t = t_(.5); return st(np.sin(2 * np.pi * np.cumsum(300 + 200 * np.exp(-t * 6) * np.sin(2 * np.pi * 14 * t)) / SR) * np.exp(-t * 6) * .35)
def S_warp(): t = t_(.9); x = sweep(1200, 80, .9) * .3 + bp(noise(.9), 200, 2000) * .2; return st(x * env(len(x), .05, .2, True))
def S_heartbeat(d=1.5):
    d = max(1, d); out = np.zeros(int(round(d * SR))); b = 0
    def thump(): t = t_(.25); return np.sin(2 * np.pi * 50 * t) * np.exp(-t * 18)
    while b < d - .3:
        for o, g in [(0, 1), (.22, .7)]:
            i = int((b + o) * SR); s = thump() * g; out[i:i + len(s)] += s[:max(0, len(out) - i)]
        b += .85
    return st(out * .9)
def S_click(): return st(hp(noise(.02), 3000) * np.exp(-t_(.02) * 300) * .8)
def S_granted(): return st(np.concatenate([np.sin(2 * np.pi * f * t_(.12)) * np.exp(-t_(.12) * 10) for f in [784, 988, 1175, 1568]]) * .35)
def S_fall(): t = t_(1.0); return st(sweep(1800, 300, 1.0) * .25 * env(len(t), .02, .2, True))
def S_ring(d=1.6):
    d = max(.8, d); t = t_(d); x = (np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * (np.sin(2 * np.pi * 20 * t) > 0) * .12 * ((t % 1.0) < .6); return st(x)
def S_scan(d=3): d = max(.5, d); t = t_(d); return st(np.sin(2 * np.pi * np.cumsum(1500 + 1000 * np.sin(2 * np.pi * 1.2 * t)) / SR) * .08 * env(len(t), .1, .3, True))
def S_whisper(): d = 1.5; n = bp(noise(d), 2500, 9000) * .3; return st(n * np.sin(np.pi * t_(d) / d) ** 2)
def S_pulse(): t = t_(1.5); return st(np.sin(2 * np.pi * 80 * t) * np.exp(-t * 3) * .9 + np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 5) * .15)
def S_boot(): return st(np.concatenate([np.sin(2 * np.pi * f * t_(.15)) * np.exp(-t_(.15) * 6) for f in [440, 554, 659, 880]]) * .3)
def S_snap(): t = t_(.3); return st(np.tanh((hp(noise(.3), 1500) * np.exp(-t * 60) + np.sin(2 * np.pi * 150 * t) * np.exp(-t * 30)) * 2) * .8)
def S_zap(): t = t_(.4); x = np.sign(np.sin(2 * np.pi * np.cumsum(2000 * np.exp(-t * 8) + 100) / SR)) * .25 * np.exp(-t * 6); return st(x + bp(noise(.4), 2000, 8000) * np.exp(-t * 15) * .3)
def S_paper(): d = .5; return st(bp(noise(d), 2000, 8000) * (rng.random(int(round(d * SR))) > .6) * .4 * np.sin(np.pi * t_(d) / d))
def S_cash(): return np.concatenate([S_click(), S_ding()]) * 1.0


LIB = {k[2:]: v for k, v in globals().items() if k.startswith('S_')}
CON_DURACION = {'riser', 'static', 'counter', 'drone', 'data', 'type', 'heartbeat', 'ring', 'scan'}
GAN = {'whoosh': .5, 'swoosh': .4, 'hit': .8, 'impact': 1.0, 'boom': 1.0, 'braam': 1.0, 'riser': .7, 'blip': .5, 'pop': .5, 'pin': .6, 'stamp': .8, 'slam': .8,
       'static': .5, 'counter': .6, 'flap': .6, 'check': .6, 'glitch': .5, 'notif': .5, 'tick': .8, 'drone': .5, 'buzz': .6, 'data': .5, 'powerdown': .7}

# ------------------------------------------------------------ efectos
sfx = np.zeros((N, 2), np.float32)
for c in CUES:
    f = LIB.get(c['tipo'])
    if f is None: print('sonido desconocido:', c['tipo']); continue
    x = (f(c['dur']) if c['tipo'] in CON_DURACION and 'dur' in c else f()) * c.get('gain', 1) * GAN.get(c['tipo'], .6)
    i = int(c['t'] * SR) - (int(.01 * SR) if c['tipo'] in ('impact', 'boom', 'braam', 'hit', 'stamp', 'slam') else 0)
    if i < 0: x = x[-i:]; i = 0
    L = min(len(x), N - i)
    if L > 0: sfx[i:i + L] += x[:L]
ir_t = np.arange(int(1.6 * SR)) / SR   # reverberación corta para que los efectos "vivan" en el mismo espacio
ir = np.stack([lp(rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2), 5000), lp(rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.0), 5000)], 1).astype(np.float32)
ir /= np.abs(ir).sum(0) ** .5 * 6
sfx += np.stack([fftconvolve(sfx[:, k], ir[:, k])[:N] for k in range(2)], 1).astype(np.float32) * .35

# ------------------------------------------------------------ música
mus = np.zeros((N, 2), np.float32)
def add(x, t, pan=0, g=1.0):
    i = int(t * SR); L = min(len(x), N - i)
    if L <= 0 or i < 0: return
    if x.ndim == 1: x = st(x, pan)
    mus[i:i + L] += x[:L] * g
if MUS['archivo']:   # música propia de la marca: se repite con cruce y se acomoda al largo del video
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f"{RAIZ}/{MUS['archivo']}", '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    m = np.frombuffer(raw, np.float32).reshape(-1, 2).copy(); m /= np.abs(m).max() + 1e-9; xf = int(2 * SR); pos = 0
    while pos < N:
        L = min(len(m), N - pos); seg = m[:L].copy()
        if pos > 0: seg[:xf] *= np.linspace(0, 1, xf)[:, None]; mus[pos:pos + xf] *= np.linspace(1, 0, xf)[:, None]
        mus[pos:pos + L] += seg * .5; pos += len(m) - xf
else:
    BEAT = 60 / MUS['bpm']; BAR = BEAT * 4
    note = lambda m: 440 * 2 ** ((m - 69) / 12)
    MENOR = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]   # Rem Sib Fa Do
    MAYOR = [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]]   # Fa Do Rem Sib
    def pad(ch, d, cut=900):
        x = np.zeros(int(round(d * SR)))
        for mm in ch:
            for dt in (-.08, 0, .09): x += saw(note(mm - 12) * 2 ** (dt / 12), d)
        return lp(x, cut) * .05 * env(len(x), .6, .6, True)
    def bajo(mm, d, cut=500): t = t_(d); return lp(saw(note(mm - 24), d) * .5 + np.sin(2 * np.pi * note(mm - 24) * t) * .6, cut) * np.exp(-t * 4) * .5
    def bombo(): t = t_(.5); return np.tanh(np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 25) + 45) / SR) * np.exp(-t * 7) * 2) * .7
    def taiko(): t = t_(1.0); return np.tanh((np.sin(2 * np.pi * 68 * t) * np.exp(-t * 5) + lp(noise(1.0), 900) * np.exp(-t * 14) * .6) * 1.6) * .7
    def hat(): t = t_(.05); return hp(noise(.05), 7000) * np.exp(-t * 90) * .08
    def arp(mm, d=.22): t = t_(d); return lp(sq(note(mm), d) * .5 + saw(note(mm) * 1.003, d) * .5, 2600) * np.exp(-t * 14) * .12
    def brillo(d): t = t_(d); return sum(np.sin(2 * np.pi * note(mm) * t + k) * (.5 + .5 * np.sin(2 * np.pi * (.2 + k * .07) * t)) for k, mm in enumerate([86, 89, 93, 98])) * .025 * env(len(t), 1, 1, True)
    # estilos: tension, pulso, impulso, misterio, oscuro, luz, calma, epico, silencio
    for s in SECC:
        t0, t1, E_, I = s['t0'], s['t1'], s['estilo'], s['intensidad']
        if E_ == 'silencio': continue
        prog = MAYOR if (E_ in ('luz', 'calma') or MUS['tonalidad'] == 'mayor') else MENOR
        for b in range(int((t1 - t0) / BAR) + 1):
            tb = t0 + b * BAR
            if tb >= t1: break
            d = min(BAR, t1 - tb); ch = prog[b % 4]
            add(pad(ch, d + .4, 600 if E_ in ('misterio', 'calma') else 1100), tb, 0, I * (1.2 if E_ in ('misterio', 'tension', 'calma') else .9))
            if E_ == 'misterio': add(brillo(d + .5), tb, 0, I); add(arp(ch[0] + 24, .6) * 2, tb + BEAT * 2, .5, I * .6); continue
            if E_ == 'tension':
                for k in range(4): add(np.sin(2 * np.pi * note(ch[0] - 12) * t_(.3)) * np.exp(-t_(.3) * 10) * .25, tb + k * BEAT, 0, I)
                continue
            if E_ == 'calma':
                for k in range(4): add(arp([ch[0] + 24, ch[2] + 12, ch[1] + 24, ch[2] + 12][k], .6), tb + k * BEAT, (-.3 if k % 2 else .3), I * .8)
                continue
            sub = 4 if E_ in ('impulso', 'epico') else 2
            for k in range(4 * sub):
                if tb + k * BEAT / sub < t1: add(bajo(ch[0], BEAT / sub * .95, 350 + 900 * I), tb + k * BEAT / sub, 0, I * (1 if k % sub == 0 else .6))
            for k in range(8): add(hat(), tb + k * BEAT / 2, .3 if k % 2 else -.3, I * (.5 if E_ in ('pulso', 'luz') else .9))
            if E_ in ('impulso', 'epico', 'oscuro'):
                for k in ([0, 1, 2, 3] if E_ == 'epico' else [0, 2]): add(bombo(), tb + k * BEAT, 0, I * .9)
            if E_ == 'epico' and b % 2 == 1: add(taiko(), tb + BEAT * 3.5, 0, I); add(taiko(), tb + BEAT * 3.75, 0, I * .8)
            if E_ == 'oscuro':
                for k in range(16): add(arp([ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24][k % 4], .2), tb + k * BEAT / 4, (-.4 if k % 2 else .4), I)
            if E_ == 'luz':
                for k in range(8): add(arp([ch[0] + 24, ch[2] + 12, ch[1] + 24, ch[2] + 12][k % 4], .4) * 1.2, tb + k * BEAT / 2, (-.3 if k % 2 else .3), I)
fo = int(2.0 * SR); mus[-fo:] *= np.linspace(1, 0, fo)[:, None]
mus *= MUS['volumen']

# ------------------------------------------------------------ voz + mezcla (la música baja sola cuando hay voz)
voz = np.zeros(N, np.float32)
if os.path.exists(f'{RAIZ}/02_voz/voz.wav') and TM.get('modo') != 'lectura':
    import soundfile as sf
    v, sr = sf.read(f'{RAIZ}/02_voz/voz.wav', dtype='float32')
    if v.ndim > 1: v = v.mean(1)
    i0 = int(OFF * SR); L = min(len(v), N - i0); voz[i0:i0 + L] = v[:L]
e = np.sqrt(np.convolve(voz[::240] ** 2, np.ones(2) / 2, 'same')); act = np.clip(e / .05, 0, 1); gs = np.zeros_like(act); prev = 0.0
for k in range(len(act)):
    c = act[k]; prev = c + (prev - c) * (np.exp(-1 / (200 * .03)) if c > prev else np.exp(-1 / (200 * .4))); gs[k] = prev
duck = np.interp(np.arange(N), np.arange(len(gs)) * 240, gs).astype(np.float32)
mezcla = np.stack([voz, voz], 1) + mus * (1 - .55 * duck)[:, None] * .55 + sfx * (1 - .25 * duck)[:, None] * .7
pico = np.abs(mezcla).max(); mezcla = np.tanh(mezcla / max(1.0, pico * .9) * 1.1) * .95
os.makedirs(f'{RAIZ}/04_audio', exist_ok=True); mezcla.astype(np.float32).tofile(f'{RAIZ}/05_motor/cache/mezcla.f32')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', f'{RAIZ}/05_motor/cache/mezcla.f32', '-af', 'loudnorm=I=-14:TP=-1.2:LRA=11', '-ar', str(SR), '-c:a', 'pcm_s16le', f'{RAIZ}/04_audio/mezcla.wav'], check=True)
print(f'04_audio/mezcla.wav listo: {FIN:.1f} s, {len(CUES)} efectos, {len(SECC)} secciones de música')
