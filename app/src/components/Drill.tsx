import { useRef, useState } from "react";
import { FORMULAS, type Drill as D } from "../data";
import { update, useProgress } from "../progress";
import { useSay } from "../voice";

let playing: HTMLAudioElement | null = null;
const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function Highlighted({ text, hl }: { text: string; hl: string[] }) {
  if (!hl.length) return <>{text}</>;
  const re = new RegExp(`\\b(${hl.map(esc).join("|")})(?![\\w'’])`);
  const m = text.match(re);
  if (!m || m.index === undefined) return <>{text}</>;
  return <>{text.slice(0, m.index)}<em>{m[0]}</em>{text.slice(m.index + m[0].length)}</>;
}

export function Drill({ page, d }: { page: number; d: D }) {
  const key = `${page}-${d.n}`;
  const p = useProgress();
  const say = useSay();
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
  const set = (v: "y" | "n") => {
    update((s) => ({ ...s, drills: { ...s.drills, [key]: v } }));
    say(v === "y" ? "right" : "wrong");
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
      <input aria-label={`Su traducción de la frase ${d.n}`} placeholder="Escriba su traducción…" autoComplete="off"
        value={p.translations[key] ?? ""}
        onChange={(e) => update((s) => ({ ...s, translations: { ...s.translations, [key]: e.target.value } }))} />
      {!open && d.answers.length > 0 && <button className="reveal" onClick={() => setOpen(true)}>Ver respuesta</button>}
      {open && d.answers.map((a, i) => (
        <div className="ans" key={i}><small>Respuesta del manual{d.answers.length > 1 ? ` · ${i + 1}` : ""}</small>{a}</div>
      ))}
      {open && <div className="self">
        <button className="y" aria-pressed={mark === "y"} onClick={() => set("y")}>La tuve bien</button>
        <button className="n" aria-pressed={mark === "n"} onClick={() => set("n")}>Debo repasarla</button>
      </div>}
    </article>
  );
}
