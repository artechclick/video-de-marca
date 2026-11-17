// MOTOR DE VIDEO DE MARCA — Canvas2D determinista. Lee window.PROY, window.MARCA, window.TIEMPOS.
// ---------------------------------------------------------------- formato y marca
const FORMATOS = {
  '16:9': { W: 1920, H: 1080, safe: [96, 64, 96, 64] },     // izq, arriba, der, abajo
  '9:16': { W: 1080, H: 1920, safe: [90, 250, 150, 460] },   // deja libre la interfaz de TikTok/Reels/Shorts
  '4:5': { W: 1080, H: 1350, safe: [70, 90, 70, 140] },
  '1:1': { W: 1080, H: 1080, safe: [70, 70, 70, 90] },
  'portada': { W: 1280, H: 720, safe: [60, 50, 60, 50] },
};
const FMT = FORMATOS[PROY.formato] || FORMATOS['16:9'];
const W = FMT.W, H = FMT.H, FPS = PROY.fps || 30, VERT = H > W;
const SAFE = { x0: FMT.safe[0], y0: FMT.safe[1], x1: W - FMT.safe[2], y1: H - FMT.safe[3] };
SAFE.w = SAFE.x1 - SAFE.x0; SAFE.h = SAFE.y1 - SAFE.y0; SAFE.cx = (SAFE.x0 + SAFE.x1) / 2; SAFE.cy = (SAFE.y0 + SAFE.y1) / 2;
// ZONAS: cada elemento vive en una caja y nada se monta encima de otra cosa. Si hay subtítulos, tienen su franja propia.
const caja = (x, y, w, h) => ({ x, y, w, h, x1: x + w, y1: y + h, cx: x + w / 2, cy: y + h / 2 });
const SUBS = PROY.subtitulos == null ? VERT : PROY.subtitulos;
const ZONA_SUB = SUBS ? caja(SAFE.x0, SAFE.y1 - (VERT ? 190 : 130), SAFE.w, VERT ? 190 : 130) : null;
const RES_LOGO = (MARCA.logo || {}).marca_de_agua ? (VERT ? 110 : 90) : 0;              // franja reservada para el logo de esquina
const AREA = caja(SAFE.x0, SAFE.y0 + RES_LOGO, SAFE.w, SAFE.h - RES_LOGO - (SUBS ? (VERT ? 220 : 150) : 0));   // área de contenido
// divide una caja en partes: dir 'v' (apiladas) u 'h' (lado a lado); fr = fracciones; gap = espacio entre partes
function dividir(c, dir, fr, gap = 40) { const tot = fr.reduce((a, b) => a + b, 0), L = (dir === 'v' ? c.h : c.w) - gap * (fr.length - 1); let p = dir === 'v' ? c.y : c.x;
  return fr.map(f => { const d = L * f / tot, r = dir === 'v' ? caja(c.x, p, c.w, d) : caja(p, c.y, d, c.h); p += d + gap; return r; }); }
// reparto adaptable: apilado en vertical, lado a lado en horizontal (el mismo código sirve para 9:16 y 16:9)
const reparto = (fr, c = AREA, gap = 40) => dividir(c, VERT ? 'v' : 'h', fr, gap);
// el elemento más grande con proporción ancho/alto `asp` que cabe en la caja
function encajar(c, asp, m = 1) { const h = Math.min(c.h, c.w / asp) * m; return { x: c.cx, y: c.cy, h, w: h * asp }; }
const MC = (MARCA.colores || {});
const C = Object.assign({ fondo: '#0b0f17', superficie: '#151c28', texto: '#f4f6fa', suave: '#9aa6b6', primario: '#ff5a1f', secundario: '#2ec4ff', acento: '#ffd23f', ok: '#35e08a', alerta: '#ffb020', peligro: '#ff3b30' }, MC);
const TIPO = MARCA.tipografia || {};
const F = { tit: (TIPO.titulos || {}).familia || 'Anton', txt: (TIPO.texto || {}).familia || 'Inter', dat: (TIPO.datos || {}).familia || 'JetBrains Mono' };
const FW = { tit: (TIPO.titulos || {}).peso || 400, txt: (TIPO.texto || {}).peso || 700, dat: (TIPO.datos || {}).peso || 700 };
const ESTILO = Object.assign({ esquinas: 16, grano: 0, vineta: .55, mayusculas: true }, MARCA.estilo || {});   // grano 0 = imagen limpia; la marca lo activa si quiere textura de cine
const canvas = document.getElementById('c'); canvas.width = W; canvas.height = H;
const ctx0 = canvas.getContext('2d');
const RAIZ = '/';   // el servidor sirve la carpeta del proyecto
const up = s => ESTILO.mayusculas ? s.toUpperCase() : s;

// ---------------------------------------------------------------- matemáticas y curvas
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  lin: t => t, inQ: t => t * t, outQ: t => 1 - (1 - t) * (1 - t),
  inC: t => t * t * t, outC: t => 1 - Math.pow(1 - t, 3), ioC: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outE: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t), ioE: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outB: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },   // sobrepaso
  inB: t => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },                              // anticipación
  outEl: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1,
};
const resorte = (t, k = 7, d = 4.2) => t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(k * t);
function key(t, ks) { if (t <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const a = ks[i - 1], b = ks[i]; return lerp(a[1], b[1], (b[2] || E.ioC)(inv(a[0], b[0], t))); } return ks[ks.length - 1][1]; }
function hash(n) { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }
function ruido(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }

// ---------------------------------------------------------------- tiempos (voz -> video)
const OFF = PROY.preroll == null ? .8 : PROY.preroll;              // silencio antes de la primera palabra
const TM = window.TIEMPOS || { oraciones: [], duracion: PROY.duracion || 15 };
const FIN = TM.duracion + OFF + (PROY.cola == null ? 3 : PROY.cola);
const O = i => TM.oraciones[i].t0 + OFF;                          // inicio de la oración i
const OF = i => TM.oraciones[i].t1 + OFF;                         // fin de la oración i
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
function P(i, palabra, n = 0) {                                   // inicio de una palabra dentro de la oración i
  const w = norm(palabra); let k = 0;
  for (const [x, t] of TM.oraciones[i].palabras) if (norm(x).startsWith(w)) { if (k === n) return t + OFF; k++; }
  (window.FALTAN = window.FALTAN || []).push(i + ':' + palabra); return O(i);
}

