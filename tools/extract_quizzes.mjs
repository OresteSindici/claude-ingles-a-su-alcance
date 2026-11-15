// Extract Hot Potatoes quizzes (JQuiz multiple choice, JMix sentence ordering, JCloze gap-fill)
// usage: node extract_quizzes.mjs <Ejercicios Internet dir> <out.json>
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const [dir, out] = process.argv.slice(2);
const dec = new TextDecoder("windows-1252");
const ent = (s) => String(s ?? "").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/[ \t]+/g, " ").trim();
const quizzes = [];
for (const f of fs.readdirSync(dir).filter((f) => /\.html?$/i.test(f)).sort()) {
  const html = dec.decode(fs.readFileSync(path.join(dir, f)));
  const title = ent((html.match(/<title>([\s\S]*?)<\/title>/i) || [, ""])[1]).replace(/^"|"$/g, "");
  const lines = html.split(/\r?\n/);
  const pick = (re) => lines.filter((l) => re.test(l)).join("\n");
  const ctx = {};
  if (/<td class="LeftItem">/.test(html)) {
    // JMatch: select id "s<row>_<key>", the correct option has value == key
    const options = {};
    const pairs = [...html.matchAll(/<td class="LeftItem">([\s\S]*?)<\/td><td class="RightItem"><select id="s\d+_(\d+)">([\s\S]*?)<\/select>/g)].map((m) => {
      for (const o of m[3].matchAll(/<option value="(\d+)">([\s\S]*?)<\/option>/g)) options[o[1]] = ent(o[2]);
      return { left: ent(m[1]), key: m[2] };
    });
    quizzes.push({ id: f, type: "matching", title, pairs: pairs.map((p) => ({ left: p.left, right: options[p.key] })) });
  } else if (/^I\[0\]\[1\]/m.test(html)) {
    vm.runInNewContext("var I=[];" + pick(/^I\[\d+\]/), ctx);
    // JQuiz v6 keeps the question text in the HTML (div.QuestionText) and options in I[n][3]
    const qTexts = [...html.matchAll(/<(?:p|div) class="QuestionText"[^>]*>([\s\S]*?)<\/(?:p|div)>/gi)].map((m) => ent(m[1]));
    quizzes.push({ id: f, type: "multiple-choice", title, questions: ctx.I.map((q, i) => {
      const v6 = Array.isArray(q[3]);
      const opts = v6 ? q[3] : q[1];
      return { question: v6 ? qTexts[i] ?? "" : ent(q[0]),
        options: opts.map((o) => ({ text: ent(o[0]), feedback: ent(o[1] || ""), correct: o[2] === 1 })) };
    }) });
  } else if (/var Segments/.test(html)) {
    vm.runInNewContext("var Segments=[];var Answers=[];" + pick(/^(Segments|Answers)\[\d+\]/), ctx);
    const words = ctx.Segments.map((s) => s[0]);
    quizzes.push({ id: f, type: "sentence-order", title, segments: words,
      // Segments[i][1] is the segment's id; Answers lists ids in the correct order
      answers: ctx.Answers.map((a) => a.map((id) => ctx.Segments.find((sg) => sg[1] === id)[0]).join(" ")) });
  } else {
    quizzes.push({ id: f, type: "page", title, text: ent(html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")).slice(0, 4000) });
  }
}
fs.writeFileSync(out, JSON.stringify(quizzes, null, 1));
const c = {}; quizzes.forEach((q) => (c[q.type] = (c[q.type] || 0) + 1));
console.log(c, "MC questions:", quizzes.filter((q) => q.questions).reduce((n, q) => n + q.questions.length, 0));
