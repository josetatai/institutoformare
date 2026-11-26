#!/usr/bin/env bash
# Converte um PDF em páginas WebP para o flipbook e gera a capa.
# Uso: scripts/converter-pdf.sh <arquivo.pdf> <slug-do-titulo>
# Requer: pdftoppm (poppler-utils) e python3 com Pillow.
set -euo pipefail
PDF="$1"; SLUG="$2"
OUT="${STORAGE_DIR:-storage}/livros/$SLUG"
TMP="$(mktemp -d)"
mkdir -p "$OUT" public/capas
pdftoppm -r 150 -png "$PDF" "$TMP/p"
python3 - "$TMP" "$OUT" "$SLUG" <<'PY'
import sys, os, glob
from PIL import Image
tmp, out, slug = sys.argv[1:4]
files = sorted(glob.glob(os.path.join(tmp, 'p-*.png')), key=lambda f: int(f.rsplit('-', 1)[1][:-4]))
for i, f in enumerate(files, 1):
    im = Image.open(f).convert('RGB')
    im.save(os.path.join(out, f'{i:03d}.webp'), 'WEBP', quality=82, method=5)
    if i == 1:
        c = im.copy(); c.thumbnail((600, 850))
        c.save(f'public/capas/{slug}.webp', 'WEBP', quality=85, method=5)
print(len(files))
PY
rm -rf "$TMP"
