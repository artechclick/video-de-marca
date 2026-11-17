// ESCENAS — Agendo (demo). Tiempos: O(i) inicio de oración i, P(i,'palabra') inicio de palabra, FIN = final del video.
window.ICONOS = ['message-circle', 'user-x', 'calendar-check', 'bell-ring', 'scissors', 'clock', 'check', 'sparkles', 'gift'];

function construir() {
  // 0 · GANCHO: el chat que se desborda (el problema se ve en el primer segundo)
  toma(0, O(1), (ctx, lt, t) => {
    fondo(ctx, lt);
    const [zMedia, zTexto] = reparto([.62, .38]);                 // vertical: teléfono arriba, texto abajo | horizontal: lado a lado
    const d = encajar(zMedia, .49, .98);
    dispositivo(ctx, 'telefono', d.x, d.y, d.h, (g, w, h) => chatLleno(g, w, h, lt), { escala: lerp(.92, 1, E.outB(clamp(lt / .5))) });
    frase(ctx, lt - .1, ['¿TODAVÍA', 'AGENDAS', 'A MANO?'], { fondo: false, caja: zTexto, hi: ['MANO?'] });
  });
  sfx(.05, 'hit', .8); sfx(.3, 'notif', .5); sfx(.6, 'notif', .5); sfx(.9, 'notif', .5); sacudir(P(0, 'mano'), 8, .3);

  // 1 · TENSIÓN: cada mensaje sin responder = cliente perdido
  toma(O(1), O(2), (ctx, lt, t) => {
    fondo(ctx, lt, { c1: '#2a1530' });
    const [z1, z2, z3] = dividir(AREA, 'v', [.4, .3, .3]);
    const s1 = Math.min(z1.h, z1.w) * .6;
    icono(ctx, 'message-circle', z1.cx, z1.cy, s1, C.texto, { insignia: C.superficie });
    const n = Math.floor(key(lt, [[0, 1], [2.2, 47, E.outC]])); ctx.save(); ctx.translate(z1.cx + s1 * .5, z1.cy - s1 * .42); const s = 1 + .2 * Math.exp(-((lt * 4) % 1) * 6); ctx.scale(s, s);
    ctx.fillStyle = C.peligro; ctx.beginPath(); ctx.arc(0, 0, s1 * .2, 0, 7); ctx.fill(); texto(ctx, String(n), 0, s1 * .075, { size: s1 * .2, align: 'center', maxW: s1 * .32 }); ctx.restore();
    const tc = P(1, 'cliente') - O(1);
    if (lt > tc) icono(ctx, 'user-x', z2.cx, z2.cy, Math.min(z2.h, z2.w) * .6, C.peligro, { alpha: clamp((lt - tc) / .3) });
    sello(ctx, t - P(1, 'competencia'), 'CLIENTE PERDIDO', z3.cx, z3.cy, { color: C.peligro, size: 96, maxW: z3.w });
  }, TR('barrido', .35, O(1)));
  sfx(O(1) + .1, 'counter', .5, { dur: 2 }); sfx(P(1, 'cliente'), 'pop', .6); sfx(P(1, 'competencia'), 'stamp', 1); sacudir(P(1, 'competencia') + .2, 10, .3);

  // 2 · GIRO: aparece la marca
  toma(O(2), O(3), (ctx, lt, t) => {
    fondo(ctx, lt, { c1: '#2b2163' });
    const [zl, zf, ze] = dividir(AREA, 'v', [.4, .4, .2]);
    for (let k = 0; k < 3; k++) { const r = (lt * 420 + k * 260) % 900; ctx.strokeStyle = `rgba(124,92,255,${(1 - r / 900) * .5})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(zl.cx, zl.cy, r, 0, 7); ctx.stroke(); }
    logo(ctx, lt, zl.cx, zl.cy, Math.min(zl.h * .45, zl.w * .2));
    const tr = P(2, 'reservan') - O(2); if (lt > tr) frase(ctx, lt - tr, ['TUS CLIENTES', 'RESERVAN SOLOS'], { fondo: false, caja: zf, hi: ['SOLOS'], hiC: C.secundario });
    etiqueta(ctx, lt, '24/7 · a cualquier hora', ze.cx, ze.cy, { at: P(2, 'cualquier') - O(2), align: 'center', bg: C.secundario, color: C.fondo, maxW: ze.w });
  }, TR('iris', .5, O(2)));
  sfx(O(2), 'braam', .7); sfx(O(2) + .05, 'impact', .6); sfx(P(2, 'cualquier'), 'pop', .5);

  // 3 · DEMOSTRACIÓN: elegir servicio y horario en la app (cursor y clics en el momento en que se nombran)
  const tServ = P(3, 'servicio'), tHor = P(3, 'horario'), tListo = P(3, 'listo');
  toma(O(3), O(4), (ctx, lt, t) => {
    fondo(ctx, lt);
    const [zTel, zTxt] = VERT ? [AREA, null] : reparto([.5, .5]);
    const d = encajar(zTel, .49, .98);
    dispositivo(ctx, 'telefono', d.x, d.y, d.h, (g, w, h) => appReserva(g, w, h, t, tServ, tHor, tListo));
    const sc = d.h / 1000, ox = d.x - (d.h * .49 - 24) / 2, oy = d.y - (d.h - 24) / 2;      // coordenadas de la app (pantalla de 466x976 a escala 1000) -> video
    const cx = key(t, [[O(3), 380], [tServ - .1, 150, E.ioC], [tHor - .1, 400, E.ioC], [tListo - .1, 240, E.ioC]]), cy = key(t, [[O(3), 760], [tServ - .1, 230, E.ioC], [tHor - .1, 470, E.ioC], [tListo - .1, 860, E.ioC]]);
    const clic = [tServ, tHor, tListo].map(x => t - x).filter(x => x >= 0 && x < .5)[0];
    cursor(ctx, ox + cx * sc, oy + cy * sc, clic == null ? 0 : clic * 2);
    if (zTxt) frase(ctx, lt, ['ELIGEN', 'Y LISTO'], { fondo: false, caja: zTxt, hi: ['LISTO'], hiC: C.secundario });
  }, TR('zoom', .4, O(3)));
  [tServ, tHor, tListo].forEach(x => sfx(x, 'click', .9)); sfx(tListo + .05, 'check', .7);

  // 4 · BENEFICIO: la cita llega confirmada y el recordatorio sale solo
  const tRec = P(4, 'recordatorio'), tConf = P(4, 'confirmada');
  toma(O(4), O(5), (ctx, lt, t) => {
    fondo(ctx, lt, { c1: '#16323a' });
    const [zn, zf] = dividir(AREA, 'v', [.55, .45]); const [n1, n2] = dividir(caja(zn.cx - Math.min(zn.w, 900) / 2, zn.y, Math.min(zn.w, 900), zn.h), 'v', [1, 1], 30);
    notificacion(ctx, lt - .1, n1, 'calendar-check', C.ok, 'Cita confirmada', 'Laura · Corte y color · Jue 3:00 p. m.');
    if (t > tRec - .2) notificacion(ctx, t - tRec + .2, n2, 'bell-ring', C.acento, 'Recordatorio enviado', 'Automático, 24 horas antes');
    if (t > tConf) frase(ctx, t - tConf, ['SIN ESCRIBIR', 'UN SOLO MENSAJE'], { fondo: false, caja: zf, hi: ['MENSAJE'], hiC: C.ok });
  }, TR('deslizar', .35, O(4)));
  sfx(O(4) + .1, 'notif', .8); sfx(tRec - .2, 'notif', .8);

  // 5 · PRUEBA: menos mensajes, cero citas perdidas
  toma(O(5), O(7), (ctx, lt, t) => {
    fondo(ctx, lt);
    const [zb, zc] = reparto([.55, .45], AREA, 60); const [zt, zg] = dividir(zb, 'v', [.12, .88], 10);
    texto(ctx, up('mensajes por cita'), zt.cx, zt.cy + 12, { size: 34, font: F.dat, color: C.suave, ls: 4, align: 'center', maxW: zt.w });
    barras(ctx, lt, [['antes', 14, C.peligro], ['con agendo', 1, C.ok]], caja(zg.cx - zg.w * .4, zg.y, zg.w * .8, zg.h), { max: 14 });
    const t6 = O(6) - O(5); if (lt > t6) contador(ctx, lt, 9, 0, .9, zc.cx, zc.cy + Math.min(zc.h, 300) * .25, { at: t6, size: Math.min(300, zc.h * .7), color: C.ok, rotulo: 'citas perdidas', brillo: C.ok + '88', maxW: zc.w });
  }, TR('barrido', .35, O(5)));
  sfx(O(5) + .1, 'whoosh', .5); sfx(O(6), 'counter', .5, { dur: .9 }); sfx(O(6) + .95, 'hit', .7);

  // 6 · LLAMADO A LA ACCIÓN
  toma(O(7), FIN, (ctx, lt, t) => {
    fondo(ctx, lt, { c1: '#2b2163' });
    const [zl, zf, ze, zi] = dividir(AREA, 'v', [.3, .3, .2, .2]);
    logo(ctx, lt, zl.cx, zl.cy, Math.min(zl.h * .5, zl.w * .18));
    frase(ctx, lt - .2, ['PRUÉBALO GRATIS'], { fondo: false, caja: zf, hi: ['GRATIS'], hiC: C.acento });
    etiqueta(ctx, lt, 'agendo.app', ze.cx, ze.cy, { at: P(7, 'agendo') - O(7), align: 'center', size: VERT ? 52 : 46, bg: C.primario, maxW: ze.w });
    icono(ctx, 'gift', zi.cx, zi.cy, Math.min(zi.h, 120) * .8, C.acento, { alpha: clamp((lt - 1) / .3) });
  }, TR('destello', .25, O(7)));
  sfx(O(7), 'whoosh', .6); sfx(P(7, 'agendo'), 'ding', .7);

  // CAPAS: subtítulos en su franja; logo de esquina solo en el desarrollo (no tapa el gancho ni el cierre)
  capa(.4, FIN, (ctx, lt, t) => subtitulos(ctx, t));
  capa(O(3), O(7), (ctx, lt) => marcaDeAgua(ctx, lt));
  // MÚSICA: tensión en el problema, luz desde que aparece la marca
  seccion(0, O(2), 'tension', .7); seccion(O(2), O(5), 'luz', .7); seccion(O(5), FIN, 'pulso', .8);
}

// ------------------------------------------------ gráficos propios de este video
function chatLleno(g, w, h, lt) {
  g.fillStyle = '#ece5dd'; g.fillRect(0, 0, w, h); g.fillStyle = '#075e54'; g.fillRect(0, 0, w, 110); texto(g, 'Clientes · 47 sin leer', 30, 78, { size: 30, font: F.txt, color: '#fff', maxW: w - 60 });
  const msgs = ['¿Tienes cita mañana?', 'Hola!! precio del tinte?', '¿A qué hora abren?', 'Necesito corte hoy', '¿Me confirmas?', 'Holaaa', '¿Hay espacio el sábado?', '???', 'Me cancelaron, ¿hay otro día?'];
  msgs.forEach((m, i) => { const p = E.outB(clamp((lt - i * .2) / .3)); if (p <= 0) return; const y = 150 + i * 92 - Math.max(0, lt - 1.2) * 60;
    g.save(); g.globalAlpha = clamp(p); g.translate(30, y); g.scale(p, p); g.fillStyle = '#fff'; rr(g, 0, 0, w * .78, 72, 16); g.fill(); texto(g, m, 22, 46, { size: 28, font: F.txt, color: '#111', maxW: w * .78 - 44 }); g.restore(); });
}
function appReserva(g, w, h, t, tS, tH, tL) {
  g.fillStyle = '#f6f4ff'; g.fillRect(0, 0, w, h); g.fillStyle = C.primario; g.fillRect(0, 0, w, 120); texto(g, 'Reservar cita', 30, 84, { size: 40, font: F.txt, color: '#fff' });
  const serv = [['scissors', 'Corte'], ['sparkles', 'Color'], ['scissors', 'Barba']];
  serv.forEach(([ic, s], i) => { const x = 24 + i * (w - 48) / 3, sel = t > tS && i === 0; g.fillStyle = sel ? C.primario : '#fff'; rr(g, x + 6, 160, (w - 48) / 3 - 12, 150, 18); g.fill();
    icono(g, ic, x + (w - 48) / 6, 215, 56, sel ? '#fff' : C.primario, { brillo: false }); texto(g, s, x + (w - 48) / 6, 285, { size: 26, font: F.txt, align: 'center', color: sel ? '#fff' : '#222' }); });
  texto(g, 'Horario', 30, 400, { size: 30, font: F.txt, color: '#333' });
  ['9:00', '10:30', '3:00', '4:30', '5:00', '6:30'].forEach((s, i) => { const x = 24 + (i % 3) * (w - 48) / 3, y = 430 + Math.floor(i / 3) * 110, sel = t > tH && i === 2;
    g.fillStyle = sel ? C.secundario : '#fff'; rr(g, x + 6, y, (w - 48) / 3 - 12, 90, 14); g.fill(); texto(g, s, x + (w - 48) / 6, y + 58, { size: 32, font: F.txt, align: 'center', color: sel ? '#fff' : '#222' }); });
  const ok = t > tL; g.fillStyle = ok ? C.ok : C.primario; rr(g, 30, 800, w - 60, 110, 22); g.fill(); texto(g, ok ? '¡Cita reservada!' : 'Confirmar', w / 2, 872, { size: 38, font: F.txt, align: 'center', color: '#fff' });
  if (ok) { const p = E.outB(clamp((t - tL) / .4)); g.save(); g.translate(w / 2, 1000); g.scale(p, p); icono(g, 'check', 0, 0, 90, C.ok, { insignia: '#ffffff' }); g.restore(); }
}
function notificacion(ctx, lt, c, ic, col, titulo, sub) {
  if (lt < 0) return; const p = E.outB(clamp(lt / .45)), h = Math.min(190, c.h), x = c.x, y = c.cy - h / 2, w = c.w; ctx.save(); ctx.globalAlpha *= clamp(lt / .2); ctx.translate(0, (1 - p) * -120);
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.fillStyle = 'rgba(255,255,255,0.96)'; rr(ctx, x, y, w, h, 34); ctx.fill(); ctx.shadowColor = 'transparent';
  icono(ctx, ic, x + 100, y + h / 2, 84, '#fff', { insignia: col, brillo: false });
  texto(ctx, titulo, x + 190, y + 82, { size: 46, font: F.txt, color: '#141022', maxW: w - 220 }); texto(ctx, sub, x + 190, y + 136, { size: 32, font: F.txt, peso: 700, color: '#6b6386', maxW: w - 220 });
  ctx.restore();
}

// PORTADA (miniatura o portada del reel): node 05_motor/src/render.js portada portada
function portada(ctx) {
  fondo(ctx, 3, { c1: '#2b2163' }); const v = H > W;
  dispositivo(ctx, 'telefono', v ? W / 2 : W * .74, v ? H * .62 : H * .55, v ? 1000 : 640, (g, w, h) => chatLleno(g, w, h, 3));
  ctx.save(); ctx.translate(v ? W / 2 : W * .3, v ? H * .2 : H * .4); ctx.rotate(-.04); fuente(ctx, v ? 150 : 110, F.tit); const tw = ctx.measureText('¿AÚN A MANO?').width;
  ctx.fillStyle = C.peligro; rr(ctx, -tw / 2 - 30, -(v ? 140 : 100), tw + 60, v ? 180 : 130, 20); ctx.fill(); texto(ctx, '¿AÚN A MANO?', 0, v ? 10 : 6, { size: v ? 150 : 110, align: 'center' }); ctx.restore();
  logo(ctx, 1, v ? W / 2 : W * .3, v ? H * .32 : H * .66, v ? 90 : 70, { fijo: true });
}
