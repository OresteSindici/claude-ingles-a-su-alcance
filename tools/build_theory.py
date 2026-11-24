"""Convert the manual's PDF pages into structured, readable text blocks for the app.

For every page it produces a list of blocks in reading order:
  {"t": "h2"|"h3", "runs": [...]}          headings (red chapter titles, bold uppercase sub-titles)
  {"t": "p", "runs": [...]}                 paragraphs (lines merged)
  {"t": "li", "runs": [...], "mark": "•"}   bullet / lettered / numbered items
  {"t": "grid", "rows": [[runs, ...], ...]} side-by-side columns (word lists, examples)
  {"t": "table", "rows": [[runs, ...], ...]} ruled tables
  {"t": "drill", "n": 42}                   a practice sentence from the course (rendered by the app)
  {"t": "quiz", "file": "..."}              a link to an interactive exercise
A run is {"x": text, "b": bold, "i": italic, "c": "aux"|"red"|"blue"|None}.

usage: python3 tools/build_theory.py   (reads legacy/ PDF and build/pdf_structure.json, writes build/theory.json)
"""
import json, re
import pymupdf as fitz

PDF = "legacy/MANUAL INGLÉS A SU ALCANCE.pdf"
d = fitz.open(PDF)
struct = {p["page"]: p for p in json.load(open("build/pdf_structure.json"))["pages"]}

def colour(c):
    r, g, b = c >> 16, (c >> 8) & 255, c & 255
    if (r, g, b) in ((0, 128, 128), (0, 128, 129)) or (r < 60 and 100 < g < 170 and 100 < b < 170): return "aux"   # teal: the "21"
    if r > 180 and g < 80 and b < 80: return "red"
    if b > 150 and r < 120: return "blue"
    if g > 120 and r < 100 and b < 120: return "green"
    return None

def runs_of(spans):
    out = []
    for s in spans:
        t = s["text"]
        if s["color"] == 0xFFFFFF or "AmericanaBT" in s["font"]: continue
        if s["size"] < 8 and t.strip().isdigit(): continue   # footnote reference numbers
        st = {"b": bool(s["flags"] & 16) or "Bold" in s["font"] or s["font"].endswith(","), "i": bool(s["flags"] & 2), "c": colour(s["color"])}
        if not t.strip(): st = {"b": False, "i": False, "c": None}
        if s["font"].startswith("Symbol") and t.strip() in ("•", "·", ""): t = "•"
        if out and {k: out[-1][k] for k in ("b", "i", "c")} == st: out[-1]["x"] += t
        else: out.append({"x": t, **st})
    # tidy whitespace, drop empty runs
    for r in out: r["x"] = re.sub(r"_{4,}", "____", re.sub(r"\s+", " ", r["x"]))   # paper answer lines
    out = [r for r in out if r["x"]]
    if out: out[0]["x"] = out[0]["x"].lstrip(); out[-1]["x"] = out[-1]["x"].rstrip()
    return [r for r in out if r["x"]]

plain = lambda runs: "".join(r["x"] for r in runs).strip()
def join_all(row):
    rs = []
    for l in row: rs = join_runs(rs, l["runs"])
    return rs

def join_runs(a, b):
    if not a: return b
    if not b: return a
    a = [dict(r) for r in a]; b = [dict(r) for r in b]
    if not a[-1]["x"].endswith((" ", "-")) and not b[0]["x"].startswith(" "): a[-1]["x"] += " "
    if {k: a[-1][k] for k in "bic"} == {k: b[0][k] for k in "bic"}:
        a[-1]["x"] += b[0]["x"]; return a + b[1:]
    return a + b

BULLET = re.compile(r"^(•|[A-Z]\.|\d{1,2}\.|[a-z]\))\s*")

