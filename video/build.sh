#!/usr/bin/env bash
# Rigenera i due video da zero: registra il sito, compone, musica, codifica.
# Richiede: Node 22, Python 3 con numpy, ffmpeg, Chromium di Playwright.
#   cd video && npm install && npx playwright install chromium
#   ./video/build.sh            (dalla radice del repository)
set -euo pipefail

cd "$(dirname "$0")/.."

if ! curl -s -o /dev/null http://localhost:5173/; then
  npx vite --port 5173 --strictPort > /tmp/squeri-vite.log 2>&1 &
  VITE=$!
  trap 'kill $VITE 2>/dev/null || true' EXIT
  for _ in $(seq 1 60); do
    curl -s -o /dev/null http://localhost:5173/ && break
    sleep 1
  done
fi

node video/capture/record.mjs
node video/capture/stills.mjs

for FORMAT in landscape portrait; do
  node video/render.mjs cues --format "$FORMAT"
  python3 video/audio/score.py "$FORMAT"
  node video/render.mjs frames --format "$FORMAT" --workers 3
  node video/render.mjs encode --format "$FORMAT"
done

node video/render.mjs thumb --format landscape
node video/render.mjs thumb --format portrait
