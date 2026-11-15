import { useMemo, useState, type ReactNode } from "react";
import type { AllData, Quiz } from "../data";
import { update, PASS } from "../progress";
import { Coronel, useLine } from "../voice";

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const clean = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function save(id: string, correct: number, total: number) {
  update((s) => {
    const prev = s.quizzes[id];
    const best = prev && prev.best / prev.total >= correct / total ? prev : { best: correct, total };
    return { ...s, quizzes: { ...s.quizzes, [id]: best } };
  });
}

// "Ver página 9" in the 2002 feedback becomes a link to the lesson that covers page 9.
function FeedbackText({ text, data }: { text: string; data: AllData }) {
  const parts = text.split(/(p[aá]gina\s*\d+)/i);
  return <>{parts.map((p, i) => {
    const m = p.match(/(\d+)/);
    const lid = m && /p[aá]gina/i.test(p) ? data.course.pageLesson[m[1]] : null;
    return lid ? <a key={i} href={`#/leccion/${lid}/p/${m![1]}`}>{p}</a> : p;
  })}</>;
}

function ReviewLinks({ quiz, data }: { quiz: Quiz; data: AllData }) {
  const ls = quiz.lessons.map((id) => data.course.lessons.find((l) => l.id === id)).filter(Boolean);
  if (!ls.length) return null;
  return <div className="review"><span className="eyebrow">Repasar en el curso</span>
    {ls.map((l) => <a key={l!.id} href={`#/leccion/${l!.id}`}>{l!.num ? `${l!.num}. ` : ""}{l!.title}</a>)}</div>;
}

function Result({ quiz, data, correct, total, onRetry, onDone }: { quiz: Quiz; data: AllData; correct: number; total: number; onRetry: () => void; onDone: () => void }) {
  const pct = Math.round((100 * correct) / total);
  const line = useLine();
  const said = useMemo(() => line(pct / 100 >= PASS), []); // eslint-disable-line react-hooks/exhaustive-deps
  let advice: ReactNode = null;
  if (data.course.placement.includes(quiz.id)) {
    const stage = pct < 40 ? data.course.stages[0] : pct < 70 ? data.course.stages[1] : data.course.stages[2];
    advice = <p>Le recomendamos empezar por <a href={`#/etapa/${stage.id}`}><b>{stage.title}</b></a>.</p>;
  }
  return (
    <div className="result">
      <div className="eyebrow">Su puntaje es</div>
      <div className="score">{pct}%</div>
      <p>{correct} de {total} correctas. {pct / 100 >= PASS ? "Misión cumplida: +10 puntos para su rango." : "Necesita 70% para aprobar y sumar puntos."}</p>
      {advice}
      <Coronel text={said} ok={pct / 100 >= PASS} />
      <ReviewLinks quiz={quiz} data={data} />
      <div className="actions"><button className="primary" onClick={onDone}>Continuar</button><button className="ghost" onClick={onRetry}>Repetir</button></div>
    </div>
  );
}