// ---------------------------------------------------------------- recursos (imágenes, cuadros de video, íconos)
const IMG = new Map(), CARGANDO = new Map(), FALTA = new Set();
function cargar(src) {
  if (IMG.has(src)) return Promise.resolve(IMG.get(src)); if (CARGANDO.has(src)) return CARGANDO.get(src);
  const p = new Promise(res => { const im = new Image(); im.onload = () => im.decode().catch(() => {}).then(() => { IMG.set(src, im); CARGANDO.delete(src); res(im); });
    im.onerror = () => { console.error('no carga', src.slice(0, 120)); IMG.set(src, null); CARGANDO.delete(src); res(null); }; im.src = src; });
  CARGANDO.set(src, p); return p;
}
function img(src) { const im = IMG.get(src); if (im === undefined) { FALTA.add(src); return null; } return im; }
const IM = ruta => img(RAIZ + ruta);                               // ruta relativa a la carpeta del proyecto
function cuadro(clave, t) {                                        // cuadro de un clip extraído con clips.py
  const c = (window.CLIPS || {})[clave]; if (!c) { console.warn('sin clip', clave); return null; }
  return img(`${RAIZ}05_motor/cache/clips/${clave}/${String(clamp(Math.floor(t * FPS), 0, c.n - 1) + 1).padStart(4, '0')}.jpg`);
}
function limpiarCache(max = 260) { if (IMG.size < max) return; let n = 0; for (const k of IMG.keys()) if (k.includes('/cache/clips/')) { IMG.delete(k); if (++n > 80) break; } }
const SVG = {}, SVGURL = new Map();
async function cargarIconos(nombres) { await Promise.all(nombres.map(async n => { const r = await fetch(`${RAIZ}05_motor/cache/iconos/${n}.svg`); if (r.ok) SVG[n] = await r.text(); else console.error('icono no existe', n); })); }
function icono(ctx, n, x, y, s, col = C.texto, o = {}) {           // íconos Lucide recoloreados; o.insignia = fondo circular
  if (!SVG[n]) { (window.FALTAN = window.FALTAN || []).push('icono:' + n); return; }
  const k = n + col + (o.grosor || 1.75); let u = SVGURL.get(k);
  if (!u) { u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG[n].replace(/currentColor/g, col).replace(/stroke-width="[\d.]+"/, `stroke-width="${o.grosor || 1.75}"`).replace(/width="24"/, 'width="512"').replace(/height="24"/, 'height="512"')); SVGURL.set(k, u); }
  const im = img(u); if (!im) return;
  ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  if (o.lt != null) {                                              // o.lt = tiempo desde que entra: rebota con sobrepaso, gira al asentarse, onda de impacto y flota
    const lt = o.lt, p = clamp(lt / .5); if (p <= 0) { ctx.restore(); return; }
    if (lt > .2 && lt < .9) { const q = (lt - .2) / .7; ctx.save(); ctx.strokeStyle = o.insignia || col; ctx.globalAlpha *= (1 - q) * .6; ctx.lineWidth = Math.max(2, s * .04); ctx.beginPath(); ctx.arc(x, y, s * (.6 + q * .7), 0, 7); ctx.stroke(); ctx.restore(); }
    const sc = E.outB(p), dy = lt > .5 ? Math.sin((lt - .5) * 2.4) * s * .03 : 0;
    ctx.globalAlpha *= clamp(p * 3); ctx.translate(x, y + dy); ctx.rotate((1 - E.outC(p)) * -.35); ctx.scale(sc, sc); ctx.translate(-x, -y);
  }
  if (o.insignia) { const r = s * .82; const g = ctx.createRadialGradient(x, y - r * .3, r * .1, x, y, r); g.addColorStop(0, o.insignia + 'ff'); g.addColorStop(1, o.insignia + 'aa');
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = s * .4; ctx.shadowOffsetY = s * .12; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = Math.max(2, s * .03); ctx.stroke(); }
  if (o.brillo !== false) { ctx.shadowColor = col; ctx.shadowBlur = s * .25; }
  ctx.drawImage(im, x - s / 2, y - s / 2, s, s); ctx.restore();
}

