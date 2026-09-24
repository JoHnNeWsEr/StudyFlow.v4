#!/bin/bash
# Turns every file in sounds/ into 10/15/20-second notification sounds (Android res/raw)
# plus a short preview and a sounds.json list for the app.
set -e
RAW=android/app/src/main/res/raw
mkdir -p "$RAW" dist/sounds
list="["
shopt -s nullglob
for f in sounds/*; do
  n=$(basename "$f"); n="${n%.*}"
  n=$(echo "$n" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]/_/g')
  for d in 10 15 20; do
    ffmpeg -y -loglevel error -i "$f" -t $d -ac 1 -ar 22050 -c:a libvorbis -q:a 3 "$RAW/s_${n}_${d}.ogg"
  done
  ffmpeg -y -loglevel error -i "$f" -t 6 -ac 1 -ar 22050 -c:a libvorbis -q:a 2 "dist/sounds/${n}.ogg"
  list="$list\"$n\","
done
echo "${list%,}]" > dist/sounds.json
echo "Prepared: $(cat dist/sounds.json)"
