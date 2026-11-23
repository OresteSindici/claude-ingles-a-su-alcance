import { useEffect, useState, type ReactNode } from "react";
import { loadLesson, loadSearch, pageImg, type AllData, type Block, type LessonMeta, type Quiz } from "./data";
import { points, rank, useProgress, PASS } from "./progress";
import { QuizPlayer } from "./components/QuizPlayer";
import { Blocks, QuizCard } from "./components/Blocks";
import { FormulaExplorer } from "./components/FormulaExplorer";
import { Markdown } from "./md";
import homenajeText from "./content/homenaje.md?raw";

// ---- tiny hash router: #/  #/etapa/:id  #/leccion/:id[/p/:page]  #/ejercicio/:id  #/ejercicios  #/homenaje  #/manual[/:page]  #/buscar/:q
function useRoute() {
  const [h, setH] = useState(location.hash);
  useEffect(() => { const f = () => { setH(location.hash); window.scrollTo(0, 0); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return h.replace(/^#\/?/, "").split("/").filter(Boolean);
}
const go = (path: string) => { location.hash = "/" + path; };

const ICON_WINGS = "M26 30 0 8l4-6 22 18L48 2l4 6z";
function Shell({ children, tab }: { children: ReactNode; tab: string }) {
  return (<>
    <div className="stripe" aria-hidden="true" />
    <header className="top"><div className="in">
      <a className="brand" href="#/"><svg viewBox="0 0 52 32" aria-hidden="true"><path d={ICON_WINGS} /></svg><span><small>Manual</small>Inglés a su Alcance</span></a>
      <nav className="tabs" aria-label="Secciones">
        <a href="#/" aria-current={tab === "curso" ? "page" : undefined}>Curso</a>
        <a href="#/ejercicios" aria-current={tab === "ejercicios" ? "page" : undefined}>Ejercicios</a>
        <a href="#/homenaje" aria-current={tab === "homenaje" ? "page" : undefined}>Homenaje</a>
      </nav>
    </div></header>
    <main className="wrap">{children}</main>
  </>);
}

function RankHud() {
  const p = useProgress(); const pts = points(p); const r = rank(pts);
  const pct = r.next ? (100 * (pts - r.floor)) / (r.next[0] - r.floor) : 100;
  return (
    <section className="hud" aria-label="Su rango">
      <div className="insignia" aria-hidden="true">
        {Array.from({ length: Math.min(r.index, 9) + 1 }, (_, i) => <i key={i} />).slice(0, 5)}
      </div>
      <div>
        <div className="rank">{r.name}</div>
        <div className="sub"><span>{pts} puntos</span><span>{r.next ? `Próximo rango: ${r.next[1]} (${r.next[0]})` : "Rango máximo. ¡A sus órdenes, mi General!"}</span></div>
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
      </div>
    </section>
  );
}

const Speaker = () => <svg className="spk" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /></svg>;
const lessonQuizzes = (l: LessonMeta) => [...l.quizzes, ...(l.extra ?? [])];
const passed = (p: ReturnType<typeof useProgress>, q: string) => { const x = p.quizzes[q]; return !!x && x.best / x.total >= PASS; };

function SearchBox({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  return (
    <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) go("buscar/" + encodeURIComponent(q.trim())); }}>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el manual: «should», «pronombres», «tag questions»…" aria-label="Buscar en el manual" />
      <button className="primary" type="submit">Buscar</button>
    </form>
  );
}

function Home({ data }: { data: AllData }) {
  const p = useProgress();
  const placement = data.course.placement[0];
  return (<>
    <section className="sky-hero">
      <div className="eyebrow">Curso gratuito · Método del TC Payán</div>
      <h1>Inglés con 5 fórmulas<br /><span>y 21 palabras</span></h1>
      <p className="lead">El método con el que cientos de militares colombianos aprendieron inglés. Lea, escuche, traduzca y compruebe, frase por frase.</p>
    </section>
    <RankHud />
    {placement && !p.quizzes[placement] && (
      <a className="mission" href={`#/ejercicio/${placement}`}>
        <span className="eyebrow">Misión 1</span><strong>Prueba de nivel</strong>
        <span>Descubra cómo está su inglés y en qué etapa empezar. Si le va mal, Mi Coronel le dirá «¿No dizque estaba cuchilla?».</span>
      </a>
    )}
    <FormulaExplorer />
    <h2 className="h-sec">Etapas del curso</h2>
    <SearchBox />
    <div className="stages">
      {data.course.stages.map((s, i) => {
        const ls = data.course.lessons.filter((l) => l.stage === s.id);
        const keys = ls.flatMap((l) => l.drillKeys); const done = keys.filter((k) => p.drills[k] === "y").length;
        return (
          <a key={s.id} className="stage" href={`#/etapa/${s.id}`}>
            <span className="stage-n">{String(i + 1).padStart(2, "0")}</span>
            <div><strong>{s.title}</strong><span>{s.desc}</span>
              <small>{ls.length} lecciones{keys.length ? ` · ${done}/${keys.length} frases` : ""}</small>
              {ls.some((l) => l.audio) && <small className="has-audio"><Speaker /> Audio original en {ls.filter((l) => l.audio).length} {ls.filter((l) => l.audio).length === 1 ? "lección" : "lecciones"}</small>}</div>
          </a>
        );
      })}
      <a className="stage original" href="#/manual">
        <span className="stage-n">PDF</span>
        <div><strong>Manual original</strong><span>Las 206 páginas tal como se publicaron en 2002, con su diseño original.</span></div>
      </a>
    </div>
    <a className="tribute" href="#/homenaje">
      <img src="/homenaje/tc-payan.jpg" alt="" />
      <span>Programa diseñado por el Teniente Coronel Jairo Alberto Payán, Fuerza Aérea Colombiana, Base Aérea de Melgar, 2002. <b>Lea su historia</b></span>
    </a>
  </>);
}

function StageView({ data, id }: { data: AllData; id: string }) {
  const p = useProgress();
  const s = data.course.stages.find((x) => x.id === id);
  if (!s) return <NotFound />;
  const ls = data.course.lessons.filter((l) => l.stage === id);
  return (<>
    <a className="back" href="#/">← Curso</a>
    <div className="eyebrow">Etapa</div>
    <h1>{s.title}</h1>
    <p className="lead">{s.desc}</p>
    <ol className="lessons">
      {ls.map((l) => {
        const done = l.drillKeys.filter((k) => p.drills[k] === "y").length;
        const qs = lessonQuizzes(l); const qd = qs.filter((q) => passed(p, q)).length;
        const complete = (l.drillKeys.length || qs.length) && done === l.drillKeys.length && qd === qs.length;
        return (
          <li key={l.id}><a href={`#/leccion/${l.id}`} className={complete ? "done" : ""}>
            <span className="lnum">{l.num || "·"}</span>
            <span className="ltitle">{l.title}</span>
            <span className="lmeta">{l.drillKeys.length ? `${done}/${l.drillKeys.length} frases` : "Lectura"}{qs.length ? ` · ${qd}/${qs.length} ejercicios` : ""}
              {l.audio > 0 && <span className="audio-badge"><Speaker /> Audio</span>}</span>
          </a></li>
        );
      })}
    </ol>
  </>);
}

function LessonView({ data, id, page }: { data: AllData; id: string; page?: string }) {
  const i = data.course.lessons.findIndex((x) => x.id === id);
  const l = data.course.lessons[i];
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  useEffect(() => { setBlocks(null); if (l) loadLesson(l.id).then(setBlocks).catch(() => setBlocks([])); }, [l]);
  useEffect(() => { if (blocks && page) document.getElementById("p" + page)?.scrollIntoView({ block: "start" }); }, [blocks, page]);
  if (!l) return <NotFound />;
  const stage = data.course.stages.find((s) => s.id === l.stage)!;
  const next = data.course.lessons[i + 1], prev = data.course.lessons[i - 1];
  const practice = (l.extra ?? []);
  return (<>
    <a className="back" href={`#/etapa/${stage.id}`}>← {stage.title}</a>
    <div className="eyebrow">{l.num ? `Capítulo ${l.num}` : "Lección"} · {l.first === l.last ? `Página ${l.first}` : `Páginas ${l.first}–${l.last}`}</div>
    <h1 className="h-lesson">{l.title}</h1>
    {l.audio > 0 && <p className="audio-note"><Speaker /> <span>{l.audio} frases con el audio original de 2002. Toque el botón <b>▶</b> junto a cada frase para escucharla.{" "}
      {l.audioPage && l.audioPage !== l.first && <a href={`#/leccion/${l.id}/p/${l.audioPage}`}>Ir a la primera frase con audio (página {l.audioPage})</a>}</span></p>}
    {blocks === null ? <p className="muted">Cargando lección…</p> : <Blocks blocks={blocks} data={data} lessonId={l.id} />}
    {practice.length > 0 && (
      <section className="practice"><h2 className="h-sec">Practique este tema</h2>
        <div className="qgrid">{practice.map((q) => <QuizCard key={q} data={data} id={q} />)}</div></section>
    )}
    <nav className="pager">
      {prev ? <a href={`#/leccion/${prev.id}`}>← {prev.title}</a> : <span />}
      {next && <a href={`#/leccion/${next.id}`}>{next.title} →</a>}
    </nav>
  </>);
}

const quizGroup = (q: Quiz) => /^(evaluation|evaluacion|la-hora)/.test(q.id) ? "Evaluaciones" : q.type === "sentence-order" ? "Ordene la frase"
  : q.type === "matching" ? "Verbos" : "Por tema";
const GROUP_INFO: Record<string, string> = {
  "Evaluaciones": "Pruebas mixtas de todo el curso. Empiece por la básica; las generales 1 a 12 suben de dificultad.",
  "Por tema": "Cada ejercicio refuerza una lección. Toque «Lección» para repasar la teoría antes o después.",
  "Ordene la frase": "Construya frases aplicando las fórmulas.",
  "Verbos": "Memorice los verbos regulares e irregulares.",
};
function QuizzesIndex({ data }: { data: AllData }) {
  const p = useProgress();
  const groups = ["Evaluaciones", "Por tema", "Ordene la frase", "Verbos"];
  const L = Object.fromEntries(data.course.lessons.map((l) => [l.id, l]));
  return (<>
    <div className="eyebrow">Banco de ejercicios</div>
    <h1>Ejercicios <span>interactivos</span></h1>
    <p className="lead">{data.quizList.length} ejercicios del curso original. Apruebe con 70% o más para sumar 10 puntos a su rango.</p>
    {groups.map((g) => (
      <section key={g}><h2 className="h-sec">{g}</h2><p className="hint">{GROUP_INFO[g]}</p>
        <div className="qgrid">{data.quizList.filter((q) => quizGroup(q) === g).map((q) => {
          const r = p.quizzes[q.id]; const lesson = q.lessons[0] ? L[q.lessons[0]] : null;
          return <div key={q.id} className={"qcard" + (passed(p, q.id) ? " done" : "")}>
            <a href={`#/ejercicio/${q.id}`} className="qmain"><strong>{q.title}</strong>
              <small>{q.type === "multiple-choice" ? `${q.questions.length} preguntas` : q.type === "matching" ? `${q.pairs.length} verbos` : "1 frase"}{r ? ` · mejor: ${Math.round((100 * r.best) / r.total)}%` : ""}</small></a>
            {lesson && g !== "Ordene la frase" && <a className="qlesson" href={`#/leccion/${lesson.id}`}>Lección {lesson.num ? lesson.num + " · " : ""}{lesson.title}</a>}
          </div>;
        })}</div>
        {g === "Ordene la frase" && <p className="hint">Teoría: <a href={`#/leccion/${data.quizList.find((q) => q.type === "sentence-order")?.lessons[0]}`}>Mecánica para la construcción de frases</a></p>}
      </section>
    ))}
  </>);
}

function QuizView({ data, id }: { data: AllData; id: string }) {
  const q = data.quizzes[id];
  if (!q) return <NotFound />;
  const back = () => history.length > 1 ? history.back() : go("ejercicios");
  const lesson = q.lessons[0] ? data.course.lessons.find((l) => l.id === q.lessons[0]) : null;
  return (<>
    <button className="back linkish" onClick={back}>← Volver</button>
    <div className="eyebrow">{quizGroup(q)}{lesson ? <> · <a href={`#/leccion/${lesson.id}`}>Lección: {lesson.title}</a></> : null}</div>
    <h1 className="h-quiz">{q.title}</h1>
    <QuizPlayer key={id} quiz={q} data={data} onDone={back} />
  </>);
}

function ManualView({ data, page }: { data: AllData; page?: string }) {
  const n = Math.min(206, Math.max(1, Number(page) || 1));
  const [zoom, setZoom] = useState(false);
  const lid = data.course.pageLesson[n];
  const lesson = data.course.lessons.find((l) => l.id === lid);
  return (<>
    <a className="back" href="#/">← Curso</a>
    <div className="eyebrow">Manual original · 2002</div>
    <h1 className="h-quiz">Página {n} de 206</h1>
    <div className="manual-bar">
      <a className={"ghost small" + (n <= 1 ? " off" : "")} href={`#/manual/${n - 1}`}>← Anterior</a>
      <form onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get("n"); go("manual/" + v); }}>
        <input name="n" type="number" min={1} max={206} defaultValue={n} key={n} aria-label="Ir a la página" />
      </form>
      <a className={"ghost small" + (n >= 206 ? " off" : "")} href={`#/manual/${n + 1}`}>Siguiente →</a>
    </div>
    {lesson && <p className="hint">Esta página en texto: <a href={`#/leccion/${lesson.id}/p/${n}`}>{lesson.num ? lesson.num + ". " : ""}{lesson.title}</a></p>}
    <figure className={"page-fig" + (zoom ? " zoom" : "")}>
      <div className="page-scroll"><img className="page-img" src={pageImg(n)} alt={`Página ${n} del manual original`} width={1275} height={1650} onClick={() => setZoom(!zoom)} /></div>
      <figcaption><span>Toque la página para {zoom ? "reducir" : "ampliar"}</span></figcaption>
    </figure>
  </>);
}

