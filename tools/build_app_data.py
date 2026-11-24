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
THEORY = json.load(open("build/theory.json"))   # from tools/build_theory.py

def read_answer(rel):
    path = os.path.join("legacy", rel)
    if not os.path.exists(path):
        dd, f = os.path.split(path)
        m = [x for x in os.listdir(dd) if x.lower() == f.lower()] if os.path.isdir(dd) else []
        if not m: return None
        path = os.path.join(dd, m[0])
    raw = open(path, "rb").read()
    try: t = raw.decode("utf-8")
    except UnicodeDecodeError: t = raw.decode("cp1252")
    return unicodedata.normalize("NFC", t.replace("\r\n", "\n").replace("\r", "\n")).strip()

def plain_block(b):
    if b["t"] in ("p", "h2", "h3", "li"): return "".join(r["x"] for r in b["runs"])
    if b["t"] in ("grid", "table"): return " · ".join("".join(r["x"] for r in (c or [])) for row in b["rows"] for c in row)
    if b["t"] == "idiom": return f'{b["idiom"]}: {b["meaning"]} {b["example"]}'
    if b["t"] == "drill": return b["prompt"]
    if b["t"] == "reveal": return b["prompt"]
    return ""

os.makedirs(f"{OUT}/lessons", exist_ok=True)
for f in os.listdir(f"{OUT}/lessons"): os.remove(f"{OUT}/lessons/{f}")
lessons, search, page_lesson, quiz_lessons = [], [], {}, {}
for i, s in enumerate(starts):
    end = (starts[i + 1]["page"] - 1) if i + 1 < len(starts) else 206
    end = max(end, s["page"])
    m = re.match(r"^([IVXLC]+)\s*\.\s*(.*)$", s["title"])
    num, name = (m.group(1), m.group(2)) if m else ("", s["title"])
    clean = lambda x: re.sub(r"\s*\(.*?\)\s*\.?$", "", x).strip(" .:")
    cap = lambda x: x[:1].upper() + x[1:].lower() if x.upper() == x else x
    name = " · ".join(cap(clean(x)) for x in [name] + s.get("also", []))
    lid = slug((num + "-" if num else "") + name)[:60]
    blocks, drills, qids = [], 0, []
    for n in range(s["page"], end + 1):
        page_lesson[n] = lid
        items = {it["n"]: it for it in pages[n]["items"]}
        blocks.append({"t": "page", "n": n})
        for b in THEORY[str(n)]:
            if b["t"] == "drill":
                it = items.get(b["n"])
                if not it: continue
                b = {"t": "drill", "page": n, "n": it["n"], "prompt": it["prompt"], "formula": it["formula"],
                     "hl": it["highlight"], "audio": it.get("audio"),
                     "answers": [a["text"] for a in it.get("answers", []) if a["text"]]}
                drills += 1
            elif b["t"] == "reveal":
                txt = read_answer(b["file"])
                if not txt: continue
                prompt = b["prompt"]
                prev = blocks[-1] if blocks else None
                if not prompt and prev and prev["t"] == "li" and re.fullmatch(r"[A-C]\.", prev.get("mark", "")):
                    # "C. Si yo hubiera sabido…" followed by its answer box: merge them into one card
                    prompt = prev["mark"] + " " + "".join(r["x"] for r in prev["runs"]); blocks.pop()
                if not prompt:   # e.g. CONDICIONALES/3B.txt -> "Frase 3, forma B"
                    m2 = re.search(r"(\d+)([A-C])\d*\.txt$", b["file"], re.I)
                    prompt = f"Frase {m2.group(1)}, forma {m2.group(2).upper()}: tradúzcala y compare" if m2 else ""
                b = {"t": "reveal", "key": slug(b["file"]), "prompt": prompt, "answer": txt}
            elif b["t"] == "quiz":
                qid = quiz_for(b["file"])
                if not qid or qid in qids: continue
                qids.append(qid); quiz_lessons.setdefault(qid, []).append(lid)
                b = {"t": "quiz", "id": qid}
            blocks.append(b)
            txt = plain_block(b).strip()
            if txt and b["t"] != "page": search.append([lid, n, txt[:400]])
    stage = next(st[0] for st in STAGES if st[3] <= s["page"] <= st[4])
    json.dump(blocks, open(f"{OUT}/lessons/{lid}.json", "w"), ensure_ascii=False)
    lessons.append({"id": lid, "num": num, "title": name, "stage": stage, "subs": [x.capitalize() for x in s["subs"]],
                    "first": s["page"], "last": end, "drills": drills, "quizzes": qids,
                    "audio": sum(1 for b in blocks if b["t"] == "drill" and b.get("audio")),
                    "audioPage": next((b["page"] for b in blocks if b["t"] == "drill" and b.get("audio")), None),
                    "drillKeys": [f'{b["page"]}-{b["n"]}' for b in blocks if b["t"] == "drill"]})

