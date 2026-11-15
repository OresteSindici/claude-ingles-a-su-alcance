"""Extract the interactive structure of the 2002 'Inglés a su Alcance' PDF.

Outputs (in OUT dir):
  audio/<sha8>.mp3        every embedded audio clip (deduplicated)
  pdf_structure.json      per page: text lines, audio buttons, answer buttons (-> txt file), internal links, numbered exercise items
"""
import hashlib, json, os, re, sys
import pymupdf as fitz

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(f"{OUT}/audio", exist_ok=True)
d = fitz.open(f"{SRC}/MANUAL INGLÉS A SU ALCANCE.pdf")

def ref(o, key):
    m = re.search(rf"/{key} (\d+) 0 R", o)
    return int(m.group(1)) if m else None

def audio_for_screen(xref):
    """Screen annot -> rendition -> media clip -> filespec -> embedded stream (BFS over references)."""
    seen, queue = {xref}, [xref]
    while queue:
        x = queue.pop(0); o = d.xref_object(x)
        ef = re.search(r"/EF <<\s*/F (\d+) 0 R", o)
        if ef:
            data = d.xref_stream(int(ef.group(1)))
            h = hashlib.sha1(data).hexdigest()[:10]
            path = f"{OUT}/audio/{h}.mp3"
            if not os.path.exists(path):
                open(path, "wb").write(data)
            return h
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
    f = re.search(r"/F \((.*?)\)", ao)
    if f: return f.group(1)
    fs = ref(ao, "F")
    return re.search(r"/F \((.*?)\)", d.xref_object(fs)).group(1) if fs else None

pages = []
for p in d:
    lines = []
    for b in p.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            if t:
                # mark words printed in the highlight colour (the "21" auxiliaries are teal/blue)
                hl = [s["text"].strip() for s in l["spans"] if s["color"] not in (0,) and s["text"].strip()]
                lines.append({"y": round(l["bbox"][1], 1), "x": round(l["bbox"][0], 1), "text": t, "highlight": hl})
    lines.sort(key=lambda l: (l["y"], l["x"]))
    audios, answers, links = [], [], []
    for a in p.annots() or []:
        if a.type[1] == "Screen":
            audios.append({"y": round(a.rect.y0, 1), "x": round(a.rect.x0, 1), "audio": audio_for_screen(a.xref)})
    for w in p.widgets() or []:
        t = launch_target(w.xref)
        if t:
            answers.append({"y": round(w.rect.y0, 1), "x": round(w.rect.x0, 1), "file": t,
                            "label": w.button_caption if w.field_type_string == "Button" else None})
    for l in p.get_links():
        if l["kind"] == fitz.LINK_GOTO:
            links.append({"y": round(l["from"].y0, 1), "toPage": l["page"] + 1})
        elif l.get("file") or l.get("uri"):
            links.append({"y": round(l["from"].y0, 1), "target": l.get("file") or l.get("uri")})

    # Numbered exercise items: "42. HE DIDN'T GO TO THE MUSEUM. (3) ____"
    items = []
    for ln in lines:
        m = re.match(r"^(\d{1,3})\.\s*([^\d\s].*)$", ln["text"])
        if m:
            body = m.group(2)
            fm = re.search(r"\((\d)\)", body)
            items.append({"n": int(m.group(1)), "y": ln["y"], "x": ln["x"],
                          "prompt": re.sub(r"\s*\(\d\)\s*|_{2,}", " ", body).strip(),
                          "formula": int(fm.group(1)) if fm else None, "highlight": ln["highlight"]})
    def nearest_item(y):
        cands = [it for it in items if it["y"] <= y + 8]
        return max(cands, key=lambda it: it["y"]) if cands else None
    for a in audios:
        it = nearest_item(a["y"])
        if it and abs(it["y"] - a["y"]) < 10: it["audio"] = a["audio"]; a["item"] = it["n"]
    for w in answers:
        if w["file"].lower().endswith(".txt"):
            it = nearest_item(w["y"])
            if it and w["y"] - it["y"] < 60:
                it.setdefault("answers", []).append({"x": w["x"], "file": w["file"]}); w["item"] = it["n"]
    for it in items:
        if "answers" in it:
            it["answers"] = [a["file"] for a in sorted(it["answers"], key=lambda a: a["x"])]
    pages.append({"page": p.number + 1, "lines": lines, "audios": audios, "answers": answers,
                  "links": links, "items": items})

json.dump({"toc": d.get_toc(), "pages": pages}, open(f"{OUT}/pdf_structure.json", "w"), ensure_ascii=False, indent=1)
na = sum(len(p["audios"]) for p in pages); nt = sum(len(p["answers"]) for p in pages)
ni = sum(len(p["items"]) for p in pages)
ok_a = sum(1 for p in pages for a in p["audios"] if "item" in a)
ok_t = sum(1 for p in pages for a in p["answers"] if "item" in a)
print(f"audio buttons {na} (matched {ok_a}), answer buttons {nt} (txt matched {ok_t}), numbered items {ni}, unique clips {len(os.listdir(OUT+'/audio'))}")