function SearchView({ data, q }: { data: AllData; q: string }) {
  const [idx, setIdx] = useState<[string, number, string][] | null>(null);
  useEffect(() => { loadSearch().then(setIdx); }, []);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const L = Object.fromEntries(data.course.lessons.map((l) => [l.id, l]));
  const hits = (idx ?? []).filter(([, , t]) => { const n = norm(t); return terms.every((w) => n.includes(w)); });
  const byLesson = new Map<string, [number, string][]>();
  for (const [lid, pg, t] of hits) { if (!byLesson.has(lid)) byLesson.set(lid, []); byLesson.get(lid)!.push([pg, t]); }
  const quizHits = data.quizList.filter((x) => terms.every((w) => norm(x.title).includes(w)));
  const mark = (t: string) => {
    const n = norm(t); const w = terms[0]; const at = n.indexOf(w);
    const from = Math.max(0, at - 60); const s = t.slice(from, at + w.length + 100);
    const a = at - from;
    return <>{from > 0 && "…"}{s.slice(0, a)}<mark>{s.slice(a, a + w.length)}</mark>{s.slice(a + w.length)}…</>;
  };
  return (<>
    <a className="back" href="#/">← Curso</a>
    <div className="eyebrow">Buscar en el manual</div>
    <SearchBox initial={q} />
    {!idx ? <p className="muted">Buscando…</p> : (<>
      <p className="hint">{hits.length} resultados en {byLesson.size} lecciones{quizHits.length ? ` y ${quizHits.length} ejercicios` : ""}.</p>
      {quizHits.length > 0 && <div className="qgrid">{quizHits.map((x) => <QuizCard key={x.id} data={data} id={x.id} />)}</div>}
      <div className="results">{[...byLesson].map(([lid, rows]) => (
        <section key={lid} className="result-l">
          <a className="rtitle" href={`#/leccion/${lid}`}>{L[lid]?.num ? L[lid].num + ". " : ""}{L[lid]?.title}</a>
          {rows.slice(0, 4).map(([pg, t], k) => <a key={k} className="rrow" href={`#/leccion/${lid}/p/${pg}`}><small>p. {pg}</small> {mark(t)}</a>)}
          {rows.length > 4 && <small className="muted">y {rows.length - 4} más en esta lección</small>}
        </section>
      ))}</div>
    </>)}
  </>);
}