def page_blocks(n):
    p = d[n - 1]
    st = struct[n]
    tables = [t for t in p.find_tables().tables if t.row_count >= 2 and t.col_count >= 2]
    drill_ys = {round(it["y"]): it["n"] for it in st["items"] if it.get("audio") or it.get("answers")}
    # the 2002 answer boxes line up like a grid; never treat a block of practice sentences as a table
    answer_ys = [a["y"] for a in st["answers"]] + list(drill_ys)
    tables = [t for t in tables if not any(t.bbox[1] - 4 <= y <= t.bbox[3] + 4 for y in answer_ys)]
    tboxes = [fitz.Rect(t.bbox) for t in tables]
    quiz_marks = [(a["y"], a["file"]) for a in st["answers"] if not a["file"].lower().endswith(".txt")]
    # answer boxes that are not tied to a numbered sentence (conditionals A/B/C, tag questions, two columns)
    loose = [a for a in st["answers"] if a["file"].lower().endswith(".txt") and "item" not in a]

    # 1. visual rows: lines grouped by baseline
    lines = []
    for b in p.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            r = fitz.Rect(l["bbox"])
            if r.y0 > 700 or any(tb.intersects(r) and tb.contains(fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)) for tb in tboxes):
                continue
            rs = runs_of(l["spans"])
            if not plain(rs) or re.fullmatch(r"[_\s.]+", plain(rs)): continue
            lines.append({"x": r.x0, "x1": r.x1, "y": r.y0, "y1": r.y1, "runs": rs, "size": max(s["size"] for s in l["spans"])})
    lines.sort(key=lambda l: (round(l["y"] / 4), l["x"]))
    rows = []
    for l in lines:
        if rows and abs(rows[-1][0]["y"] - l["y"]) < 4: rows[-1].append(l)
        else: rows.append([l])
    for r in rows: r.sort(key=lambda l: l["x"])

    # 2. events in vertical order: rows, tables, quiz links
    events = [("row", r[0]["y"], r) for r in rows]
    events += [("table", t.bbox[1], t) for t in tables]
    events += [("quiz", y + 0.5, f) for y, f in quiz_marks]
    events.sort(key=lambda e: e[1])

    blocks, used_drills = [], set()
    def push(b): blocks.append(b)
    for kind, y, obj in events:
        if kind == "quiz":
            push({"t": "quiz", "file": obj}); continue
        if kind == "table":
            rows_out = []
            for row in obj.rows:
                cells = []
                for c in row.cells:
                    if c is None: cells.append(None); continue
                    cr = fitz.Rect(c)
                    spans = [s for b in p.get_text("dict", clip=cr)["blocks"] for l in b.get("lines", []) for s in l["spans"]]
                    rs, last_y = [], None
                    for b in p.get_text("dict", clip=cr)["blocks"]:
                        for l in b.get("lines", []):
                            rs = join_runs(rs, runs_of(l["spans"]))
                    cells.append(rs)
                if any(c and plain(c) for c in cells): rows_out.append(cells)
            if rows_out: push({"t": "table", "rows": rows_out})
            continue
        row = obj
        text = plain(row[0]["runs"])
        if re.match(r"^(Haga click en|Compare sus respuestas|Requerimiento:)", text): continue
        mine = [a for a in loose if abs(a["y"] - y) < 8]
        if mine:
            for a in sorted(mine, key=lambda a: a["x"]):
                loose.remove(a)
                left = [l for l in row if l["x"] < a["x"]] or row
                cell = plain(max(left, key=lambda l: l["x"])["runs"]) if len(row) > 1 else plain(join_all(row))
                prompt = re.sub(r"_{2,}", "____", cell).strip()
                push({"t": "reveal", "prompt": prompt if re.sub(r"[\s_.A-C0-9]", "", prompt) else "", "file": a["file"]})
            continue
        # a practice sentence from the course?
        dn = next((drill_ys[k] for k in drill_ys if abs(k - y) < 6), None)
        if dn is not None and re.match(rf"^{dn}\s*\.", text):
            if dn not in used_drills: push({"t": "drill", "n": dn}); used_drills.add(dn)
            continue
        if len(row) > 1 and (row[1]["x"] - row[0]["x1"]) > 18:
            cells = [l["runs"] for l in row]
            if blocks and blocks[-1]["t"] == "grid": blocks[-1]["rows"].append(cells)
            else: push({"t": "grid", "rows": [cells]})
            continue
        rs = row[0]["runs"]
        for extra in row[1:]: rs = join_runs(rs, extra["runs"])
        text = plain(rs)
        allbold = all(r["b"] for r in rs if r["x"].strip())
        red = any(r["c"] == "red" for r in rs[:2])
        if re.match(r"^[IVXLC]+\s*\.", text) and (allbold or red):
            push({"t": "h2", "runs": rs}); continue
        if allbold and text.upper() == text and len(text) < 90 and not BULLET.match(text):
            push({"t": "h3", "runs": rs}); continue
        if re.fullmatch(r"(\d+\s*)?[A-C]\.\s*[_\s.]*", text): continue
        m = BULLET.match(text)
        if m:
            mark = m.group(1)
            # strip the marker from the first run
            first = dict(rs[0]); first["x"] = first["x"][len(m.group(0)):] if first["x"].startswith(m.group(0).strip()) else first["x"].lstrip("•").lstrip()
            body = ([first] if first["x"] else []) + rs[1:]
            if mark == "•" and not plain(body): push({"t": "li", "mark": "•", "runs": [], "_x": row[0]["x"], "_y1": row[0]["y1"]}); continue
            push({"t": "li", "mark": mark, "runs": body, "_x": row[0]["x"], "_y1": row[0]["y1"]}); continue
        prev = blocks[-1] if blocks else None
        gap = (y - prev["_y1"]) if prev and "_y1" in prev else 99
        if prev and prev["t"] in ("p", "li") and gap < 7 and not text[:1].isdigit():
            prev["runs"] = join_runs(prev["runs"], rs); prev["_y1"] = row[0]["y1"]; continue
        push({"t": "p", "runs": rs, "_y1": row[0]["y1"]})
        if blocks[-1]["t"] == "p": blocks[-1]["_y1"] = row[0]["y1"]
    for b in blocks:
        if b["t"] in ("li",) and "_y1" not in b: pass
    # empty bullets get the following paragraph
    out = []
    for b in blocks:
        if out and out[-1]["t"] == "li" and not out[-1]["runs"] and b["t"] in ("p", "li"):
            out[-1]["runs"] = b["runs"]; continue
        out.append(b)
    for b in out:
        b.pop("_y1", None); b.pop("_x", None)
    return out