// ---------------------------------------------------------------- lienzo y texto
function lienzo(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const POOL = []; const pool = i => POOL[i] || (POOL[i] = lienzo());
function cubrir(ctx, im, x, y, w, h, s = 1, ox = 0, oy = 0) { if (!im) return; const sc = Math.max(w / im.width, h / im.height) * s, dw = im.width * sc, dh = im.height * sc; ctx.drawImage(im, x + (w - dw) / 2 + ox * w, y + (h - dh) / 2 + oy * h, dw, dh); }
function fuente(ctx, size, fam = F.tit, peso) { const p = peso || (fam === F.tit ? FW.tit : fam === F.dat ? FW.dat : FW.txt); ctx.font = `${p} ${size}px "${fam}"`; }
function medir(ctx, s, size, fam = F.tit, peso, ls = 0) { ctx.save(); fuente(ctx, size, fam, peso); ctx.letterSpacing = ls + 'px'; const m = ctx.measureText(s).width; ctx.restore(); return m; }
function rr(ctx, x, y, w, h, r = ESTILO.esquinas) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// texto en una línea; maxW reduce el tamaño para que NUNCA se salga de su caja
function texto(ctx, s, x, y, o = {}) {
  let size = o.size || 60; const fam = o.font || F.tit;
  if (o.maxW) { const m = medir(ctx, s, size, fam, o.peso, o.ls || 0); if (m > o.maxW) size *= o.maxW / m; }
  ctx.save(); fuente(ctx, size, fam, o.peso); ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  if (o.sombra) { ctx.shadowColor = o.sombra; ctx.shadowBlur = o.blur || 30; }
  if (o.borde) { ctx.lineWidth = o.lw || 3; ctx.strokeStyle = o.borde; ctx.strokeText(s, x, y); }
  if (o.color !== null) { ctx.fillStyle = o.color || C.texto; ctx.fillText(s, x, y); }
  ctx.restore(); return size;
}
// parte un texto en líneas que caben en maxW
function partir(ctx, s, maxW, size, fam = F.txt, peso) { const ws = s.split(/\s+/); const L = []; let l = ''; for (const w of ws) { const t = l ? l + ' ' + w : w; if (l && medir(ctx, t, size, fam, peso) > maxW) { L.push(l); l = w; } else l = t; } if (l) L.push(l); return L; }
// párrafo dentro de una caja (x,y,w,h): reduce el tamaño hasta que quepa
function parrafo(ctx, s, x, y, w, h, o = {}) {
  let size = o.size || 44; const fam = o.font || F.txt, lh = o.lh || 1.25; let L;
  for (let k = 0; k < 30; k++) { L = partir(ctx, s, w, size, fam, o.peso); if (L.length * size * lh <= h) break; size *= .92; }
  const y0 = o.valign === 'middle' ? y + (h - L.length * size * lh) / 2 : y;
  L.forEach((l, i) => texto(ctx, l, o.align === 'center' ? x + w / 2 : x, y0 + size * (i + .85) * lh, Object.assign({}, o, { size, font: fam, maxW: w })));
  return { size, lineas: L.length };
}

// ---------------------------------------------------------------- texturas
const GRANO = []; for (let k = 0; k < 6; k++) { const c = lienzo(640, 360), g = c.getContext('2d'), d = g.createImageData(640, 360), r = rnd(1000 + k); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() - .5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); GRANO.push(c); }
const ESTATICA = []; for (let k = 0; k < 4; k++) { const c = lienzo(480, 270), g = c.getContext('2d'), d = g.createImageData(480, 270), r = rnd(77 + k); for (let y = 0; y < 270; y++) { const b = r() < .08 ? 80 : 0; for (let x = 0; x < 480; x++) { const i = (y * 480 + x) * 4, v = clamp(r() * 255 + b, 0, 255); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } } g.putImageData(d, 0, 0); ESTATICA.push(c); }
const VINETA = (() => { const c = lienzo(), g = c.getContext('2d'), r = Math.max(W, H); const gr = g.createRadialGradient(W / 2, H / 2, r * .25, W / 2, H / 2, r * .75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${ESTILO.vineta})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); return c; })();

// ---------------------------------------------------------------- efectos de sonido y secciones musicales (los lee audio.py)
const CUES = [], SECCIONES = [];
function sfx(t, tipo, gain = 1, extra = {}) { CUES.push(Object.assign({ t: +t.toFixed(3), tipo, gain }, extra)); }
function seccion(t0, t1, estilo, intensidad = .7) { SECCIONES.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), estilo, intensidad }); }