function MultipleChoice({ quiz, data, onDone }: { quiz: Extract<Quiz, { type: "multiple-choice" }>; data: AllData; onDone: () => void }) {
  const line = useLine();
  const [run, setRun] = useState(0);
  const qs = useMemo(() => quiz.questions.map((q) => ({ ...q, options: shuffle(q.options) })), [quiz, run]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [said, setSaid] = useState("");
  const [score, setScore] = useState(0);
  const q = qs[i];
  if (i >= qs.length) return <Result quiz={quiz} data={data} correct={score} total={qs.length} onDone={onDone} onRetry={() => { setRun(run + 1); setI(0); setScore(0); setPicked(null); }} />;
  const choose = (k: number) => {
    if (picked !== null) return;
    const ok = q.options[k].correct;
    setPicked(k); setSaid(line(ok)); if (ok) setScore(score + 1);
  };
  const next = () => { const n = i + 1; setPicked(null); setI(n); if (n >= qs.length) save(quiz.id, score, qs.length); };
  const ok = picked !== null && q.options[picked].correct;
  const fb = picked !== null ? q.options[picked].feedback : "";
  return (
    <div className="qp">
      <div className="qmeta"><span>Pregunta {i + 1} de {qs.length}</span><span>{score} correctas</span></div>
      <div className="bar"><i style={{ width: `${(100 * i) / qs.length}%` }} /></div>
      <h2 className="question">{q.question || "Escoja la opción correcta"}</h2>
      <div className="options">
        {q.options.map((o, k) => (
          <button key={k} onClick={() => choose(k)} disabled={picked !== null && k !== picked && !o.correct}
            className={"opt" + (picked === null ? "" : o.correct ? " right" : k === picked ? " wrong" : "")}>{o.text}</button>
        ))}
      </div>
      {picked !== null && (
        <Coronel text={said} ok={ok}>
          {fb && <p className="fb"><FeedbackText text={fb} data={data} /></p>}
        </Coronel>
      )}
      {picked !== null && <button className="primary" onClick={next}>{i + 1 < qs.length ? "Siguiente" : "Ver puntaje"}</button>}
    </div>
  );
}

function SentenceOrder({ quiz, data, onDone }: { quiz: Extract<Quiz, { type: "sentence-order" }>; data: AllData; onDone: () => void }) {
  const line = useLine();
  const [run, setRun] = useState(0);
  const pool = useMemo(() => shuffle(quiz.segments.map((s, k) => ({ s, k }))), [quiz, run]);
  const [built, setBuilt] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [said, setSaid] = useState("");
  const sentence = built.map((k) => quiz.segments[k]).join(" ");
  const check = () => {
    const ok = quiz.answers.some((a) => clean(a) === clean(sentence));
    setChecked(ok); setSaid(line(ok)); save(quiz.id, ok ? 1 : 0, 1);
  };
  return (
    <div className="qp">
      <p className="hint">Toque las palabras en el orden correcto para formar la frase. Piense en la fórmula.</p>
      <div className={"built" + (checked === true ? " right" : checked === false ? " wrong" : "")}>{sentence || <span className="muted">Su frase aparecerá aquí</span>}</div>
      <div className="chips">
        {pool.map(({ s, k }) => (
          <button key={k} className="chip" disabled={built.includes(k) || checked !== null} onClick={() => setBuilt([...built, k])}>{s}</button>
        ))}
      </div>
      {checked !== null && <Coronel text={said} ok={checked}>{!checked && <p className="fb">Respuesta correcta: <b>{quiz.answers[0]}</b></p>}</Coronel>}
      {checked !== null && <ReviewLinks quiz={quiz} data={data} />}
      <div className="actions">
        {checked === null && <button className="primary" disabled={built.length !== quiz.segments.length} onClick={check}>Revisar</button>}
        {checked !== null && <button className="primary" onClick={onDone}>Continuar</button>}
        <button className="ghost" onClick={() => { setBuilt([]); setChecked(null); setRun(run + 1); }}>{checked === null ? "Borrar" : "Intentar otra vez"}</button>
      </div>
    </div>
  );
}

function Matching({ quiz, data, onDone }: { quiz: Extract<Quiz, { type: "matching" }>; data: AllData; onDone: () => void }) {
  const line = useLine();
  const PER = 10;
  const rounds = useMemo(() => { const p = shuffle(quiz.pairs); const r = []; for (let i = 0; i < p.length; i += PER) r.push(p.slice(i, i + PER)); return r; }, [quiz]);
  const [r, setR] = useState(0);
  const [sel, setSel] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [said, setSaid] = useState("");
  const [score, setScore] = useState(0);
  const round = rounds[r];
  const opts = useMemo(() => round ? shuffle(round.map((p) => p.right)) : [], [round]);
  if (!round) return <Result quiz={quiz} data={data} correct={score} total={quiz.pairs.length} onDone={onDone} onRetry={() => { setR(0); setScore(0); setSel({}); setChecked(false); }} />;
  const check = () => {
    const ok = round.filter((p, k) => sel[k] === p.right).length;
    setScore(score + ok); setChecked(true); setSaid(line(ok === round.length));
    if (r + 1 >= rounds.length) save(quiz.id, score + ok, quiz.pairs.length);
  };
  return (
    <div className="qp">
      <div className="qmeta"><span>Grupo {r + 1} de {rounds.length}</span><span>{score} correctas</span></div>
      <div className="match">
        {round.map((p, k) => (
          <label key={k} className={checked ? (sel[k] === p.right ? "right" : "wrong") : ""}>
            <span>{p.left}</span>
            <select value={sel[k] ?? ""} disabled={checked} onChange={(e) => setSel({ ...sel, [k]: e.target.value })}>
              <option value="">—</option>{opts.map((o) => <option key={o}>{o}</option>)}
            </select>
            {checked && sel[k] !== p.right && <small>{p.right}</small>}
          </label>
        ))}
      </div>
      {checked && <Coronel text={said} ok={round.every((p, k) => sel[k] === p.right)} />}
      {!checked ? <button className="primary" onClick={check}>Revisar</button>
        : <button className="primary" onClick={() => { setR(r + 1); setSel({}); setChecked(false); }}>Siguiente</button>}
    </div>
  );
}

export function QuizPlayer({ quiz, data, onDone }: { quiz: Quiz; data: AllData; onDone: () => void }) {
  if (quiz.type === "multiple-choice") return <MultipleChoice quiz={quiz} data={data} onDone={onDone} />;
  if (quiz.type === "sentence-order") return <SentenceOrder quiz={quiz} data={data} onDone={onDone} />;
  return <Matching quiz={quiz} data={data} onDone={onDone} />;
}
