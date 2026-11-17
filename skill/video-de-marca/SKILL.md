---
name: video-de-marca
description: Produce videos de marca (explicativos, demos de app o producto, anuncios, documentales) con motion graphics, voz propia, sintética o sin voz, subtítulos, música y efectos, en 16:9, 9:16, 4:5 o 1:1. Úsala para cualquier video, reel, short o comercial con guion o marca, en lugar de video-making.
---

# Video de marca

Convierte un brief en un video terminado, con la identidad de cualquier marca y en cualquier formato. El motor es Canvas 2D determinista dentro de Chromium (Playwright) y ffmpeg: cada cuadro se dibuja por código, así que el mismo guion sirve para 9:16 y 16:9, todo se puede animar con precisión de cuadro y las correcciones se rehacen por segmentos.

**Índice:** 1 Entregables y modos · 2 Flujo · 3 Encuesta · 4 Carpeta y kit de marca · 5 Guion · 6 Voz · 7 Dirección de arte · 8 Animación, cámara y transiciones · 9 Sonido · 10 Escribir escenas.js · 11 Pruebas, render y entrega · 12 Correcciones · 13 Formatos · Anexo: instalar el motor

## 1. Entregables y modos

Entregas siempre: un MP4 por formato pedido en `07_entrega/`, la portada o miniatura, `publicacion.txt` (título, descripción con capítulos reales y etiquetas) y la carpeta del proyecto lista para corregir o reutilizar.

| Modo de voz | Cuándo | Qué hace el motor |
|---|---|---|
| **propia** | El cliente graba (o genera en su herramienta) la locución | La convierte a 48 kHz y la alinea palabra por palabra con el guion (±0,1 s) |
| **tts** | No hay locutor | Genera la voz con Kokoro (voces en es, en, pt, fr, it) frase por frase y conoce los tiempos exactos |
| **lectura** | Video sin voz: texto en pantalla y música | Calcula los tiempos por velocidad de lectura; todo lo demás funciona igual |

En los tres modos sale el mismo `02_voz/tiempos.json`, y las escenas se anclan a frases y palabras, no a segundos fijos. Si cambia la voz, el video se reacomoda solo.

## 2. Flujo

Copia esta lista en la lista de tareas y márcala a medida que avanzas:

```
- [ ] 1. Encuesta -> 00_brief/brief.md
- [ ] 2. Carpeta del proyecto, marca.json, proyecto.json; instalar el motor (Anexo) y correr preparar.py
- [ ] 3. Material: investigar y verificar, reunir logos/capturas/fotos/videos; clips.py revisar -> rangos útiles
- [ ] 4. Guion: 00_brief/guion.md (escenas) + 00_brief/guion_voz.txt (solo lo que se dice)
- [ ] 5. Voz: voz.py tts | propia | lectura -> 02_voz/tiempos.json
- [ ] 6. 05_motor/web/escenas.js
- [ ] 7. render.js info sin huecos ni faltantes -> cuadros de prueba -> hoja -> lista de control -> mostrar 4 a 6 cuadros
- [ ] 8. audio.py -> 04_audio/mezcla.wav
- [ ] 9. render_todo.sh por formato -> revisar cuadros y volumen del MP4 final
- [ ] 10. Portada + publicacion.txt -> entrega
```

Trabaja en el espacio de trabajo (por ejemplo `~/videos/<proyecto>`). Si el equipo del usuario está conectado, trae de su carpeta lo que te dé y devuelve allí la entrega.

## 3. Encuesta (brief)

El formato, la voz y la marca cambian todo lo que viene después, así que se preguntan antes de construir. Usa la herramienta de preguntas con opciones (AskUserQuestion o la equivalente). Si no existe, pregunta en texto. No repitas lo que el usuario ya dijo. Si nadie responde, por ejemplo en una tarea programada, toma los valores por defecto y dilos al inicio.

**Ronda 1, el video**
1. ¿Dónde se publica? (varias opciones): YouTube horizontal 16:9 · Reels/TikTok/Shorts 9:16 · Feed de Instagram/LinkedIn 4:5 · Cuadrado 1:1
2. ¿Cuánto debe durar? 15–30 s · 30–60 s · 1–3 min · 5–12 min
3. ¿Cómo va la voz? Mi voz grabada · Voz sintética (la generas tú) · Sin voz: texto y música
4. ¿Qué tipo de video? Explicativo de producto o servicio · Demostración de app o plataforma · Historia, noticia o documental · Anuncio o promoción

