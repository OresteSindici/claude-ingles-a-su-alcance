import { useRef, useState } from "react";
import { FORMULAS, type Drill as D } from "../data";
import { update, useProgress } from "../progress";
import { Coronel, useLine } from "../voice";

let playing: HTMLAudioElement | null = null;
const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function Highlighted({ text, hl }: { text: string; hl: string[] }) {
  if (!hl.length) return <>{text}</>;
  const m = text.match(new RegExp(`\\b(${hl.map(esc).join("|")})(?![\\w'’])`));
  if (!m || m.index === undefined) return <>{text}</>;
  return <>{text.slice(0, m.index)}<em>{m[0]}</em>{text.slice(m.index + m[0].length)}</>;
}

// Self-check used by every practice card: "La tuve bien" / "Debo repasarla", then Mi Coronel's line stays visible.
function SelfCheck({ k }: { k: string }) {
  const p = useProgress(); const line = useLine();
  const mark = p.drills[k];
  const [said, setSaid] = useState<string | null>(null);
  const set = (v: "y" | "n") => { update((s) => ({ ...s, drills: { ...s.drills, [k]: v } })); setSaid(line(v === "y")); };
  return (<>
    <div className="self">
      <button className="y" aria-pressed={mark === "y"} onClick={() => set("y")}>La tuve bien</button>
      <button className="n" aria-pressed={mark === "n"} onClick={() => set("n")}>Debo repasarla</button>
    </div>
    {said && <Coronel text={said} ok={mark === "y"} />}
  </>);
}

export function Drill({ d }: { d: D }) {
  const key = `${d.page}-${d.n}`;
  const p = useProgress();
  const mark = p.drills[key];
  const [open, setOpen] = useState(!!mark);
  const [on, setOn] = useState(false);
  const audio = useRef<HTMLAudioElement>();
  const play = () => {
    audio.current ||= new Audio("/" + d.audio);
    if (playing && playing !== audio.current) playing.pause();
    playing = audio.current; audio.current.currentTime = 0; setOn(true);
    audio.current.onended = () => setOn(false);
    audio.current.play().catch(() => setOn(false));
  };
  const f = d.formula ? FORMULAS[d.formula] : null;
  return (
    <article className={"card" + (mark === "y" ? " ok" : mark === "n" ? " redo" : "")}>
      <div className="row">
        <span className="num">{d.n}.</span>
        <div className="sent"><Highlighted text={d.prompt} hl={d.hl} /></div>
        {f && <span className="tag" title={`${f[0]}: ${f[1]}`}>({d.formula})</span>}
        {d.audio && <button className={"play" + (on ? " on" : "")} onClick={play} aria-label={`Escuchar frase ${d.n}`}>
          <svg viewBox="0 0 16 16"><path d="M3 2l11 6-11 6z" /></svg></button>}
      </div>
      {d.answers.length > 0 && <input aria-label={`Su traducción de la frase ${d.n}`} placeholder="Escriba su traducción…" autoComplete="off"
        value={p.translations[key] ?? ""}
        onChange={(e) => update((s) => ({ ...s, translations: { ...s.translations, [key]: e.target.value } }))} />}
      {!open && d.answers.length > 0 && <button className="reveal" onClick={() => setOpen(true)}>Ver respuesta</button>}
      {open && d.answers.map((a, i) => (
        <div className="ans" key={i}><small>Respuesta del manual{d.answers.length > 1 ? ` · ${i + 1}` : ""}</small>{a}</div>
      ))}
      {open && <SelfCheck k={key} />}
    </article>
  );
}

// Answer boxes that are not numbered sentences (conditionals A/B/C, tag questions…).
export function Reveal({ id, prompt, answer }: { id: string; prompt: string; answer: string }) {
  const p = useProgress();
  const [open, setOpen] = useState(!!p.drills[id]);
  return (
    <article className={"card mini" + (p.drills[id] === "y" ? " ok" : p.drills[id] === "n" ? " redo" : "")}>
      {prompt && <div className="sent small">{prompt}</div>}
      {!open ? <button className="reveal" onClick={() => setOpen(true)}>{prompt ? "Ver respuesta" : "Ver traducción"}</button>
        : <><div className="ans"><small>Respuesta del manual</small>{answer}</div><SelfCheck k={id} /></>}
    </article>
  );
}
