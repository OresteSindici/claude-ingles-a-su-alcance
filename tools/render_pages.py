"""Render every PDF page to a compressed WebP for the theory view (app/public/pages/NNN.webp)."""
import io, os, sys
import pymupdf as fitz
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
d = fitz.open(src)
for p in d:
    pix = p.get_pixmap(dpi=150, annots=False)   # annots=False hides 2002 form boxes/audio icons
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    im.save(f"{out}/{p.number + 1:03d}.webp", "WEBP", quality=62, method=6)
print(len(d), "pages")