**Ronda 2, la marca**
1. ¿Tienes kit de marca? Sí, adjunto logo, colores y fuentes · Solo logo y colores · No, propón una identidad · Usar la de un video anterior
2. Estilo visual: Cinematográfico oscuro · Limpio corporativo claro · Enérgico y colorido · Minimalista
3. ¿Hay personaje o mascota? Sí, tengo poses · Sí, hay que generar poses · No
4. Música y efectos: Intensos tipo tráiler · Moderados · Suaves y elegantes · Uso la música de mi marca

**Ronda 3, en texto y en un solo mensaje:** tema y mensaje principal; público; qué debe hacer quien lo vea (CTA); material disponible (logos, capturas, fotos, videos, enlaces); si ya hay guion; para voz sintética, voz masculina o femenina.

**Valores por defecto:** 9:16 de 30 a 45 s; voz sintética femenina (`ef_dora`) en español; estilo cinematográfico oscuro; efectos moderados; subtítulos activados en vertical.

Guarda las respuestas en `00_brief/brief.md`. Usa una línea por dato: objetivo, público, formato(s), duración, modo de voz y voz, tono, estilo, marca, personaje, música, CTA, material, fecha.

## 4. Carpeta del proyecto y kit de marca

```
<proyecto>/
  00_brief/      brief.md · guion.md · guion_voz.txt
  01_marca/      marca.json · logo/ (logo.png, logo_blanco.png) · fuentes/ · personaje/ (poses PNG sin fondo)
  02_voz/        voz.wav · tiempos.json
  03_material/   imagenes/ · videos/ · capturas/ · creditos.txt
  04_audio/      musica/ (opcional, de la marca) · mezcla.wav
  05_motor/      proyecto.json · clips.json · web/ (index.html, motor.js, escenas.js) · src/ · cache/
  06_pruebas/    cuadros de prueba y hojas de contacto
  07_entrega/    <nombre>_<formato>.mp4 · portada_*.jpg · publicacion.txt
```

El servidor sirve la carpeta del proyecto completa, así que las escenas usan rutas como `IM('03_material/imagenes/x.jpg')` y nada se copia dos veces.

**`01_marca/marca.json`**: los colores van como roles, no como nombres, para que cualquier marca encaje en los mismos bloques:

```json
{
  "nombre": "Marca",
  "colores": {"fondo": "#0e0b1a", "superficie": "#221a3d", "texto": "#f7f5ff", "suave": "#a8a1c7",
              "primario": "#7c5cff", "secundario": "#29d3c2", "acento": "#ffcc33",
              "ok": "#35e08a", "alerta": "#ffb020", "peligro": "#ff4d5e"},
  "tipografia": {"titulos": {"familia": "Anton", "fontsource": "anton", "peso": 400},
                 "texto": {"familia": "Inter", "fontsource": "inter", "peso": 700},
                 "datos": {"familia": "JetBrains Mono", "fontsource": "jetbrains-mono", "peso": 700}},
  "logo": {"color": "logo/logo.png", "blanco": "logo/logo_blanco.png", "marca_de_agua": true, "posicion": "arriba-derecha", "opacidad": 0.8},
  "personaje": {"nombre": "Mascota"},
  "estilo": {"esquinas": 22, "grano": 0, "vineta": 0.45, "mayusculas": true},
  "voz": {"idioma": "es", "voz": "ef_dora", "velocidad": 1.0}
}
```

**`05_motor/proyecto.json`**:

```json
{"nombre": "marca_tema", "formato": "9:16", "fps": 30, "preroll": 0.6, "cola": 2.5, "locale": "es-CO",
 "subtitulos": true, "voz": {"modo": "tts"}, "musica": {"bpm": 104, "tonalidad": "menor", "volumen": 1.0, "archivo": null}}
```

