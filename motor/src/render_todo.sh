#!/bin/bash
# Uso: bash 05_motor/src/render_todo.sh [formato] [trabajadores]   (desde la carpeta del proyecto)
# Renderiza en segmentos paralelos, une sin recodificar, mezcla el audio y deja el video en 07_entrega/.
set -e
cd "$(dirname "$0")/../.."
FMT=${1:-$(python3 -c "import json;print(json.load(open('05_motor/proyecto.json'))['formato'])")}
J=${2:-2}
TAG=${FMT/:/x}
NOMBRE=$(python3 -c "import json;print(json.load(open('05_motor/proyecto.json')).get('nombre','video'))")
INFO=$(node 05_motor/src/render.js info "$FMT")
echo "$INFO"
N=$(echo "$INFO" | python3 -c "import json,sys;print(json.loads(sys.stdin.readline())['cuadros'])")
SEG=05_motor/cache/seg_$TAG; mkdir -p "$SEG"
K=$(( J * 4 )); S=$(( (N + K - 1) / K ))
for i in $(seq 0 $((K-1))); do a=$((i*S)); b=$(( (i+1)*S )); [ $b -gt $N ] && b=$N; [ $a -ge $N ] && break
  [ -f "$SEG/s$i.mp4" ] && continue   # segmentos ya hechos se reutilizan (borra el que quieras rehacer)
  echo "$a $b $SEG/s$i.mp4 $FMT"; done | xargs -P"$J" -L1 bash -c 'node 05_motor/src/render.js seg $0 $1 $2 $3 > $2.log 2>&1 || { echo "falló $2"; cat $2.log; exit 255; }'
ls "$SEG"/s*.mp4 | grep -v parcial | sort -V | sed "s|^|file '$PWD/|; s|$|'|" > "$SEG/lista.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$SEG/lista.txt" -c copy "05_motor/cache/${TAG}_mudo.mp4"
[ -f 04_audio/mezcla.wav ] || python3 05_motor/src/audio.py
OUT="07_entrega/${NOMBRE}_${TAG}.mp4"
ffmpeg -v error -y -i "05_motor/cache/${TAG}_mudo.mp4" -i 04_audio/mezcla.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
TAM=$(stat -c %s "$OUT")
if [ "$TAM" -gt 380000000 ]; then   # >380 MB: recodifica para poder enviarlo (límite de 400 MB por archivo)
  ffmpeg -v error -y -i "05_motor/cache/${TAG}_mudo.mp4" -i 04_audio/mezcla.wav -map 0:v -map 1:a -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
fi
echo "LISTO $OUT $(du -h "$OUT" | cut -f1)"
