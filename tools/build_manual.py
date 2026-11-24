"""Extract every interactive element of the original PDF with its position on the page, so the app can
overlay them on the page images (Manual tab): audio buttons, answer boxes (.txt), exercise links (.htm),
links to other pages and web links. Positions are percentages of the page (same crop as render_pages.py).

usage: python3 tools/build_manual.py   -> build/manual_raw.json
"""
import hashlib, json, re
import pymupdf as fitz

d = fitz.open("legacy/MANUAL INGLÉS A SU ALCANCE.pdf")

def ref(o, key):
    m = re.search(rf"/{key} (\d+) 0 R", o)
    return int(m.group(1)) if m else None

def audio_hash(xref):
    """Screen annotation -> embedded mp3; same name (sha1[:10]) as tools/extract_pdf.py writes."""
    seen, queue = {xref}, [xref]
    while queue:
        x = queue.pop(0); o = d.xref_object(x)
        ef = re.search(r"/EF <<\s*/F (\d+) 0 R", o)
        if ef: return hashlib.sha1(d.xref_stream(int(ef.group(1)))).hexdigest()[:10]
        if x != xref and "/Type /Page" in o: continue
        for r in re.findall(r"(\d+) 0 R", o):
            r = int(r)
            if r not in seen and not (x == xref and re.search(rf"/(P|Parent) {r} 0 R", o)):
                seen.add(r); queue.append(r)
    return None

def launch_target(xref):
    a = ref(d.xref_object(xref), "A")
    if not a: return None
    ao = d.xref_object(a)
    if "/Launch" not in ao: return None
    f = re.search(r"/F \(((?:[^()\\]|\\.)*)\)", ao)
    if f: return f.group(1)
    fs = ref(ao, "F")
    m = re.search(r"/F \(((?:[^()\\]|\\.)*)\)", d.xref_object(fs)) if fs else None
    return m.group(1) if m else None

pages = {}
for p in d:
    W, H = p.rect.width, p.rect.height
    box = lambda r: [round(100 * r.x0 / W, 2), round(100 * r.y0 / H, 2), round(100 * r.width / W, 2), round(100 * r.height / H, 2)]
    items = []
    for a in p.annots() or []:
        if a.type[1] == "Screen":
            h = audio_hash(a.xref)
            if h: items.append({"k": "audio", "r": box(a.rect), "a": h})
    for w in p.widgets() or []:
        t = launch_target(w.xref)
        if t: items.append({"k": "file", "r": box(w.rect), "f": t, "label": w.button_caption or ""})
    for l in p.get_links():
        r = box(l["from"])
        if l["kind"] == fitz.LINK_GOTO and l.get("page", -1) >= 0:
            items.append({"k": "goto", "r": r, "p": l["page"] + 1})
        elif l["kind"] == fitz.LINK_URI and l.get("uri"):
            items.append({"k": "url", "r": r, "u": l["uri"]})
        elif l.get("file"):
            items.append({"k": "file", "r": r, "f": l["file"], "label": ""})
    pages[p.number + 1] = items
json.dump(pages, open("build/manual_raw.json", "w"), ensure_ascii=False)
from collections import Counter
print(Counter(i["k"] for v in pages.values() for i in v))