Cómo armar el kit:
- **Colores.** Si el cliente envía un manual, copia los HEX. Si solo hay logo, saca los 3 o 4 colores dominantes con Pillow y propón la paleta. Usa la regla 60/30/10: fondo y superficie el 60 %, primario y secundario el 30 %, acento el 10 %. El texto debe contrastar al menos 4,5:1 con su fondo; mídelo antes de usarlo. `ok`, `alerta` y `peligro` se reservan para significar (confirmado, sin confirmar, falso; antes y después) y no se usan como decoración.
- **Tipografía.** Máximo dos familias más una monoespaciada para datos. Si la fuente está en Google Fonts, pon su nombre de paquete en `fontsource` (en minúsculas, con guiones) y `preparar.py` la baja. Si es propia, pide el archivo (.woff2, .ttf u .otf), déjalo en `01_marca/fuentes/` y escribe `"archivo": "fuentes/x.woff2"`.
- **Logo.** Pide PNG con transparencia: la versión a color y la versión blanca. Si llega con fondo, usa `recorte.py`.
- **Textura.** Por defecto la imagen sale limpia (`grano: 0`). El grano de película (0,06–0,12) y los efectos de señal o glitch se usan solo si la marca o el estilo lo piden, por ejemplo en un estilo cinematográfico, documental o tecnológico; una marca corporativa, de salud, de belleza o de comida normalmente no los quiere.
- **Personaje o mascota.** Cada pose va como un PNG sin fondo en `01_marca/personaje/<pose>.png`. Para generar poses nuevas, dale al usuario este prompt, con una imagen de referencia adjunta:

```
Usa exactamente el personaje de la imagen adjunta: mismo diseño, colores, proporciones, textura y estilo de render. No cambies su diseño.
Pose: [acción concreta y de cuerpo entero o medio cuerpo], expresión [emoción exagerada y legible], mirando hacia [dirección donde irá el texto].
Fondo blanco puro y liso, sin sombras en el piso, sin otros objetos y sin texto. Formato vertical 3:4, alta resolución, personaje nítido y fácil de recortar.
```

## 5. Guion: historia, gancho, giros y ritmo

La historia decide la retención. Primero escribe la estructura y después las frases.

| Duración | Estructura |
|---|---|
| 15–30 s | Gancho (0–2 s) → problema que duele → giro: aparece la solución → prueba visible → CTA. Ideal: el final conecta con el inicio para que el loop se sienta natural |
| 30–60 s | Gancho → tensión → giro → 2 o 3 beneficios con demostración → prueba (número, antes/después) → CTA |
| 1–3 min | Gancho → promesa ("en 2 minutos sabrás…") → 3 bloques (cada uno con mini gancho, explicación y prueba visual) → giro o dato inesperado → resumen → CTA |
| 5–12 min | Arranque en medio de la acción (escena concreta con fecha y hora) → promesa y adelanto del final ("quédate hasta el final") → título → capítulos numerados → re-gancho cada 60–120 s → punto medio (demostración o simulación) → giro de trama (cambia la interpretación de lo visto) → clímax (se paga la promesa) → desenlace (la lección) → CTA conversacional (una pregunta para los comentarios) |

**Gancho.** Lo primero que se ve y se oye es concreto: un número, una fecha, un conflicto, una pregunta que el público se hace. En formatos cortos el logo no abre el video, porque el gancho va primero. En videos largos, el título llega después del gancho.

**Re-ganchos.** Hay tres tipos: la pregunta directa ("¿te suena?"), la promesa específica (úsala poco) y el cambio de patrón (silencio, cambio de música o de escena). En videos largos va uno cada 25 a 35 segundos; un capítulo, el personaje o una caída de música también cuentan.

**Ritmo visual.** El cambio visual (toma nueva, elemento que entra o movimiento de cámara) llega cada 1,5–3 s en un video corto, cada 3–5 s en uno explicativo y cada 4–8 s en un documental. Ningún plano queda quieto más de unos 8 s. Un silencio de más de 2 s se lee como final; el único silencio que vale es el dramático de 1 s o menos antes del giro.

**Honestidad.** En noticias o datos, verifica en fuentes antes de afirmar. En pantalla, separa lo confirmado, lo sin confirmar y lo falso con sellos de colores `ok`, `alerta` y `peligro`, y muestra el crédito de cada material ajeno con `credito()`.

**`00_brief/guion.md`**: una tabla por escena con estas columnas: n.º | voz (la frase exacta) | visual (qué se ve y qué entra en qué palabra) | texto en pantalla | sonido | transición de entrada.

**`00_brief/guion_voz.txt`**: solo lo que se dice, porque lo leen el TTS y el alineador.
- Escribe los números, las fechas y las monedas en palabras ("seis mil trescientos millones de dólares").
- Escribe las siglas como se pronuncian.
- Las URL se dicen ("agendo punto app").
- Sin emojis, símbolos, viñetas ni paréntesis.
- Cada frase termina en `.`, `?` o `!`. Esas frases son las oraciones `O(i)` de las escenas, contadas desde 0.
- Separa con una línea en blanco los bloques o escenas: generan una pausa más larga.
- Frases de 20 palabras o menos, en lenguaje hablado.

