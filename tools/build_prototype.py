import json, base64
b64 = lambda p, mime: f"data:{mime};base64," + base64.b64encode(open(p, "rb").read()).decode()
c = json.load(open("content/course.json"))
items = [i for i in [p for p in c["pages"] if p["page"] == 32][0]["items"] if i.get("audio")]
data = [{"n": i["n"], "prompt": i["prompt"], "formula": i["formula"], "hl": i["highlight"],
         "answer": i["answers"][0]["text"], "audio": b64("content/" + i["audio"], "audio/mpeg")} for i in items]
voice = json.load(open("content/voice.json"))
# keep only Spanish lines for the in-app voice
voice = {k: [v for v in voice.get(k, []) if not v.isupper() and "Great job" not in v and "verbos" not in v] for k in ("DefaultRight", "DefaultWrong")}
voice["DefaultRight"] = [v for v in voice["DefaultRight"] if v not in ("Exacto!", "Bingo")] + ["Exacto!"]
h = json.load(open("content/homenaje/textos.json"))
letters = [{"titulo": s["titulo"], "texto": s["texto"],
            "img": b64("content/homenaje/" + s["imagen"], "image/jpeg") if s.get("imagen") and s["imagen"] != "tc-payan.jpg" else None}
           for s in h["secciones"]]
tpl = open("prototype/template.html").read()
out = (tpl.replace("/*DATA*/[]", json.dumps(data, ensure_ascii=False))
          .replace("/*VOICE*/{}", json.dumps(voice, ensure_ascii=False))
          .replace("/*LETTERS*/[]", json.dumps(letters, ensure_ascii=False))
          .replace("__PORTRAIT__", b64("content/homenaje/tc-payan.jpg", "image/jpeg")))
open("prototype/leccion-demo.html", "w").write(out)
print(len(data), "items;", voice)