# li blocks must also track _y1 for continuation lines
_orig = page_blocks
def idiom_blocks(n):
    t = d[n - 1].get_text()
    t = re.sub(r"PROGRAMA DISEÑADO.*?DETENCIÓN", " ", t, flags=re.S)
    parts = re.split(r"IDIOM:", t)
    out = []
    intro = re.sub(r"\s+", " ", parts[0]).strip()
    if intro: out.append({"t": "p", "runs": [{"x": intro, "b": False, "i": False, "c": None}]})
    for part in parts[1:]:
        m = re.match(r"(.*?)SIGNIFICADO:(.*?)(?:EJEMPLO:(.*))?$", part, re.S)
        if not m: continue
        cl = lambda x: re.sub(r"\s+", " ", x or "").strip()
        out.append({"t": "idiom", "idiom": cl(m.group(1)), "meaning": cl(m.group(2)), "example": cl(m.group(3))})
    return out

pages = {}
for n in range(1, d.page_count + 1):
    try:
        pages[n] = idiom_blocks(n) if 150 <= n <= 171 else page_blocks(n)
    except Exception as e:  # never lose a page: fall back to the image only
        print("page", n, "failed:", e); pages[n] = []
json.dump(pages, open("build/theory.json", "w"), ensure_ascii=False)
kinds = {}
for bl in pages.values():
    for b in bl: kinds[b["t"]] = kinds.get(b["t"], 0) + 1
print(kinds)