Cuando el usuario está presente, muéstrale el guion antes de seguir, porque rehacer la voz y las escenas cuesta mucho más que corregir un texto.

## 6. Voz y tiempos

```bash
python3 05_motor/src/voz.py tts                      # voz sintética desde guion_voz.txt
python3 05_motor/src/voz.py propia 03_material/locucion.m4a   # grabación del cliente (cualquier formato)
python3 05_motor/src/voz.py lectura                  # sin voz
```

- **Voces de Kokoro:** en español, `ef_dora` (femenina), `em_alex` y `em_santa` (masculinas); en portugués, `pf_dora` y `pm_alex`; en inglés, `af_heart`, `am_michael` y `bf_emma`; en francés, `ff_siwis`; en italiano, `if_sara` e `im_nicola`. Se ajusta `velocidad` (de 0,9 a 1,15) en `marca.json` → `voz`. El modelo se baja una vez de GitHub. Si la red no lo permite, pide al usuario que genere la voz en su herramienta a partir de `guion_voz.txt` y usa el modo `propia`.
- **Voz propia:** la alineación funciona si la locución sigue `guion_voz.txt`. Si el cliente improvisó, transcribe lo que dijo, pon esa transcripción en `guion_voz.txt` y alinea de nuevo.
- **Verificación:** revisa que el número de oraciones de `tiempos.json` coincida con el guion y que la duración sea razonable (unas 2,5 palabras por segundo).

## 7. Dirección de arte

**Composición sin superposiciones.** Este es el error más visible, así que el motor lo previene con zonas:
- `AREA` es la caja de contenido: deja fuera la interfaz de cada red social, la franja de subtítulos (`ZONA_SUB`) y la franja del logo de esquina.
- Reparte esa área con `reparto([.6, .4])`: apila en vertical y pone lado a lado en horizontal, así que el mismo código sirve para los dos formatos. Para divisiones fijas usa `dividir(caja, 'v'|'h', fracciones)`.
- `encajar(caja, proporción)` da el elemento más grande que cabe en una caja (teléfono, video, foto).
- Cada elemento vive en su caja y el texto se ajusta a ella: `frase` y `parrafo` reducen el tamaño hasta caber; `texto`, `etiqueta` y `contador` aceptan `maxW`.
- Nada aparece antes de que la voz lo nombre: el elemento entra en `P(i, 'palabra')`.
- Nada nuevo se monta sobre algo que todavía no se explicó.
- Si un texto va sobre una foto o un video, primero se oscurece (`oscurecer`) o se le pone una placa.
- El orden de capas es: fondo → medios → gráficos → texto → logo y subtítulos.

**Texto.**
- Títulos en la fuente `tit`, en mayúsculas si la marca lo usa; textos largos en `txt`; cifras y rótulos en `dat`, con espaciado.
- Por línea en pantalla: 6 palabras como máximo en vertical y 8 en horizontal.
- Ningún texto mide menos de 28 px (todos los formatos tienen 1080 px de lado corto).
- Las palabras clave van resaltadas con el color de acento o el primario (`hi`).

**Logo.**
- Como marca de agua en su esquina reservada, solo durante el desarrollo.
- Revelado completo en el cierre.
- En formatos cortos, nunca en los primeros segundos.

**Íconos.** Son de lo más importante del video: deben ser exactos, bonitos y estar siempre animados. Usa Lucide (más de 1.500 íconos, con el mismo trazo) mediante `icono(ctx, nombre, x, y, tamaño, color, {insignia, lt})`. Pasa siempre `lt` (el tiempo desde que el ícono entra): así rebota con sobrepaso, gira al asentarse, suelta una onda de impacto y luego flota. Usa `insignia` (círculo con el color de la marca, luz y sombra) para los íconos protagonistas, y acompaña cada entrada con un `pop` o `whoosh`. Busca el ícono que signifique exactamente la idea (`ls 05_motor/cache/iconos | grep -i nevera`; los nombres están en inglés: `refrigerator`, `plane`, `calendar-check`…) y declara los que uses en `window.ICONOS`. Un solo estilo por video y nada de emojis. Si ningún ícono sirve, dibuja uno propio con detalle (degradado, brillo, sombra y proporciones reales), nunca un garabato genérico.