# Quizzes: clear names, a sort order, and the lessons that teach their topic
def nice(q):
    m = re.match(r"evaluation-(\d+)$", q["id"])
    if m: return f"Evaluación general {m.group(1)}", 100 + int(m.group(1))
    names = {"evaluacion-basica": ("Evaluación básica (prueba de nivel)", 1), "evaluacion-avanzada": ("Evaluación avanzada", 200),
             "la-hora-de-la-verdad": ("La hora de la verdad", 300)}
    if q["id"] in names: return names[q["id"]]
    m = re.match(r"ordene-(\d+)$", q["id"])
    if m: return f"Ordene la frase {m.group(1)}", 400 + int(m.group(1))
    return q["title"], 500
# Which lesson teaches each quiz's topic (hand-checked; values are lesson-id prefixes).
TOPIC = {
 "a-little-a-few": "xxx-", "adjetivo-verbo": "ix-", "adjetivos-preposiciones": "lista-de-verbos-con-prep",
 "altough-though": "xlv-", "another-the-other": "liii-", "any-longer": "il-", "verbos-irregulares": "x-conj",
 "verbos-regulares": "x-conj", "articulos-indefinidos": "iii-", "as-o-like": "liii-", "uso-basico-de-auxiliares": "xii-",
 "comparaciones-de-adjetivos": "xx-", "comparacion-de-sustantivos": "xx-", "conjunciones": "xxv-",
 "either-neither": "il-", "enfatizacion": "xxxiii-", "for-since": "xlvii-", "forma-especial-del-sustantivo": "xxviii-",
 "formas-del-infinitivo": "xli-", "frases-condicionales": "xxi-", "grados-de-obligatoriedad": "xix-",
 "interpretacion-de-los-doce": "xv-", "interpretacion-de-los-tres": "xv-", "modismos": "xl-",
 "omision-del-articulo": "iii-", "plurales-irregulares": "iv-", "pronombres-indefinidos": "vi-",
 "pronombres-personales": "vi-", "pronombres-posesivos": "vi-", "pronombres-reflexivos": "xxvii-",
 "reported-speech": "liii-", "some-any": "xxxi-", "still-jet": "xxxvii-", "subjuntivo": "xliii-",
 "sujeto-verbo-pronombres": "il-", "tag-questions": "xxxvi-", "there-is": "il-", "make-do": "liii-",
 "ubicacion-de-adverbios": "xxxviii-", "uso-avanzado-de-los-auxiliares": "lii-", "uso-de-preposiciones": "xxiv-",
 "verbo-preposiciones": "lista-de-verbos-con-prep", "verbo-to-pronombres": "xxxi-", "verbo-verbo-en-continuo": "xxviii-",
 "verbo-adjetivo-adverbio": "ix-", "voz-pasiva": "xxvi-", "ordene-": "xvi-",
}
strip_acc = lambda x: unicodedata.normalize("NFKD", x).encode("ascii", "ignore").decode()
words = lambda x: {w for w in re.findall(r"[a-z]{4,}", strip_acc(x.lower())) if w not in {"para", "como", "verbo", "verbos", "frase", "frases", "con", "uso", "usos", "de", "los", "las"}}
for q in quizzes:
    q["title"], q["order"] = nice(q)
    q["title"] = re.sub(r'\s*"\s*', " ", q["title"]).replace(" )", ")").strip()
    key = next((k for k in TOPIC if q["id"].startswith(k)), None)
    ls = [l["id"] for l in lessons if key and l["id"].startswith(TOPIC[key])][:1]
    q["lessons"] = ls
    for l in lessons:   # the topic lesson also offers the quiz ("Practique este tema")
        if l["id"] in ls and q["id"] not in l["quizzes"]: l.setdefault("extra", []).append(q["id"])
