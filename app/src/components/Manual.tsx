// "Manual" tab: the original 2002 PDF, page by page, with its interactive elements laid over the page image
// exactly where the PDF had them: audio buttons, answer boxes, exercise buttons and links between pages.
import { useEffect, useRef, useState } from "react";
import { pageImg, type AllData } from "../data";

type Box = [number, number, number, number]; // x, y, w, h in % of the page
type Hot =
  | { k: "audio"; r: Box; src: string }
  | { k: "answer"; r: Box; t: string }
  | { k: "quiz"; r: Box; id: string; label: string }
  | { k: "goto"; r: Box; p: number }
  | { k: "url"; r: Box; u: string }
  | { k: "nav"; r: Box; to: string; label: string };
type ManualData = { pages: Record<string, Hot[]>; toc: { title: string; page: number; level: number }[] };

let cache: Promise<ManualData> | null = null;
const loadManual = () => (cache ||= fetch("/data/manual.json").then((r) => r.json()));
const LAST = "ias-manual-pagina";
const TOTAL = 206;
const go = (p: string) => { location.hash = "/" + p; };
let playing: HTMLAudioElement | null = null;

function useManual() {
  const [m, setM] = useState<ManualData | null>(null);
  useEffect(() => { loadManual().then(setM); }, []);
  return m;
}
const lastPage = () => { try { return Number(localStorage.getItem(LAST)) || 0; } catch { return 0; } };

export function ManualIndex() {
  const m = useManual();
  const last = lastPage();
  const counts = m ? Object.values(m.pages).flat().reduce((c, h) => ({ ...c, [h.k]: (c[h.k] || 0) + 1 }), {} as Record<string, number>) : {};
  return (<>
    <div className="eyebrow">Manual original · 2002</div>
    <h1>El manual <span>como lo escribió</span></h1>
    <p className="lead">Las 206 páginas del «Manual Inglés a su Alcance» con su diseño original. Igual que en el PDF de 2002, puede tocar los botones de audio, abrir las respuestas y saltar a los ejercicios.</p>
    <div className="manual-legend">
      <span><i className="lg lg-audio" /> {counts.audio ?? "…"} audios</span>
      <span><i className="lg lg-answer" /> {counts.answer ?? "…"} respuestas</span>
      <span><i className="lg lg-quiz" /> {counts.quiz ?? "…"} ejercicios</span>
      <span><i className="lg lg-goto" /> {counts.goto ?? "…"} enlaces entre páginas</span>
    </div>
    <div className="actions">
      {last > 1 ? <a className="primary" href={`#/manual/${last}`}>Continuar en la página {last}</a>
        : <a className="primary" href="#/manual/1">Abrir el manual</a>}
      <form className="jump" onSubmit={(e) => { e.preventDefault(); const v = Number(new FormData(e.currentTarget).get("n")); if (v >= 1 && v <= TOTAL) go("manual/" + v); }}>
        <label htmlFor="jump-n">Ir a la página</label>
        <input id="jump-n" name="n" type="number" min={1} max={TOTAL} placeholder="1–206" />
      </form>
    </div>
    <h2 className="h-sec">Contenido</h2>
    {!m ? <p className="muted">Cargando…</p> : (
      <ol className="mtoc">{m.toc.map((t, i) => (
        <li key={i} className={"lv" + t.level}><a href={`#/manual/${t.page}`}><span>{t.title}</span><small>p. {t.page}</small></a></li>
      ))}</ol>
    )}
  </>);
}