**Imágenes y video.**
- Las fotos siempre se mueven: `foto()` aplica Ken Burns, con un mínimo de 3 % de zoom.
- Para un video, primero mira su hoja de contacto (`clips.py revisar`) y elige ventanas sin cortes, rótulos ni transiciones. Declara cada clip en `05_motor/clips.json` y extráelo con `clips.py`; en la escena se usa con `ventana: [a, b]`, y si la toma dura más que la ventana, el motor la estira en cámara lenta.
- Las capturas de pantalla van dentro de `dispositivo` o `pantalla` (teléfono, laptop o navegador, con desplazamiento suave).
- Los documentos van con `documento()` y su resaltador.
- El color de cada sección acompaña la historia, por ejemplo fondo frío o rojizo en el problema y el primario de la marca en la solución.

**Personaje.** Va del lado opuesto al texto y entra con anticipación, salto y aterrizaje (`personaje()`); después respira. Nunca tapa texto.

## 8. Animación, cámara y transiciones

| Principio | Cómo se aplica aquí |
|---|---|
| Aplastar y estirar | `sello()` y `personaje()` al caer; pulso en contadores |
| Anticipación | El personaje se agacha antes de saltar; un *riser* antes de cada revelación |
| Puesta en escena | Una idea por toma; zonas; oscurecer lo que no importa |
| Pose a pose / directo | Claves con `key(t, [[t0, v0], [t1, v1, E.outB]])` |
| Acción continuada y superpuesta | Las palabras de `cinetico` entran escalonadas, se desenfocan y se asientan |
| Entrada y salida lenta | `E.outC` y `E.outE` para entrar, `E.inC` para salir, `E.ioC` para moverse |
| Arcos | Saltos y trayectorias con seno; los cursores se mueven en curva |
| Acción secundaria | Rejilla que se desliza, respiración, brillo de íconos, anillos |
| Tiempo | Entradas de 0,35–0,6 s; salidas de 0,2–0,35 s; escalón de 0,05–0,1 s; lo escrito queda a la vista 0,3 s por palabra más 0,5 s |
| Exageración | Sobrepaso `E.outB`, sacudida de cámara en impactos |
| Volumen | Sombras, degradados, insignias con luz |
| Atractivo | Paleta de marca, tipografía grande y limpia, espacio negativo |

**Cámara.**
- Acercamiento lento (escala de 1,0 a 1,15) para dar importancia; alejamiento para revelar contexto.
- `sacudir(t, 8–20 px, 0,25–0,5 s)` en impactos.
- Paralaje: el fondo se mueve a 0,3 veces la velocidad del frente.
- En un mapa o una imagen grande, la cámara viaja: `ctx.translate` y `ctx.scale` con `key()` hacia el punto del que se habla.

**Transiciones.** Se ponen en la toma que entra: `toma(t0, t1, dibujar, TR(tipo, duración, t0))`. Pasar `t0` agrega su sonido. Duran de 0,25 a 0,5 s.

| Tipo | Significa |
|---|---|
| corte (sin TR) | Lo normal; corta en la palabra |
| `barrido` / `barridoI` | Cambio de tema con la misma energía |
| `zoom` | Entrar al detalle, ir más profundo |
| `glitch` / `senal` | Tecnología, peligro, rumor, error |
| `destello` / `destelloColor` | Revelación, número clave, nuevo capítulo |
| `negro` | Salto de tiempo, momento emocional |
| `deslizar` | Secuencia, lista, paso siguiente |
| `fundido` | Calma |
| `iris` | Foco en un punto (por ejemplo, la marca aparece) |

**Cortes en la palabra.** Las tomas empiezan en `O(i)` (inicio de oración) o en `P(i, 'palabra')`. Las revelaciones caen en la palabra acentuada.

## 9. Sonido

Cada evento visible tiene su sonido, con `sfx(t, tipo, ganancia, {dur})`:

| Evento | Sonido |
|---|---|
| Texto o elemento que entra | `whoosh`, `swoosh`, `pop` |
| Revelación, número final | `hit`; antes, `riser` con `{dur}` |
| Título, capítulo, giro | `braam` + `impact`; `boom` en golpes graves |
| Sello, palabra que golpea | `stamp`, `slam` |
| Conteo | `counter` con `{dur}` |
| Lista, éxito | `check`, `granted`, `ding` |
| Interfaz, demo | `click`, `type` con `{dur}`, `notif`, `beep`, `blip` |
| Error, peligro | `buzz`, `glitch`, `static` con `{dur}`, `powerdown` |
| Suspenso | `heartbeat`, `drone` con `{dur}`, `whisper` |
| Rebobinar, magia, giro | `rewind`, `warp`, `scratch` (para cortar la música) |
| Otros | `pin`, `tick`, `flap`, `boing`, `ring`, `scan`, `snap`, `zap`, `paper`, `cash`, `fall`, `pulse`, `boot` |