quizzes.sort(key=lambda q: (q["order"], q["title"]))

PLACEMENT = ["evaluacion-basica", "la-hora-de-la-verdad", "evaluacion-avanzada"]
data = {"stages": [{"id": a, "title": b, "desc": c} for a, b, c, *_ in STAGES], "lessons": lessons,
        "pageLesson": page_lesson, "placement": [p for p in PLACEMENT if any(q["id"] == p for q in quizzes)]}
json.dump(data, open(f"{OUT}/course.json", "w"), ensure_ascii=False)
json.dump(quizzes, open(f"{OUT}/quizzes.json", "w"), ensure_ascii=False)
json.dump(search, open(f"{OUT}/search.json", "w"), ensure_ascii=False)
v = json.load(open("content/voice.json"))
voice = {"right": [x for x in v["DefaultRight"] if not x.isupper() and "Great" not in x],
         "wrong": [x for x in v["DefaultWrong"] if not x.isupper() and "verbos" not in x]}
json.dump(voice, open(f"{OUT}/voice.json", "w"), ensure_ascii=False)
print(len(lessons), "lessons;", sum(l["drills"] for l in lessons), "drills;", len(quizzes), "quizzes;",
      sum(1 for q in quizzes if q["lessons"]), "quizzes linked to lessons;", len(search), "search entries")
print([(q["title"], q["lessons"]) for q in quizzes if not q["lessons"]])

# ---- Manual tab: interactive overlay for the original pages (from tools/build_manual.py) ----
RAW = json.load(open("build/manual_raw.json"))
audio_files = set(os.listdir("app/public/audio"))
manual, unresolved = {}, []
for n, items in RAW.items():
    out = []
    for it in items:
        k, r = it["k"], it["r"]
        if k == "audio":
            if f'{it["a"]}.mp3' in audio_files: out.append({"k": "audio", "r": r, "src": f'audio/{it["a"]}.mp3'})
        elif k == "goto":
            out.append({"k": "goto", "r": r, "p": it["p"]})
        elif k == "url":
            out.append({"k": "url", "r": r, "u": it["u"]})
        elif k == "file":
            # PDF string escapes: \( \) and octal (\321 = Ñ in Windows-1252)
            f = re.sub(r"\\([0-7]{3})", lambda m: bytes([int(m.group(1), 8)]).decode("cp1252"), it["f"])
            f = re.sub(r"\\([()\\])", r"\1", f)
            if re.match(r"^(www\.|https?://)", f):
                out.append({"k": "url", "r": r, "u": f if f.startswith("http") else "http://" + f}); continue
            low = f.lower()
            if low.endswith(".txt"):
                txt = read_answer(f)
                if txt: out.append({"k": "answer", "r": r, "t": txt}); continue
            if "men" in low and "principal" in low:
                out.append({"k": "nav", "r": r, "to": "ejercicios", "label": "Menú de ejercicios"}); continue
            qid = quiz_for(f)
            if qid and qid in {q["id"] for q in quizzes}:
                out.append({"k": "quiz", "r": r, "id": qid, "label": next(q["title"] for q in quizzes if q["id"] == qid)}); continue
            unresolved.append((n, f))
    manual[n] = out
toc = [{"title": re.sub(r"\s+", " ", t["title"]).strip(), "page": t["page"], "level": t["level"]}
       for t in C["toc"] if t["page"] > 0 and t["level"] <= 2]
json.dump({"pages": manual, "toc": toc}, open(f"{OUT}/manual.json", "w"), ensure_ascii=False)
from collections import Counter
print("manual overlay:", dict(Counter(i["k"] for v in manual.values() for i in v)), "unresolved:", unresolved)
