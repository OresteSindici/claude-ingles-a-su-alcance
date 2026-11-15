import json, base64
c = json.load(open("content/course.json"))
items = [i for i in [p for p in c["pages"] if p["page"] == 32][0]["items"] if i.get("audio")]
data = []
for i in items:
    data.append({"n": i["n"], "prompt": i["prompt"], "formula": i["formula"], "hl": i["highlight"],
                 "answer": i["answers"][0]["text"],
                 "audio": "data:audio/mpeg;base64," + base64.b64encode(open("content/" + i["audio"], "rb").read()).decode()})
tpl = open("prototype/template.html").read()
open("prototype/leccion-demo.html", "w").write(tpl.replace("/*DATA*/[]", json.dumps(data, ensure_ascii=False)))
print(len(data), "items")