**Música.** Se marca con `seccion(t0, t1, estilo, intensidad 0–1)`.
- Estilos disponibles: `tension`, `pulso`, `impulso`, `misterio`, `oscuro`, `luz`, `calma`, `epico`, `silencio`.
- Arco típico: tensión en el gancho y el problema → pulso o impulso en el desarrollo → silencio de un segundo antes del giro → épico u oscuro en el clímax → luz en la solución y el cierre.
- Si la marca tiene música propia, déjala en `04_audio/musica/` y pon su ruta en `proyecto.json` → `musica.archivo`.
- La música baja sola cuando hay voz. La mezcla final queda en −14 LUFS con picos de −1 dBTP, que es la referencia de YouTube, TikTok e Instagram.

## 10. Escribir `escenas.js`

`escenas.js` define `window.ICONOS = [...]`, `function construir() {...}` y, si hace falta, `function portada(ctx) {...}`. Lo que ofrece el motor:

- **Tiempo** (segundos de video):
  - `O(i)` es el inicio de la oración i y `OF(i)` su fin; `P(i, 'palabra', n)` es el inicio de una palabra (busca por prefijo, sin tildes; `n` indica la ocurrencia).
  - `FIN` es el final del video y `OFF` el preroll.
  - Dentro de una toma, `lt` es el tiempo local (≥ 0) y `t` el absoluto.
- **Espacio:**
  - `W`, `H`, `VERT`.
  - `SAFE`, `AREA` y `ZONA_SUB` son cajas con `{x, y, w, h, x1, y1, cx, cy}`.
  - `caja(x, y, w, h)`, `dividir(c, 'v'|'h', fracciones, gap)`, `reparto(fracciones, c)` y `encajar(c, proporción, margen)`.
- **Marca:** colores en `C.fondo`, `C.superficie`, `C.texto`, `C.suave`, `C.primario`, `C.secundario`, `C.acento`, `C.ok`, `C.alerta` y `C.peligro`; fuentes en `F.tit`, `F.txt` y `F.dat`; `up(s)` pone mayúsculas según el estilo.
- **Línea de tiempo:**
  - `toma(t0, t1, (ctx, lt, t) => {...}, TR(...))` crea una toma; las tomas deben cubrir de 0 a `FIN` sin huecos.
  - `capa(t0, t1, fn)` dibuja por encima de las tomas: subtítulos, marca de agua, rótulos fijos.
  - También `sfx`, `seccion`, `sacudir(t, amplitud, duración)` y `POST.franjas.push([t0, t1])` (franjas de cine, solo en 16:9).
- **Bloques:**
  - Fondos: `fondo(ctx, lt, {c1, c2, rejilla})`, `oscurecer(ctx, a)`.
  - Medios: `foto(ctx, ruta, lt, dur, {s0, s1, x0, x1, y0, y1, filtro, caja})`, `clip(ctx, clave, lt, {ventana, dur, s0, s1, caja, filtro})`.
  - Texto: `texto(ctx, s, x, y, {size, font, align, color, maxW, sombra, borde})`, `parrafo(ctx, s, x, y, w, h, {size, align, valign})`, `cinetico(ctx, lt, palabras, x, y, {size, align, maxW})`, `frase(ctx, lt, lineas, {caja, hi, hiC, fondo:false})`, `etiqueta(ctx, lt, s, x, y, {at, align, bg, color, maxW})`, `tercio(ctx, lt, titulo, sub)`, `sello(ctx, lt, s, x, y, {color, rot, size, maxW})`.
  - Datos y estructura: `contador(ctx, lt, v0, v1, dur, x, y, {pre, post, rotulo, size, at})`, `capitulo(ctx, lt, 'n', titulo, sub)`, `lista(ctx, t, [[texto, t, icono]], x, y, w)`, `barras(ctx, lt, [[rotulo, valor, color]], caja, {max})`.
  - Marca y personaje: `personaje(ctx, lt, pose, x, yPies, alto, {espejo, sale})`, `logo(ctx, lt, x, y, alto, {version})`, `marcaDeAgua(ctx, lt)`, `icono(ctx, nombre, x, y, tamaño, color, {insignia, lt, grosor, alpha})`.
  - Interfaz y material: `documento(ctx, lt, ruta, recorte, {resaltar, caja})`, `dispositivo(ctx, 'telefono'|'laptop'|'navegador', x, y, alto, (g, w, h) => {...}, {url})`, `pantalla(ctx, lt, tipo, ruta, x, y, alto, {desde, hasta})`, `cursor(ctx, x, y, clic0a1)`.
  - Efectos y subtítulos: `glitch`, `estatica`, `credito(ctx, lt, 'FUENTE')`, `subtitulos(ctx, t)`.
