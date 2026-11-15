"""Merge PDF structure + answer .txt files + quizzes into content/ for the app.
usage: python3 tools/build_content.py <drive src dir>"""
import json, os, shutil, sys, unicodedata
SRC = sys.argv[1]; B = "build"; OUT = "content"
os.makedirs(f"{OUT}/audio", exist_ok=True)
pdf = json.load(open(f"{B}/pdf_structure.json"))

def read_txt(rel):
    p = os.path.join(SRC, rel)
    if not os.path.exists(p):
        # filenames in the PDF can differ in case/accents from the files on disk
        d, f = os.path.split(p)
        if os.path.isdir(d):
            m = [x for x in os.listdir(d) if x.lower() == f.lower()]
            if m: p = os.path.join(d, m[0])
    if not os.path.exists(p): return None
    raw = open(p, "rb").read()
    try: t = raw.decode("utf-8")
    except UnicodeDecodeError: t = raw.decode("cp1252")
    return unicodedata.normalize("NFC", t.replace("\r\n", "\n").replace("\r", "\n")).strip()

missing, exercises = [], 0
pages = []
for p in pdf["pages"]:
    items = []
    for it in p["items"]:
        e = {"n": it["n"], "prompt": it["prompt"], "formula": it["formula"], "highlight": it["highlight"]}
        if it.get("audio"):
            e["audio"] = f"audio/{it['audio']}.mp3"
        if it.get("answers"):
            e["answers"] = []
            for f in it["answers"]:
                t = read_txt(f)
                if t is None: missing.append(f)
                e["answers"].append({"source": f, "text": t})
        if e.get("audio") or e.get("answers"): exercises += 1
        items.append(e)
    pages.append({"page": p["page"], "text": "\n".join(l["text"] for l in p["lines"]),
                  "links": p["links"], "items": items,
                  "unmatchedAnswers": [a["file"] for a in p["answers"] if "item" not in a]})
for f in os.listdir(f"{B}/audio"): shutil.copy(f"{B}/audio/{f}", f"{OUT}/audio/{f}")
json.dump({"title": "Inglés a su Alcance", "author": "TC Jairo Alberto Payán, Fuerza Aérea Colombiana",
           "year": 2002, "toc": [{"level": l, "title": t, "page": pg} for l, t, pg in pdf["toc"]], "pages": pages},
          open(f"{OUT}/course.json", "w"), ensure_ascii=False, indent=1)
shutil.copy(f"{B}/quizzes.json", f"{OUT}/quizzes.json")
print("interactive exercise items:", exercises, "| missing txt:", missing)