// ---------------------------------------------------------------- bloques visuales
function fondo(ctx, lt, o = {}) {                                  // degradado de marca + rejilla que se desliza
  const g = ctx.createRadialGradient(W * .5, H * .42, 40, W * .5, H * .55, Math.max(W, H) * .8);
  g.addColorStop(0, o.c1 || C.superficie); g.addColorStop(1, o.c2 || C.fondo); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (o.rejilla !== false) { const st = 90, off = (lt * 10) % st; ctx.save(); ctx.strokeStyle = o.rejillaC || 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -st + off; x < W + st; x += st) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = -st + off * .5; y < H + st; y += st) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke(); ctx.restore(); }
}
const oscurecer = (ctx, a = .55, col = '0,0,0') => { ctx.fillStyle = `rgba(${col},${a})`; ctx.fillRect(0, 0, W, H); };
function foto(ctx, ruta, lt, dur, o = {}) {                        // Ken Burns: siempre se mueve (mínimo 3 % de zoom)
  const p = (o.ease || E.lin)(clamp(lt / dur)); const im = IM(ruta); if (!im) return;
  ctx.save(); if (o.filtro) ctx.filter = o.filtro;
  const b = o.caja ? [o.caja.x, o.caja.y, o.caja.w, o.caja.h] : [0, 0, W, H]; ctx.beginPath(); if (o.caja) rr(ctx, ...b); else ctx.rect(...b); ctx.clip();
  cubrir(ctx, im, b[0], b[1], b[2], b[3], lerp(o.s0 || 1.04, o.s1 || 1.14, p), lerp(o.x0 || 0, o.x1 || 0, p), lerp(o.y0 || 0, o.y1 || 0, p)); ctx.restore();
}
function clip(ctx, clave, lt, o = {}) {                            // video: o.ventana=[a,b] segundos útiles; se estira con cámara lenta si hace falta
  const vel = o.ventana && o.dur ? Math.min(1, (o.ventana[1] - o.ventana[0]) / o.dur) : (o.vel || 1);
  const im = cuadro(clave, lt * vel + (o.ventana ? o.ventana[0] : (o.desde || 0))); if (!im) return;
  const p = clamp(lt / (o.dur || 4)); const b = o.caja ? [o.caja.x, o.caja.y, o.caja.w, o.caja.h] : [0, 0, W, H];
  ctx.save(); if (o.filtro) ctx.filter = o.filtro; ctx.beginPath(); if (o.caja) rr(ctx, ...b); else ctx.rect(...b); ctx.clip();
  cubrir(ctx, im, b[0], b[1], b[2], b[3], lerp(o.s0 || 1.04, o.s1 || 1.1, p), lerp(o.x0 || 0, o.x1 || 0, p), lerp(o.y0 || 0, o.y1 || 0, p)); ctx.restore();
}
function cinetico(ctx, lt, palabras, x, y, o = {}) {               // palabras escalonadas: suben, se enfocan y sobrepasan (acción superpuesta)
  let size = o.size || 110; const fam = o.font || F.tit, st = o.escalon || .07;
  const ws = palabras.map(w => typeof w === 'string' ? { s: w } : w).map(w => Object.assign({}, w, { s: o.tal ? w.s : up(w.s) }));
  let an = ws.map(w => medir(ctx, w.s, size, fam, o.peso, o.ls || 0)), gap = size * .26, tot = an.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
  const maxW = o.maxW || (o.align === 'left' ? SAFE.x1 - x : SAFE.w);
  if (tot > maxW) { const k = maxW / tot; size *= k; gap *= k; an = an.map(a => a * k); tot = maxW; }
  let cx = o.align === 'left' ? x : x - tot / 2;
  ws.forEach((w, i) => { const p = clamp((lt - (w.at != null ? w.at : i * st)) / (o.dur || .45)); if (p <= 0) { cx += an[i] + gap; return; }
    ctx.save(); ctx.globalAlpha *= clamp(p * 2.5) * (o.alpha == null ? 1 : o.alpha); ctx.translate(cx + an[i] / 2, y + (1 - E.outB(p)) * size * .55);
    const sc = lerp(1.22, 1, E.outC(p)); ctx.scale(sc, sc); if (p < .6) ctx.filter = `blur(${(1 - p / .6) * 8}px)`;
    texto(ctx, w.s, 0, 0, { size, font: fam, peso: o.peso, align: 'center', color: w.c || o.color || C.texto, ls: o.ls || 0, sombra: o.sombra, blur: o.blur });
    ctx.restore(); cx += an[i] + gap; });
}
// tarjeta de frase: varias líneas cinéticas centradas; hi = palabras resaltadas con el color de acento
function frase(ctx, lt, lineas, o = {}) {
  if (o.fondo !== false) fondo(ctx, lt, o);
  const c = o.caja || AREA; let size = o.size || (VERT ? 110 : 120);
  const ancho = Math.max(...lineas.map(l => medir(ctx, up(l), size) + size * .26 * (l.split(' ').length - 1)));
  size = Math.min(size, size * c.w / ancho, c.h / (lineas.length * 1.08));                 // cabe a lo ancho y a lo alto de su caja
  const lh = size * 1.08, y0 = c.cy - (lineas.length - 1) * lh / 2 + size * .35;
  lineas.forEach((ln, i) => cinetico(ctx, lt - (o.at || 0) - i * (o.retraso || .25), ln.split(' ').map(s => ({ s, c: o.hi && o.hi.includes(s) ? (o.hiC || C.primario) : (o.color || C.texto) })), c.cx, y0 + i * lh, { size, maxW: c.w }));
}
function etiqueta(ctx, lt, s, x, y, o = {}) {                      // píldora que se barre de izquierda a derecha
  const p = E.outC(clamp((lt - (o.at || 0)) / .4)); if (p <= 0) return; s = up(s);
  let size = o.size || 30; let w = medir(ctx, s, size, F.dat, null, 3) + 40; if (o.maxW && w > o.maxW) { size *= (o.maxW - 40) / (w - 40); w = o.maxW; }
  const ax = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha; ctx.fillStyle = o.bg || C.primario; rr(ctx, ax, y - size * 1.05, w * p, size * 1.55, size * .3); ctx.fill();
  ctx.beginPath(); ctx.rect(ax, y - size * 1.1, w * p, size * 1.7); ctx.clip();
  texto(ctx, s, ax + 20, y + size * .12, { size, font: F.dat, color: o.color || '#fff', ls: 3 }); ctx.restore();
}
function tercio(ctx, lt, titulo, sub, o = {}) {                    // rótulo inferior (nombre + cargo, fuente, dato)
  const a = E.outC(clamp(lt / .45)), sal = o.sale != null ? E.inC(clamp((lt - o.sale) / .35)) : 0; const x = o.x || AREA.x, y = o.y || AREA.y1 - (o.size || 54) * 2.4;
  ctx.save(); ctx.globalAlpha = 1 - sal; const s1 = o.size || 54; titulo = up(titulo);
  const tw = Math.min(medir(ctx, titulo, s1) + 60, SAFE.x1 - x); ctx.fillStyle = o.color || C.primario; ctx.fillRect(x, y, tw * a, s1 * 1.4);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, tw * a, s1 * 1.4); ctx.clip(); texto(ctx, titulo, x + 30, y + s1 * 1.1, { size: s1, color: '#fff', maxW: tw - 60 }); ctx.restore();
  if (sub) { const b = E.outC(clamp((lt - .25) / .45)), s2 = s1 * .56, sw = Math.min(medir(ctx, sub, s2, F.txt) + 48, SAFE.x1 - x);
    ctx.fillStyle = 'rgba(8,12,20,0.9)'; ctx.fillRect(x, y + s1 * 1.4, sw * b, s2 * 1.75); ctx.save(); ctx.beginPath(); ctx.rect(x, y + s1 * 1.4, sw * b, s2 * 1.75); ctx.clip();
    texto(ctx, sub, x + 24, y + s1 * 1.4 + s2 * 1.22, { size: s2, font: F.txt, color: '#e6ebf2', maxW: sw - 48 }); ctx.restore(); }
  ctx.restore();
}
function sello(ctx, lt, s, x, y, o = {}) {                         // sello de goma: aplasta y estira al caer
  if (lt < 0) return; s = up(s); const col = o.color || C.peligro; let size = o.size || 92; const rot = (o.rot == null ? -8 : o.rot) * Math.PI / 180;
  const maxW = o.maxW || SAFE.w * .9; const w0 = medir(ctx, s, size, F.tit, null, 4) + size * .7; if (w0 > maxW) size *= maxW / w0;
  const p = clamp(lt / .22), sc = lt < .22 ? lerp(2.4, .92, E.inQ(p)) : 1 - .08 * Math.exp(-14 * (lt - .22)) * Math.cos(30 * (lt - .22)), sq = lt < .22 ? 1 : 1 + .1 * Math.exp(-12 * (lt - .22));
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc * sq, sc / sq); ctx.globalAlpha *= (lt < .22 ? p : 1) * (o.alpha == null ? 1 : o.alpha);
  fuente(ctx, size, F.tit); ctx.letterSpacing = '4px'; const w = ctx.measureText(s).width + size * .7, h = size * 1.35;
  ctx.strokeStyle = col; ctx.lineWidth = size * .09; rr(ctx, -w / 2, -h / 2, w, h, size * .12); ctx.stroke(); ctx.lineWidth = size * .03; rr(ctx, -w / 2 + size * .13, -h / 2 + size * .13, w - size * .26, h - size * .26, size * .06); ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, size * .05);
  ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = .3; ctx.drawImage(GRANO[(o.semilla || 0) % 6], -w / 2, -h / 2, w, h); ctx.restore();
}
const num = (n, d = 0) => n.toLocaleString(PROY.locale || 'es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
function contador(ctx, lt, v0, v1, dur, x, y, o = {}) {
  const t = lt - (o.at || 0); if (t < 0) return; const v = lerp(v0, v1, (o.ease || E.outE)(clamp(t / dur)));
  const s = (o.pre || '') + (o.fmt ? o.fmt(v) : num(Math.round(v))) + (o.post || ''); const pop = 1 + .08 * Math.exp(-8 * Math.max(0, t - dur)) * (t > dur ? 1 : 0);
  ctx.save(); ctx.globalAlpha *= clamp(t / .15); ctx.translate(x, y); ctx.scale(pop, pop);
  texto(ctx, s, 0, 0, { size: o.size || 200, align: o.align || 'center', color: o.color || C.texto, sombra: o.brillo, blur: 40, maxW: o.maxW || SAFE.w });
  if (o.rotulo) texto(ctx, up(o.rotulo), 0, o.dyRotulo || (o.size || 200) * .42, { size: o.sizeRotulo || 38, font: F.dat, align: o.align || 'center', color: o.colorRotulo || C.suave, ls: 5, maxW: o.maxW || SAFE.w });
  ctx.restore();
}
function capitulo(ctx, lt, n, titulo, sub) {                       // tarjeta de capítulo (videos largos)
  ctx.fillStyle = C.fondo; ctx.fillRect(0, 0, W, H); const p = E.outE(clamp(lt / .7));
  ctx.save(); ctx.globalAlpha = .9 * p; texto(ctx, n, SAFE.cx, SAFE.cy + (VERT ? 330 : 230), { size: VERT ? 620 : 560, align: 'center', color: null, borde: C.primario + '88', lw: 3 }); ctx.restore();
  const lw = E.ioE(clamp((lt - .1) / .6)) * Math.min(900, SAFE.w); ctx.fillStyle = C.primario; ctx.fillRect(SAFE.cx - lw / 2, SAFE.cy + 42, lw, 6);
  ctx.save(); ctx.globalAlpha = clamp((lt - .15) / .3); ctx.translate(SAFE.cx, SAFE.cy); const sc = lerp(1.25, 1, E.outC(clamp((lt - .15) / .6))); ctx.scale(sc, sc);
  ctx.filter = `blur(${(1 - clamp((lt - .15) / .4)) * 10}px)`; texto(ctx, up(titulo), 0, 10, { size: VERT ? 120 : 150, align: 'center', ls: 6, maxW: SAFE.w }); ctx.restore();
  texto(ctx, up(PROY.palabra_capitulo || 'CAPÍTULO') + ' ' + n, SAFE.cx, SAFE.cy - 175, { size: 30, font: F.dat, align: 'center', color: C.primario, ls: 14, alpha: clamp((lt - .3) / .3) });
  if (sub) texto(ctx, sub, SAFE.cx, SAFE.cy + 120, { size: 32, font: F.txt, align: 'center', color: C.suave, alpha: clamp((lt - .5) / .3), maxW: SAFE.w });
}
// personaje o mascota (PNG recortado): anticipación -> salto con estiramiento -> aterriza aplastando -> respira
function personaje(ctx, lt, pose, x, y, h, o = {}) {
  const im = IM(`01_marca/personaje/${pose}.png`); if (!im) return; const en = o.entrada == null ? .55 : o.entrada; let sx = 1, sy = 1, dy = 0, a = 1;
  if (lt < en) { const p = lt / en; if (p < .25) { const q = p / .25; sy = 1 - .12 * E.outQ(q); sx = 1 + .08 * E.outQ(q); a = q; } else if (p < .7) { const q = (p - .25) / .45; sy = 1.12 - .12 * q; sx = .92 + .08 * q; dy = -Math.sin(q * Math.PI) * h * .14; } else { const q = (p - .7) / .3; sy = 1 - .1 * Math.sin(q * Math.PI); sx = 1 + .07 * Math.sin(q * Math.PI); } }
  else { const b = Math.sin((lt - en) * 2.2); sy = 1 + .012 * b; sx = 1 - .006 * b; }
  if (o.sale != null && lt > o.sale) { const q = clamp((lt - o.sale) / .35); a *= 1 - q; dy += E.inB(q) * h * .3; }
  const w = h * im.width / im.height; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + dy); if (o.espejo) ctx.scale(-1, 1); ctx.scale(sx, sy);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
}
function logo(ctx, lt, x, y, h, o = {}) {                          // logo con revelado (escala + desenfoque); o.version: 'color' | 'blanco'
  const ruta = (MARCA.logo || {})[o.version || 'blanco'] || (MARCA.logo || {}).color; if (!ruta) return; const im = IM('01_marca/' + ruta); if (!im) return;
  const p = o.fijo ? 1 : E.outC(clamp(lt / .6)); const w = h * im.width / im.height;
  ctx.save(); ctx.globalAlpha *= p * (o.alpha == null ? 1 : o.alpha); ctx.translate(x, y); const s = lerp(1.15, 1, p); ctx.scale(s, s); if (p < 1) ctx.filter = `blur(${(1 - p) * 10}px)`;
  ctx.drawImage(im, o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2, -h / 2, w, h); ctx.restore();
}
// documento o captura flotante con resaltador (resaltar: [[x,y,w,h,t0]] en píxeles del recorte)
function documento(ctx, lt, ruta, recorte, o = {}) {
  const im = IM(ruta); if (!im) return; const [sx, sy, sw, sh] = recorte || [0, 0, im.width, im.height];
  const c = o.caja || AREA, sc = Math.min(c.w * .94 / sw, c.h * .94 / sh), dw = sw * sc, dh = sh * sc, p = E.outC(clamp(lt / .6));
  ctx.save(); ctx.globalAlpha *= p; ctx.translate(c.cx, c.cy + (1 - p) * 120); ctx.rotate(((o.rot == null ? -1.5 : o.rot) + lt * .25) * Math.PI / 180); ctx.scale(1 + lt * .012, 1 + lt * .012);
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30; ctx.fillStyle = '#fff'; ctx.fillRect(-dw / 2 - 14, -dh / 2 - 14, dw + 28, dh + 28); ctx.shadowColor = 'transparent';
  ctx.drawImage(im, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
  for (const r of o.resaltar || []) { const q = E.outC(clamp((lt - r[4]) / .5)); if (q <= 0) continue; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = r[5] || 'rgba(255,214,0,0.5)'; ctx.fillRect(-dw / 2 + r[0] * sc, -dh / 2 + r[1] * sc, r[2] * sc * q, r[3] * sc); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
}
// dispositivo (teléfono / laptop / navegador) con contenido; dibujar(g, w, h) pinta en coordenadas locales de la pantalla
function dispositivo(ctx, tipo, x, y, h, dibujar, o = {}) {
  ctx.save(); ctx.translate(x, y); const s = o.escala || 1; ctx.scale(s, s);
  let w, sw, sh, r; if (tipo === 'telefono') { w = h * .49; sw = w - 24; sh = h - 24; r = w * .14; } else if (tipo === 'laptop') { w = h * 1.6; sw = w - 30; sh = h - 30; r = 18; } else { w = h * 1.6; sw = w; sh = h - 44; r = 14; }
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30; ctx.fillStyle = '#0d1016'; rr(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3; rr(ctx, -w / 2, -h / 2, w, h, r); ctx.stroke();
  const ox = -sw / 2, oy = tipo === 'navegador' ? -h / 2 + 44 : -sh / 2;
  if (tipo === 'navegador') { ctx.fillStyle = '#1b2130'; rr(ctx, -w / 2, -h / 2, w, 44, [r, r, 0, 0]); ctx.fill(); ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-w / 2 + 24 + i * 22, -h / 2 + 22, 7, 0, 7); ctx.fill(); });
    if (o.url) { ctx.fillStyle = '#0d1016'; rr(ctx, -w / 2 + 110, -h / 2 + 9, w - 140, 26, 13); ctx.fill(); texto(ctx, o.url, -w / 2 + 128, -h / 2 + 28, { size: 16, font: F.txt, color: C.suave, maxW: w - 180 }); } }
  ctx.save(); rr(ctx, ox, oy, sw, sh, tipo === 'telefono' ? r * .8 : 6); ctx.clip(); ctx.translate(ox, oy); dibujar(ctx, sw, sh); ctx.restore();
  if (tipo === 'telefono') { ctx.fillStyle = '#000'; rr(ctx, -w * .17, -h / 2 + 22, w * .34, 30, 15); ctx.fill(); }
  if (tipo === 'laptop') { ctx.fillStyle = '#2a3140'; ctx.beginPath(); ctx.moveTo(-w * .58, h / 2); ctx.lineTo(w * .58, h / 2); ctx.lineTo(w * .54, h / 2 + 26); ctx.lineTo(-w * .54, h / 2 + 26); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
// captura dentro de un dispositivo con desplazamiento suave (scroll de o.desde a o.hasta, fracción 0..1 de la altura sobrante)
function pantalla(ctx, lt, tipo, ruta, x, y, h, o = {}) { dispositivo(ctx, tipo, x, y, h, (g, w, hh) => { const im = IM(ruta); if (!im) { g.fillStyle = C.superficie; g.fillRect(0, 0, w, hh); return; } const sc = w / im.width, ih = im.height * sc; const p = E.ioC(clamp((lt - (o.t0 || .6)) / (o.dur || 2.5))); g.drawImage(im, 0, -Math.max(0, ih - hh) * lerp(o.desde || 0, o.hasta || 0, p), w, ih); if (o.encima) o.encima(g, w, hh); }, o); }
function cursor(ctx, x, y, clic = 0) { ctx.save(); ctx.translate(x, y); if (clic > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + (1 - clic) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 10 + clic * 40, 0, 7); ctx.stroke(); } ctx.scale(1 - .15 * Math.sin(Math.PI * clamp(clic * 2)), 1 - .15 * Math.sin(Math.PI * clamp(clic * 2)));
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 54); ctx.lineTo(14, 40); ctx.lineTo(26, 64); ctx.lineTo(36, 58); ctx.lineTo(24, 36); ctx.lineTo(42, 36); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
// lista con casillas que se marcan en el tiempo: items = [[texto, t, icono?]] (t en segundos de video)
function lista(ctx, t, items, x, y, w, o = {}) {
  const fila = o.fila || (VERT ? 150 : 120), size = o.size || 40;
  items.forEach(([s, ti, ic], k) => { const l = t - ti; if (l < 0) return; const p = E.outC(clamp(l / .4)), yy = y + k * fila; ctx.save(); ctx.globalAlpha *= p; ctx.translate((1 - p) * 60, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; rr(ctx, x, yy - fila * .42, w, fila * .84, 14); ctx.fill();
    const c = clamp((l - .3) / .25), bx = x + 26, bs = size * 1.1; ctx.strokeStyle = C.ok; ctx.lineWidth = 4; rr(ctx, bx, yy - bs / 2, bs, bs, 8); ctx.stroke();
    if (c > 0) { ctx.fillStyle = C.ok; rr(ctx, bx, yy - bs / 2, bs, bs, 8); ctx.fill(); ctx.strokeStyle = C.fondo; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx + bs * .22, yy); ctx.lineTo(bx + bs * .42, yy + bs * .2 * c); ctx.lineTo(bx + bs * (.42 + .38 * c), yy - bs * .28 * c); ctx.stroke(); }
    let tx = bx + bs + 26; if (ic) { icono(ctx, ic, tx + size * .6, yy, size * 1.2, C.texto); tx += size * 1.6; }
    parrafo(ctx, s, tx, yy - fila * .38, x + w - tx - 20, fila * .76, { size, font: F.txt, valign: 'middle' }); ctx.restore(); });
}
// barras animadas dentro de una caja (valores arriba, rótulos abajo, todo dentro): datos = [[rótulo, valor, color?]]
function barras(ctx, lt, datos, c, o = {}) {
  const max = o.max || Math.max(...datos.map(d => d[1])), n = datos.length, gap = c.w * .08, bw = (c.w - gap * (n - 1)) / n;
  const sv = Math.min(64, bw * .35), sr = Math.min(30, bw * .16), y = c.y1 - sr * 2.2, h = c.h - sr * 2.2 - sv * 1.6;
  datos.forEach(([r, v, col], i) => { const p = E.outB(clamp((lt - (o.at || 0) - i * .12) / .7)); if (p <= 0) return; const bh = h * v / max * p, bx = c.x + i * (bw + gap);
    const g = ctx.createLinearGradient(0, y - bh, 0, y); g.addColorStop(0, col || C.primario); g.addColorStop(1, (col || C.primario) + '55'); ctx.fillStyle = g; rr(ctx, bx, y - bh, bw, Math.max(bh, 1), [12, 12, 0, 0]); ctx.fill();
    texto(ctx, (o.pre || '') + num(v * clamp(p)) + (o.post || ''), bx + bw / 2, y - bh - sv * .35, { size: sv, align: 'center', maxW: bw });
    texto(ctx, up(r), bx + bw / 2, y + sr * 1.6, { size: sr, font: F.dat, align: 'center', color: C.suave, maxW: bw, ls: 2 }); });
}
function glitch(ctx, src, amt, seed) { const r = rnd(seed), n = 8 + Math.floor(amt * 14); for (let i = 0; i < n; i++) { const y = Math.floor(r() * H), h = 4 + Math.floor(r() * 60 * amt), dx = (r() - .5) * W * .11 * amt; ctx.drawImage(src, 0, y, W, h, dx, y, W, h); } }
function estatica(ctx, a, seed) { ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false; ctx.drawImage(ESTATICA[seed % 4], 0, 0, W, H); ctx.restore(); }
function credito(ctx, lt, s) { const a = clamp(lt / .3); ctx.save(); ctx.globalAlpha = a * .9; fuente(ctx, 22, F.dat); ctx.letterSpacing = '2px'; const w = ctx.measureText(s).width + 28; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(SAFE.x0, SAFE.y0, w, 40); ctx.fillStyle = C.primario; ctx.fillRect(SAFE.x0, SAFE.y0, 5, 40); ctx.fillStyle = '#d8dee8'; ctx.fillText(up(s), SAFE.x0 + 16, SAFE.y0 + 28); ctx.restore(); }

// ---------------------------------------------------------------- línea de tiempo: tomas, capas, transiciones
const TOMAS = [], CAPAS = [], POST = { franjas: [] }, SACUDIDAS = [];
function toma(t0, t1, dibujar, tr) { TOMAS.push({ t0, t1, dibujar, tr: tr || { tipo: 'corte' } }); }
function capa(t0, t1, dibujar) { CAPAS.push({ t0, t1, dibujar }); }       // encima de las tomas (logo, subtítulos, etiquetas fijas)
function sacudir(t, amp = 14, dur = .35) { SACUDIDAS.push([t, amp, dur]); }
const SFX_TR = { barrido: 'whoosh', barridoI: 'whoosh', zoom: 'swoosh', glitch: 'glitch', senal: 'static', destello: 'hit', deslizar: 'whoosh', iris: 'swoosh' };
function TR(tipo, d = .35, t) { if (t != null && SFX_TR[tipo]) sfx(t, SFX_TR[tipo], .8); return { tipo, d }; }   // con t: agrega el sonido de la transición
function pintarToma(ctx, s, t) { ctx.save(); s.dibujar(ctx, Math.max(0, t - s.t0), t); ctx.restore(); }   // lt nunca es negativo (media transición de entrada)
function componer(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  let i = TOMAS.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = TOMAS.length - 1; const s = TOMAS[i], nx = TOMAS[i + 1];
  const trN = nx && nx.tr.tipo !== 'corte' ? nx.tr : null, trC = s.tr.tipo !== 'corte' ? s.tr : null;
  if (trN && t > nx.t0 - trN.d / 2) transicion(ctx, s, nx, t, (t - (nx.t0 - trN.d / 2)) / trN.d, trN);
  else if (trC && i > 0 && t < s.t0 + trC.d / 2) transicion(ctx, TOMAS[i - 1], s, t, (t - (s.t0 - trC.d / 2)) / trC.d, trC);
  else pintarToma(ctx, s, t);
  for (const c of CAPAS) if (t >= c.t0 && t < c.t1) { ctx.save(); c.dibujar(ctx, t - c.t0, t); ctx.restore(); }
}
function transicion(ctx, a, b, t, p, tr) {
  p = clamp(p); const ty = tr.tipo;
  if (ty === 'destello' || ty === 'negro' || ty === 'destelloColor') { pintarToma(ctx, p < .5 ? a : b, t); const k = 1 - Math.abs(p - .5) * 2; ctx.fillStyle = ty === 'negro' ? '#000' : ty === 'destelloColor' ? C.primario : '#fff'; ctx.globalAlpha = ty === 'negro' ? E.ioC(k) : Math.pow(k, 1.6) * .95; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
  const ca = pool(0), cb = pool(1), ga = ca.getContext('2d'), gb = cb.getContext('2d'); ga.clearRect(0, 0, W, H); gb.clearRect(0, 0, W, H); pintarToma(ga, a, t); pintarToma(gb, b, t);
  if (ty === 'fundido') { ctx.drawImage(ca, 0, 0); ctx.globalAlpha = E.ioC(p); ctx.drawImage(cb, 0, 0); ctx.globalAlpha = 1; return; }
  if (ty === 'barrido' || ty === 'barridoI') { const dir = ty === 'barrido' ? -1 : 1, D = VERT ? H : W, off = E.ioE(p) * D * dir;
    for (let k = 0; k < 6; k++) { const j = (k - 2.5) / 6 * D * .14 * Math.sin(p * Math.PI); ctx.globalAlpha = 1 / (k + 1);
      if (VERT) { ctx.drawImage(ca, 0, off + j); ctx.drawImage(cb, 0, off - dir * H + j); } else { ctx.drawImage(ca, off + j, 0); ctx.drawImage(cb, off - dir * W + j, 0); } } ctx.globalAlpha = 1; return; }
  if (ty === 'zoom') { const e = E.ioE(p), bl = Math.sin(p * Math.PI) * 14;
    ctx.save(); ctx.globalAlpha = 1 - clamp((p - .4) / .2); ctx.translate(W / 2, H / 2); ctx.scale(1 + e * 2.2, 1 + e * 2.2); ctx.filter = `blur(${bl}px)`; ctx.drawImage(ca, -W / 2, -H / 2); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp((p - .4) / .2); ctx.translate(W / 2, H / 2); const s2 = lerp(.6, 1, e); ctx.scale(s2, s2); ctx.filter = `blur(${bl}px)`; ctx.drawImage(cb, -W / 2, -H / 2); ctx.restore(); return; }
  if (ty === 'glitch' || ty === 'senal') { const src = p < .5 ? ca : cb, amt = Math.sin(p * Math.PI); ctx.drawImage(src, 0, 0); glitch(ctx, src, amt, Math.floor(t * FPS) * 7 + 3); if (ty === 'senal') estatica(ctx, amt * .85, Math.floor(t * FPS)); return; }
  if (ty === 'deslizar') { const e = E.ioE(p); ctx.drawImage(ca, -e * W * .3, 0); ctx.save(); ctx.shadowColor = '#000'; ctx.shadowBlur = 60; ctx.drawImage(cb, (1 - e) * W, 0); ctx.restore(); return; }
  if (ty === 'iris') { ctx.drawImage(ca, 0, 0); ctx.save(); ctx.beginPath(); ctx.arc(tr.x || W / 2, tr.y || H / 2, E.ioC(p) * Math.hypot(W, H), 0, 7); ctx.clip(); ctx.drawImage(cb, 0, 0); ctx.restore(); return; }
  ctx.drawImage(p < .5 ? ca : cb, 0, 0);
}
function sacudida(t) { let x = 0, y = 0; for (const [t0, a, d] of SACUDIDAS) if (t >= t0 && t < t0 + d) { const k = 1 - (t - t0) / d; x += ruido(t * 40 + t0) * a * k; y += ruido(t * 43 + 9 + t0) * a * k; } return [x, y]; }
function post(ctx, t) {
  ctx.drawImage(VINETA, 0, 0);
  let fr = 0; for (const [a, b] of POST.franjas) fr = Math.max(fr, Math.min(E.ioC(inv(a, a + .6, t)), 1 - E.ioC(inv(b - .6, b, t))));   // franjas de cine (solo 16:9)
  if (fr > 0 && !VERT) { const h = H * .11 * fr; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
  if (ESTILO.grano > 0) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = ESTILO.grano; ctx.imageSmoothingEnabled = false; ctx.drawImage(GRANO[Math.floor(t * FPS) % 6], 0, 0, W, H); ctx.restore(); }
}

// ---------------------------------------------------------------- subtítulos animados (obligatorios en 9:16; opcionales en 16:9)
let BLOQUES = null;
function subtitulos(ctx, t, o = {}) {
  if (!BLOQUES) { BLOQUES = []; const n = o.palabras || (VERT ? 3 : 6);
    TM.oraciones.forEach(or => { const ps = or.palabras; for (let i = 0; i < ps.length; i += n) BLOQUES.push({ ps: ps.slice(i, i + n), t0: ps[i][1] + OFF, t1: (i + n < ps.length ? ps[i + n][1] : or.t1 + .15) + OFF }); }); }
  const b = BLOQUES.find(b => t >= b.t0 && t < b.t1); if (!b) return;
  if (!ZONA_SUB) return; const size = o.size || (VERT ? 72 : 52), y = ZONA_SUB.cy + size * .35, lt = t - b.t0, fam = o.font || F.tit;
  const ws = b.ps.map(p => up(p[0])), an = ws.map(s => medir(ctx, s, size, fam)), gap = size * .28, tot = an.reduce((a, c) => a + c, 0) + gap * (ws.length - 1);
  const k = Math.min(1, SAFE.w / (tot + 60)), x0 = W / 2 - tot * k / 2; const p = E.outB(clamp(lt / .25));
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(k * lerp(.85, 1, p), k * lerp(.85, 1, p)); ctx.translate(-W / 2, -y); ctx.globalAlpha *= clamp(lt / .1);
  if (o.caja !== false) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, W / 2 - tot / 2 - 30, y - size * 1.05, tot + 60, size * 1.45, 18); ctx.fill(); }
  let x = W / 2 - tot / 2; b.ps.forEach((pw, i) => { const act = t >= pw[1] + OFF && (i === b.ps.length - 1 || t < b.ps[i + 1][1] + OFF); const q = clamp((t - pw[1] - OFF) / .12);
    ctx.save(); ctx.translate(x + an[i] / 2, y); if (act) { const s = 1 + .1 * (1 - q); ctx.scale(s, s); }
    texto(ctx, ws[i], 0, 0, { size, font: fam, align: 'center', color: act ? (o.colorActivo || C.acento) : C.texto, borde: 'rgba(0,0,0,0.85)', lw: size * .12, alpha: t >= pw[1] + OFF - .05 ? 1 : .55 }); ctx.restore(); x += an[i] + gap; });
  ctx.restore();
}
function marcaDeAgua(ctx, lt) {                                    // logo pequeño en una esquina segura
  const L = MARCA.logo || {}; if (!L.marca_de_agua) return; const h = VERT ? 70 : 56, pos = L.posicion || 'arriba-derecha';
  const x = pos.includes('derecha') ? SAFE.x1 : SAFE.x0, y = pos.includes('arriba') ? SAFE.y0 + h / 2 : SAFE.y1 - h / 2;
  logo(ctx, lt, x, y, h, { version: L.version_agua || 'blanco', alpha: L.opacidad || .8, align: pos.includes('derecha') ? 'right' : 'left' });
}

// ---------------------------------------------------------------- render de un cuadro (lo llama render.js)
const PRINCIPAL = lienzo();
async function renderFrame(f) {
  const t = f / FPS, g = PRINCIPAL.getContext('2d');
  for (let k = 0; k < 4; k++) { FALTA.clear(); componer(g, t); if (!FALTA.size) break; await Promise.all([...FALTA].map(cargar)); }
  const [sx, sy] = sacudida(t); ctx0.fillStyle = '#000'; ctx0.fillRect(0, 0, W, H);
  if (sx || sy) ctx0.drawImage(PRINCIPAL, sx - 8, sy - 8, W + 16, H + 16); else ctx0.drawImage(PRINCIPAL, 0, 0);
  post(ctx0, t); limpiarCache(); return true;
}
window.renderFrame = renderFrame;