- **Utilidades:** `key`, `E.*`, `clamp`, `lerp`, `resorte`, `hash`, `rnd`, `ruido`, `IM(ruta)`, `rr` y `medir`. Si un gráfico no existe (mapa, termómetro, línea de tiempo), escribe tu propia función al final de `escenas.js`, dentro de una caja y con los colores de la marca. Para mapas, instala `d3-geo`, `topojson-client` y `world-atlas` con npm y agrega el script en `proyecto.json` → `extras`.

Patrón de una toma (el motor trae un `escenas.js` de ejemplo completo y probado: léelo antes de escribir el tuyo):

```js
toma(O(2), O(3), (ctx, lt, t) => {
  fondo(ctx, lt, { c1: C.superficie });
  const [zMedia, zTexto] = reparto([.6, .4]);                    // 9:16 apilado, 16:9 lado a lado
  const d = encajar(zMedia, .49, .96);
  pantalla(ctx, lt, 'telefono', '03_material/capturas/app.png', d.x, d.y, d.h, { desde: 0, hasta: .6 });
  const tw = P(2, 'reservan') - O(2);                            // el texto entra cuando la voz lo dice
  if (lt > tw) frase(ctx, lt - tw, ['RESERVAN', 'SOLOS'], { fondo: false, caja: zTexto, hi: ['SOLOS'] });
}, TR('zoom', .4, O(2)));
sfx(P(2, 'reservan'), 'pop', .6);
```

## 11. Pruebas, render y entrega

1. `node 05_motor/src/render.js info 9:16` debe mostrar `"huecos":[]` y `"faltan":[]`. Si falta una palabra, el prefijo de `P()` no coincide con la frase. Este paso también exporta los sonidos y las secciones de música.
2. Renderiza cuadros de prueba en los momentos más cargados de cada formato: la mitad de cada toma, justo después de cada transición y donde haya más texto. Comando: `node 05_motor/src/render.js cuadros 0.8,3.2,7.5 9:16`. Después `python3 05_motor/src/hoja.py 06_pruebas/9x16` y mira la hoja.
3. Revisa cada cuadro con esta lista de control y corrige lo que falle:
   - el texto queda dentro de su caja;
   - nada se superpone;
   - nada aparece antes de nombrarse;
   - los subtítulos y el logo no tapan nada;
   - nada queda en la zona de la interfaz de la red social;
   - los íconos son correctos;
   - hay contraste suficiente;
   - no se ven marcas de agua ajenas sin crédito;
   - todo se mueve y cada ícono entra animado;
   - no hay grano ni efectos de señal si la marca no los pidió;
   - solo se usan colores de la marca.
4. Envía de 4 a 6 cuadros al usuario antes del render completo cuando esté presente.
5. Ejecuta `python3 05_motor/src/audio.py` después de `info`. Vuelve a ejecutarlo si cambian las escenas.
6. Ejecuta `bash 05_motor/src/render_todo.sh 9:16 2` (2 procesos en paralelo; reutiliza los segmentos ya hechos). Repite con cada formato.
7. Del MP4 final, saca de 6 a 10 cuadros con ffmpeg y míralos. Comprueba el volumen con `ffmpeg -i video.mp4 -af ebur128 -f null -`: debe dar cerca de −14 LUFS.
8. **Portada.** Define `portada(ctx)` en `escenas.js` y ejecuta `node 05_motor/src/render.js portada portada` (1280×720, para YouTube) o `... portada 9:16` (portada de un reel). Reglas:
   - 4 palabras o menos, que no repitan el título;
   - una sola figura con emoción clara (personaje o producto);
   - 3 elementos como máximo;
   - alto contraste;
   - legible en el tamaño de un teléfono.
9. **`07_entrega/publicacion.txt`:**
   - un título de 100 caracteres o menos, con la palabra clave al inicio, y 2 alternativas para prueba A/B;
   - una descripción: gancho en 2 líneas, resumen, capítulos `00:00 …` calculados con `O(i)` de `tiempos.json` (el primero en 00:00, en orden y separados al menos 10 s), fuentes y 3 hashtags;
   - etiquetas: 500 caracteres o menos, separadas por coma.
