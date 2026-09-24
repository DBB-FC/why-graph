#!/usr/bin/env bash
# Rehace las capturas del README con el plugin ya construido. Necesita Google Chrome.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "No encuentro Chrome. Exporta CHROME=/ruta/a/chrome"; exit 1; }
[ -f ../../main.js ] || { echo "Falta main.js: corre npm run build"; exit 1; }
cp ../../main.js main.js
cp ../../styles.css styles.css
printf '\nwindow.__VistaMapa = VistaMapa; window.__AjustesMapa = AjustesMapa; window.__AJUSTES_BASE = AJUSTES_BASE;\n' >> main.js
node -e "const fs=require('fs');fs.writeFileSync('vault.js','window.__VAULT = '+fs.readFileSync('vault.json','utf8')+';')"

tomar() {
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size=1440,860 --screenshot="$1.png" --virtual-time-budget=7000 \
    "file://$PWD/mirador.html?$2" >/dev/null 2>&1
  echo "  $1"
}
echo "Tomando capturas…"
tomar 01-mapa ""
tomar 02-panel "foco=Tostadora"
tomar 03-camino "vista=camino&de=Hotel&a=Mapa"
tomar 04-vacios "vista=vacios"
tomar 05-radial "vista=radial&foco=Camila"
tomar 08-novedades "vista=novedades"

python3 - <<'PY'
from PIL import Image
import pathlib
destino = pathlib.Path('../../docs/imagenes')
destino.mkdir(parents=True, exist_ok=True)
for f in sorted(pathlib.Path('.').glob('0*.png')):
    im = Image.open(f).convert('RGB')
    im = im.resize((1600, int(im.height * 1600 / im.width)), Image.LANCZOS)
    salida = destino / (f.stem + '.webp')
    im.save(salida, quality=88, method=6)
    print(f'  {salida.name}: {salida.stat().st_size // 1024} KB')
    f.unlink()
PY
rm -f main.js styles.css vault.js
echo "Listas en docs/imagenes/."
