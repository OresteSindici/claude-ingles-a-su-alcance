"""Build the app's data files from content/ into app/public/data (+ audio).
usage: python3 tools/build_app_data.py"""
import json, os, re, shutil, unicodedata, urllib.parse
C = json.load(open("content/course.json"))
Q = json.load(open("content/quizzes.json"))
OUT = "app/public/data"; os.makedirs(OUT, exist_ok=True)
shutil.copytree("content/audio", "app/public/audio", dirs_exist_ok=True)

norm = lambda s: re.sub(r"\s+", " ", unicodedata.normalize("NFC", s)).strip().lower()
def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

# ---- quizzes ----
SKIP = {"MENÚ PRINCIPAL E6.htm", "EJERCICIOS EN INGLÉS E6.htm",
        "HOW + ADJETIVO-ADVERBIO.html"}  # menus + third-party quiz (Vera Mello, I-TESL-J)
quizzes, by_file, QIDS = [], {}, []
for q in Q:
    if unicodedata.normalize("NFC", q["id"]) in {unicodedata.normalize("NFC", s) for s in SKIP}: continue
    base = re.sub(r"\.html?$", "", q["id"])
    title = q["title"] or base
    title = re.sub(r"^E6\s+", "", title).strip(' ".')
    if q["type"] == "sentence-order": title = f"Ordene la frase {base}"
    qid = slug(re.sub(r"^E6\s+", "", base)) or slug(base)
    if q["type"] == "sentence-order": qid = f"ordene-{base}"
    item = {k: v for k, v in q.items() if k not in ("id", "title")}
    item.update(id=qid, title=title.strip().capitalize() if title.isupper() else title.strip())
    if item["type"] == "page": continue  # menus and the "respuestas cortas" page need a manual rewrite
    quizzes.append(item); by_file[norm(q["id"])] = qid; QIDS.append(qid)
def quiz_for(target):
    # PDF strings keep accented letters as octal escapes (\323 = Ó in Windows-1252)
    target = re.sub(r"\\([0-7]{3})", lambda m: bytes([int(m.group(1), 8)]).decode("cp1252"), target)
    f = norm(urllib.parse.unquote(target).replace("\\", "/").split("/")[-1])
    f = f.replace("\\(", "(").replace("\\)", ")")
    if f in by_file: return by_file[f]
    for k, v in by_file.items():  # targets sometimes lack the ".htm" ending
        if k.startswith(f.rstrip(")").rstrip()): return v
    sl = slug(re.sub(r"^e6\s+|\.(html?|pps)$", "", f))  # older file names used in the PDF
    return sl if sl in QIDS else None

# ---- stages & lessons from the manual's table of contents ----
toc = [t for t in C["toc"] if t["level"] == 1 and t["page"] > 0]
STAGES = [("primera-etapa", "Primera etapa", "Las bases: oración, verbo, los 21 y las 5 fórmulas", 1, 48),
          ("segunda-etapa", "Segunda etapa", "Condicionales, continuo, preposiciones y tag questions", 49, 88),
          ("nivel-avanzado", "Nivel avanzado", "Adverbios, modismos, subjuntivo y reported speech", 89, 149),
          ("referencia", "Listas de referencia", "Idioms, phrasal verbs y preposiciones", 150, 206)]
starts = []
for t in toc:
    title = re.sub(r"\s+", " ", t["title"]).strip()
    is_main = bool(re.match(r"^[IVXLC]+\s*\.", title)) or title.startswith("LISTA")
    if is_main and (not starts or starts[-1]["page"] != t["page"]):
        starts.append({"page": t["page"], "title": title, "subs": [], "also": []})
    elif is_main:  # two chapters begin on the same page: show both names
        starts[-1]["also"].append(re.sub(r"^[IVXLC]+\s*\.\s*", "", title))
    elif starts:
        starts[-1]["subs"].append(title)
    else:
        starts.append({"page": t["page"], "title": title, "subs": [], "also": []})
starts[0]["page"] = 1  # include the cover/intro pages in the first lesson
pages = {p["page"]: p for p in C["pages"]}
lessons = []
for i, s in enumerate(starts):
    end = (starts[i + 1]["page"] - 1) if i + 1 < len(starts) else 206
    end = max(end, s["page"])
    m = re.match(r"^([IVXLC]+)\s*\.\s*(.*)$", s["title"])
    num, name = (m.group(1), m.group(2)) if m else ("", s["title"])
    clean = lambda x: re.sub(r"\s*\(.*?\)\s*\.?$", "", x).strip(" .:")
    cap = lambda x: x[:1].upper() + x[1:].lower() if x.upper() == x else x
    name = " · ".join(cap(clean(x)) for x in [name] + s.get("also", []))
    lp = []
    for n in range(s["page"], end + 1):
        p = pages[n]
        items = [it for it in p["items"] if it.get("audio") or it.get("answers")]
        links = []
        targets = [l["target"] for l in p["links"] if "target" in l] + \
                  [f for f in p.get("unmatchedAnswers", []) if not f.lower().endswith(".txt")]
        for t in targets:
            if True:
                qid = quiz_for(t)
                if qid and qid not in [x["quiz"] for x in links]: links.append({"quiz": qid})
        lp.append({"n": n, "items": [{"n": it["n"], "prompt": it["prompt"], "formula": it["formula"],
                                      "hl": it["highlight"], "audio": it.get("audio"),
                                      "answers": [a["text"] for a in it.get("answers", [])]} for it in items],
                   "quizzes": links})
    stage = next(st[0] for st in STAGES if st[3] <= s["page"] <= st[4])
    lessons.append({"id": slug((num + "-" if num else "") + name)[:60], "num": num, "title": name,
                    "stage": stage, "subs": [x.capitalize() for x in s["subs"]], "pages": lp})

PLACEMENT = ["evaluacion-basica", "la-hora-de-la-verdad", "evaluacion-avanzada"]
data = {"stages": [{"id": a, "title": b, "desc": c} for a, b, c, *_ in STAGES],
        "lessons": lessons, "placement": [p for p in PLACEMENT if any(q["id"] == p for q in quizzes)]}
json.dump(data, open(f"{OUT}/course.json", "w"), ensure_ascii=False)
json.dump(quizzes, open(f"{OUT}/quizzes.json", "w"), ensure_ascii=False)
v = json.load(open("content/voice.json"))
voice = {"right": [x for x in v["DefaultRight"] if not x.isupper() and "Great" not in x],
         "wrong": [x for x in v["DefaultWrong"] if not x.isupper() and "verbos" not in x]}
json.dump(voice, open(f"{OUT}/voice.json", "w"), ensure_ascii=False)
linked = {l["quiz"] for ls in lessons for p in ls["pages"] for l in p["quizzes"]}
print(len(lessons), "lessons;", sum(len(p["items"]) for ls in lessons for p in ls["pages"]), "drill items;",
      len(quizzes), "quizzes;", len(linked), "linked from lessons; placement:", data["placement"])
print([q["id"] for q in quizzes][:200])