function Homenaje({ data }: { data: AllData }) {
  return (<>
    <div className="hero">
      <div>
        <div className="eyebrow">Homenaje</div>
        <h1>Teniente Coronel<br /><span>Jairo Alberto Payán</span></h1>
        <p className="lead">Oficial de la Fuerza Aérea Colombiana. Escribió este curso en 2002, en la Base Aérea de Melgar, durante el tiempo de su injusta detención.</p>
        <div className="handle">Identidad digital: <i>«agraviado»</i></div>
      </div>
      <div className="portrait"><img src="/homenaje/tc-payan.jpg" alt="El Teniente Coronel Jairo Alberto Payán en uniforme de la Fuerza Aérea" /></div>
    </div>
    <div className="facts">
      <div><strong>25+</strong><span>años al servicio de la Patria</span></div>
      <div><strong>21</strong><span>auxiliares para construir cualquier frase</span></div>
      <div><strong>Cientos</strong><span>de militares aprendieron con su método</span></div>
    </div>
    <section className="story"><Markdown text={homenajeText} /></section>
    <div className="letters">{data.homenaje.secciones.map((s) => (
      <article key={s.id} className={"letter" + (s.imagen && s.imagen !== "tc-payan.jpg" ? " with-img" : "")}>
        {s.imagen && s.imagen !== "tc-payan.jpg" && <img src={`/homenaje/${s.imagen}`} alt="" />}
        <div><h3>{s.titulo}</h3><p>{s.texto}</p></div>
      </article>
    ))}</div>
    <p className="sig">Textos tomados del instalador original del manual (2003).</p>
    <a className="cta" href="#/">Empezar a aprender</a>
  </>);
}

function NotFound() { return <><h1>No encontrado</h1><p><a href="#/">Volver al inicio</a></p></>; }

export function App({ data }: { data: AllData }) {
  const [view, id, , extra] = useRoute();
  const tab = view === "homenaje" ? "homenaje" : view === "ejercicios" || view === "ejercicio" ? "ejercicios" : "curso";
  const body = view === "etapa" ? <StageView data={data} id={id} />
    : view === "leccion" ? <LessonView data={data} id={id} page={extra} />
    : view === "manual" ? <ManualView data={data} page={id} />
    : view === "buscar" ? <SearchView data={data} q={decodeURIComponent(id ?? "")} />
    : view === "ejercicio" ? <QuizView data={data} id={id} />
    : view === "ejercicios" ? <QuizzesIndex data={data} />
    : view === "homenaje" ? <Homenaje data={data} />
    : !view ? <Home data={data} /> : <NotFound />;
  return <Shell tab={tab}>{body}<footer>«Manual Inglés a su Alcance» © 2002 TC Jairo Alberto Payán. Contenido y audio originales.</footer></Shell>;
}