export function ManualPage({ data, page }: { data: AllData; page: string }) {
  const n = Math.min(TOTAL, Math.max(1, Number(page) || 1));
  const m = useManual();
  const [zoom, setZoom] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [on, setOn] = useState<string | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { try { localStorage.setItem(LAST, String(n)); } catch { /* ignore */ } setAnswer(null); }, [n]);
  useEffect(() => { // preload the neighbours so swiping feels instant
    for (const k of [n - 1, n + 1]) if (k >= 1 && k <= TOTAL) { const im = new Image(); im.src = pageImg(k); }
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowRight" && n < TOTAL) go(`manual/${n + 1}`);
      if (e.key === "ArrowLeft" && n > 1) go(`manual/${n - 1}`);
    };
    addEventListener("keydown", key); return () => removeEventListener("keydown", key);
  }, [n]);
  useEffect(() => () => { playing?.pause(); }, []);
  const hots = m?.pages[String(n)] ?? [];
  const lid = data.course.pageLesson[n];
  const lesson = data.course.lessons.find((l) => l.id === lid);
  const play = (src: string) => {
    if (playing) playing.pause();
    if (on === src) { setOn(null); return; }
    const a = new Audio("/" + src); playing = a; setOn(src);
    a.onended = () => setOn(null); a.play().catch(() => setOn(null));
  };
  const style = (r: Box) => ({ left: `${r[0]}%`, top: `${r[1]}%`, width: `${r[2]}%`, height: `${r[3]}%` });
  return (<>
    <a className="back" href="#/manual">← Contenido del manual</a>
    <div className="manual-bar">
      <a className={"ghost small" + (n <= 1 ? " off" : "")} href={`#/manual/${n - 1}`} aria-label="Página anterior">←</a>
      <form onSubmit={(e) => { e.preventDefault(); const v = Number(new FormData(e.currentTarget).get("n")); if (v >= 1 && v <= TOTAL) go("manual/" + v); }}>
        <input name="n" type="number" min={1} max={TOTAL} defaultValue={n} key={n} aria-label="Número de página" />
        <span className="of">de {TOTAL}</span>
      </form>
      <a className={"ghost small" + (n >= TOTAL ? " off" : "")} href={`#/manual/${n + 1}`} aria-label="Página siguiente">→</a>
      <button className="ghost small" onClick={() => setZoom(!zoom)}>{zoom ? "Reducir" : "Ampliar"}</button>
    </div>
    <div className={"mpage-wrap" + (zoom ? " zoom" : "")}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        const t = touch.current; touch.current = null;
        if (!t || zoom) return;
        const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) go(`manual/${dx < 0 ? Math.min(TOTAL, n + 1) : Math.max(1, n - 1)}`);
      }}>
      <div className="mpage">
        <img src={pageImg(n)} alt={`Página ${n} del manual original`} width={1275} height={1593} draggable={false} />
        {hots.map((h, i) => {
          switch (h.k) {
            case "audio": return <button key={i} className={"hot h-audio" + (on === h.src ? " on" : "")} style={style(h.r)} onClick={() => play(h.src)} aria-label="Escuchar la frase"><svg viewBox="0 0 16 16"><path d="M3 2l11 6-11 6z" /></svg></button>;
            case "answer": return <button key={i} className="hot h-answer" style={style(h.r)} onClick={() => setAnswer(h.t)} aria-label="Ver la respuesta" />;
            case "quiz": return <a key={i} className="hot h-quiz" style={style(h.r)} href={`#/ejercicio/${h.id}`} aria-label={`Ejercicio: ${h.label}`} title={h.label} />;
            case "goto": return <a key={i} className="hot h-goto" style={style(h.r)} href={`#/manual/${h.p}`} aria-label={`Ir a la página ${h.p}`} />;
            case "nav": return <a key={i} className="hot h-goto" style={style(h.r)} href={`#/${h.to}`} aria-label={h.label} />;
            case "url": return <a key={i} className="hot h-goto" style={style(h.r)} href={h.u} target="_blank" rel="noreferrer" aria-label={h.u} />;
          }
        })}
      </div>
    </div>
    <p className="hint manual-foot">
      {hots.length > 0 ? "Toque ▶ para escuchar, los recuadros para ver la respuesta y los botones para abrir los ejercicios. " : ""}
      Deslice a los lados para cambiar de página.
      {lesson && <> Esta página en texto: <a href={`#/leccion/${lesson.id}/p/${n}`}>{lesson.num ? lesson.num + ". " : ""}{lesson.title}</a></>}
    </p>
    {answer !== null && (
      <div className="sheet" role="dialog" aria-label="Respuesta">
        <div className="sheet-in">
          <div className="eyebrow">Respuesta del manual · página {n}</div>
          <p>{answer}</p>
          <button className="primary" onClick={() => setAnswer(null)}>Cerrar</button>
        </div>
      </div>
    )}
  </>);
}
