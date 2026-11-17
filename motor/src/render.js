// node render.js info  [formato]                -> errores, huecos, palabras no encontradas; exporta cues y secciones
// node render.js cuadros 1.5,4,9 [formato]       -> JPG de prueba en 06_pruebas/
// node render.js seg F0 F1 salida.mp4 [formato]  -> cuadros [F0,F1) codificados
// node render.js portada [formato] [WxH]         -> 07_entrega/portada_<formato>.jpg (usa portada() de escenas.js)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const TIPOS = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.webp': 'image/webp' };
const servir = () => new Promise(ok => { const s = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(RAIZ)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(d); }); }); s.listen(0, '127.0.0.1', () => ok(s)); });
async function abrir(formato, portada) {
  const srv = await servir(); const br = await chromium.launch({ args: ['--js-flags=--max-old-space-size=3072'] });
  const pg = await br.newPage({ viewport: { width: 800, height: 600 } }); const errs = [];
  pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const qs = new URLSearchParams(); if (formato) qs.set('formato', formato); if (portada) qs.set('portada', '1');
  await pg.goto(`http://127.0.0.1:${srv.address().port}/05_motor/web/index.html?${qs}`);
  await pg.waitForFunction(() => window.LISTO === true, null, { timeout: 180000 });
  const err = await pg.evaluate(() => window.ERROR); if (err) { console.error('ERROR DE CONSTRUCCIÓN:\n' + err); await br.close(); srv.close(); process.exit(2); }
  return { srv, br, pg, errs };
}
const jpg = (pg, f, q = .92) => pg.evaluate(async ([f, q]) => { await window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', q).slice(23); }, [f, q]).then(b => Buffer.from(b, 'base64'));
(async () => {
  const [modo, a, b, c, d] = process.argv.slice(2);
  const formato = modo === 'seg' ? d : modo === 'info' ? a : modo === 'cuadros' ? b : modo === 'portada' ? a : null;
  const { srv, br, pg, errs } = await abrir(formato, modo === 'portada');
  try {
    if (modo === 'info') {
      const i = await pg.evaluate(() => ({ huecos: HUECOS, faltan: window.FALTAN || [], n: NCUADROS, fin: FIN, tomas: TOMAS.length, cues: CUES, secciones: SECCIONES, W, H, fps: FPS }));
      fs.writeFileSync(path.join(RAIZ, '05_motor/cache/cues.json'), JSON.stringify(i.cues)); fs.writeFileSync(path.join(RAIZ, '05_motor/cache/secciones.json'), JSON.stringify(i.secciones));
      console.log(JSON.stringify({ formato: formato || 'proyecto', W: i.W, H: i.H, fps: i.fps, cuadros: i.n, duracion: +i.fin.toFixed(2), tomas: i.tomas, sonidos: i.cues.length, secciones: i.secciones.length, huecos: i.huecos, faltan: [...new Set(i.faltan)] }));
    } else if (modo === 'cuadros') {
      const dir = path.join(RAIZ, '06_pruebas', (formato || 'proyecto').replace(':', 'x')); fs.mkdirSync(dir, { recursive: true });
      for (const s of a.split(',')) { const t = +s; fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(7, '0')}.jpg`), await jpg(pg, Math.round(t * 30))); }
      console.log(dir);
    } else if (modo === 'portada') {
      const out = path.join(RAIZ, '07_entrega', `portada_${(formato || 'proyecto').replace(':', 'x')}.jpg`); fs.writeFileSync(out, await jpg(pg, 0, .95)); console.log(out);
    } else if (modo === 'seg') {
      const f0 = +a, f1 = +b, tmp = c.replace(/\.mp4$/, '.parcial.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-threads', '1', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
      const t0 = Date.now();
      for (let f = f0; f < f1; f++) { const buf = await jpg(pg, f); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if ((f - f0) % 300 === 0) console.log(`[${path.basename(c)}] ${f}/${f1} ${((Date.now() - t0) / Math.max(1, f - f0)).toFixed(0)} ms/cuadro`); }
      ff.stdin.end(); const code = await new Promise(r => ff.on('close', r)); if (code !== 0) throw new Error('ffmpeg ' + code); fs.renameSync(tmp, c);
    }
    if (errs.length) console.log('ERRORES EN LA PÁGINA:\n' + [...new Set(errs)].slice(0, 20).join('\n'));
  } finally { await br.close(); srv.close(); }
})().catch(e => { console.error(e); process.exit(1); });