10. Entrega el MP4, la portada y `publicacion.txt` con la herramienta de archivos. Si el equipo del usuario está conectado, cópialos a su carpeta; `render_todo.sh` recodifica si el video pasa de 380 MB.

## 12. Correcciones

Cambia solo lo que el usuario pidió y deja todo lo demás idéntico: composición, encuadres, transiciones, animaciones, tamaños y posiciones. Para no renderizar todo de nuevo:
- El segmento `i` cubre los cuadros `[i·S, (i+1)·S)`, con `S = ceil(N / (J·4))`, donde N es el número de cuadros y J el número de procesos.
- Borra solo los `05_motor/cache/seg_<formato>/s<i>.mp4` que tocan el cambio y vuelve a ejecutar `render_todo.sh`.
- Si cambiaron tiempos o sonidos, antes ejecuta `render.js info` y `audio.py`.

## 13. Formatos

| Formato | Tamaño | Zona segura (izq, arriba, der, abajo) | Notas |
|---|---|---|---|
| `16:9` | 1920×1080 | 96, 64, 96, 64 | YouTube y web; franjas de cine opcionales; subtítulos opcionales (`proyecto.json` → `subtitulos`) |
| `9:16` | 1080×1920 | 90, 250, 150, 460 | Reels, TikTok y Shorts: lo importante va al centro; subtítulos activados; arriba y abajo los tapa la interfaz |
| `4:5` | 1080×1350 | 70, 90, 70, 140 | Feed de Instagram, Facebook y LinkedIn |
| `1:1` | 1080×1080 | 70, 70, 70, 90 | Feed y anuncios |
| `portada` | 1280×720 | 60, 50, 60, 50 | Miniatura de YouTube |

Todo va a 30 fps. Las zonas de 9:16 son márgenes de trabajo conservadores: las interfaces cambian, así que, si la pieza es crítica, conviene subir un borrador privado para comprobarlo.

## Anexo: instalar el motor

El código del motor (unas 1.000 líneas en 11 archivos, probado en 9:16, 16:9 y 4:5 con los tres modos de voz) es público en https://github.com/artechclick/video-de-marca, en la carpeta `motor/`. No lo reescribas de memoria: clónalo y cópialo al proyecto.

```bash
mkdir -p <proyecto>/{00_brief,01_marca/{logo,fuentes,personaje},02_voz,03_material/{imagenes,videos,capturas},04_audio/musica,05_motor/cache,06_pruebas,07_entrega}
git clone --depth 1 https://github.com/artechclick/video-de-marca /tmp/video-de-marca
cp -r /tmp/video-de-marca/motor/web /tmp/video-de-marca/motor/src <proyecto>/05_motor/
# escribe 01_marca/marca.json y 05_motor/proyecto.json (sección 4); luego, desde <proyecto>:
python3 05_motor/src/preparar.py     # paquetes de Python y npm, fuentes de la marca, 1.500 íconos Lucide
```

La carpeta `ejemplo/` del repositorio trae una marca de prueba completa (marca.json, logo, guion y proyecto.json) que sirve para verificar que todo funciona.

**Archivos que trae:**
- `web/index.html`: carga la configuración, las fuentes y los scripts.
- `web/motor.js`: formatos, zonas, bloques, transiciones, subtítulos y render del cuadro.
- `web/escenas.js`: ejemplo de un reel de demostración de app de 27 s; reemplázalo.
- `src/render.js`: `info`, `cuadros`, `seg` y `portada`.
- `src/render_todo.sh`: segmentos en paralelo, unión y mezcla de audio.
- `src/voz.py`: `tts`, `propia` y `lectura`, con alineación por DTW.
- `src/audio.py`: efectos, música por secciones, ducking y −14 LUFS.
- `src/clips.py`: `revisar` y extracción de cuadros de video.
- `src/recorte.py`: quita fondos lisos.
- `src/hoja.py`: hojas de contacto.
- `src/preparar.py`: dependencias, fuentes e íconos.

Requiere un entorno donde Claude pueda ejecutar código, con Node, Playwright y Chromium (`require('playwright')`), ffmpeg y Python 3, y salida a internet hacia GitHub, npm y PyPI. Si GitHub no responde, pide al usuario el ZIP del repositorio (en GitHub: Code → Download ZIP) y usa su carpeta `motor/`.
