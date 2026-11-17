# Video de marca: skill para Claude

Skill para que Claude produzca videos de marca completos: explicativos, demostraciones de app o producto, anuncios y documentales. Usa motion graphics, animación con los 12 principios, voz en off (grabada, sintética o sin voz), subtítulos animados, música y efectos de sonido, en 16:9, 9:16, 4:5 y 1:1.

![Portada de un video de prueba hecho con la skill](ejemplo/portada_demo.jpg)

## Qué hace

1. **Encuesta corta:** formato, duración, voz, tipo de video, kit de marca, estilo, mascota, música y llamado a la acción.
2. **Carpeta de proyecto ordenada**, igual para cualquier marca: brief, marca, voz, material, audio, motor, pruebas y entrega.
3. **Guion con estructura de retención:** gancho, giro, ritmo y cierre según la duración. Sale además una versión del texto lista para la voz.
4. **Voz y tiempos.** Tres modos:
   - `propia`: tu grabación, alineada palabra por palabra con el guion.
   - `tts`: voz sintética (Kokoro) en español, inglés, portugués, francés o italiano.
   - `lectura`: sin voz, con texto en pantalla y música.
5. **Animación por código:** Canvas 2D dentro de Chromium y ffmpeg.
   - Zonas para que nada se superponga y textos que siempre caben en su caja.
   - Íconos animados (Lucide), transiciones con sonido, cámara y subtítulos.
6. **Sonido:** música generada por secciones, más de 40 efectos, ducking automático y mezcla a −14 LUFS.
7. **Entrega:** un MP4 por formato, portada o miniatura y texto de publicación (título, descripción con capítulos y etiquetas).

Los colores, las fuentes, el logo, la mascota y la voz de cada marca van en `marca.json`. Por defecto la imagen sale limpia, sin grano ni efectos de señal.

## Cómo instalar la skill

La skill es la carpeta `skill/video-de-marca/` (un solo archivo `SKILL.md`). El archivo `video-de-marca-skill.zip` es esa misma carpeta comprimida.

- **Claude (web o escritorio):** sube `video-de-marca-skill.zip` en la sección de Skills de la configuración. Necesita la ejecución de código activada.
- **Claude Code:** copia la carpeta `skill/video-de-marca` dentro de `~/.claude/skills/`.

Después pídele a Claude algo como: *"Hazme un reel de 30 segundos para mi marca explicando cómo reservar una cita"*. La skill baja el motor desde este repositorio cada vez que arranca un proyecto.

## Requisitos del entorno

Node con Playwright y Chromium, ffmpeg, Python 3 y salida a internet hacia GitHub, npm y PyPI. El script `motor/src/preparar.py` instala el resto: paquetes de Python, fuentes de Google Fonts mediante @fontsource e íconos Lucide.

## Estructura del repositorio

```
skill/video-de-marca/SKILL.md   instrucciones de la skill
motor/web/                      index.html, motor.js (bloques, zonas, transiciones), escenas.js (ejemplo)
motor/src/                      render.js, render_todo.sh, voz.py, audio.py, clips.py, recorte.py, hoja.py, preparar.py
ejemplo/                        marca de prueba (ficticia): marca.json, logo, guion, proyecto.json
```

Para probarlo a mano con la marca de ejemplo (deja `escenas.js` como viene, porque está escrito para ese guion):

```bash
mkdir prueba && cp -r ejemplo/* prueba/ && mkdir -p prueba/05_motor && cp -r motor/web motor/src prueba/05_motor/
cd prueba && python3 05_motor/src/preparar.py
python3 05_motor/src/voz.py tts
node 05_motor/src/render.js info 9:16 && python3 05_motor/src/audio.py
bash 05_motor/src/render_todo.sh 9:16 2      # -> 07_entrega/agendo_demo_9x16.mp4
```

## Licencia y terceros

El código de este repositorio se publica con licencia MIT (ver `LICENSE`). Los componentes de terceros no vienen incluidos: se descargan al instalar y cada uno conserva su licencia.
- Íconos Lucide: ISC.
- Modelo de voz Kokoro: Apache 2.0.
- espeak-ng: GPL 3.
- Fuentes de Google Fonts: OFL.
- Playwright: Apache 2.0.
- ffmpeg: LGPL/GPL.

La marca "Agendo" del ejemplo es inventada.

Hecho por Artech.
