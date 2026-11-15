import { useEffect, useState, type ReactNode } from "react";
import { FORMULAS, type AllData, type Lesson, type Quiz } from "./data";
import { points, rank, useProgress, PASS } from "./progress";
import { Drill } from "./components/Drill";
import { QuizPlayer } from "./components/QuizPlayer";
import { Markdown } from "./md";
import homenajeText from "./content/homenaje.md?raw";

// ---- tiny hash router: #/  #/etapa/:id  #/leccion/:id  #/ejercicio/:id  #/ejercicios  #/homenaje
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
      <a className="brand" href="#/"><svg viewBox="0 0 52 32" aria-hidden="true"><path d={ICON_WINGS} /></svg>Inglés a su Alcance</a>
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

function Formulas() {
  return (
    <section className="formulas" aria-label="Las 5 fórmulas">
      <h2>Las 5 fórmulas</h2>
      <p>Toda frase en inglés obedece a una de estas fórmulas. Memorice la posición del 21.</p>
      <div className="fgrid">{Object.entries(FORMULAS).map(([k, [name, f]]) => (
        <div className="f" key={k}><b>({k})</b> {name}<span dangerouslySetInnerHTML={{ __html: f.replace(/21/g, '<b class="k21">21</b>') }} /></div>
      ))}</div>
    </section>
  );
}

const drillKeys = (l: Lesson) => l.pages.flatMap((p) => p.items.map((it) => `${p.n}-${it.n}`));
const lessonQuizzes = (l: Lesson) => [...new Set(l.pages.flatMap((p) => p.quizzes.map((q) => q.quiz)))];

function Home({ data }: { data: AllData }) {
  const p = useProgress();
  const placement = data.course.placement[0];
  return (<>
    <div className="eyebrow">Curso gratuito · Método del TC Payán</div>
    <h1>Inglés con <span>5 fórmulas</span> y 21 palabras</h1>
    <p className="lead">El método con el que cientos de militares colombianos aprendieron inglés. Escuche, traduzca y compruebe, frase por frase.</p>
    <RankHud />
    {placement && !p.quizzes[placement] && (
      <a className="mission" href={`#/ejercicio/${placement}`}>
        <span className="eyebrow">Misión 1</span><strong>Prueba de nivel</strong>
        <span>Descubra cómo está su inglés antes de empezar. Si le va mal, Mi Coronel le dirá «¿No dizque estaba cuchilla?».</span>
      </a>
    )}
    <Formulas />
    <h2 className="h-sec">Etapas del curso</h2>
    <div className="stages">
      {data.course.stages.map((s, i) => {
        const ls = data.course.lessons.filter((l) => l.stage === s.id);
        const keys = ls.flatMap(drillKeys); const done = keys.filter((k) => p.drills[k] === "y").length;
        return (
          <a key={s.id} className="stage" href={`#/etapa/${s.id}`}>
            <span className="stage-n">{String(i + 1).padStart(2, "0")}</span>
            <div><strong>{s.title}</strong><span>{s.desc}</span>
              <small>{ls.length} lecciones{keys.length ? ` · ${done}/${keys.length} frases` : ""}</small></div>
          </a>
        );
      })}
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
        const keys = drillKeys(l); const done = keys.filter((k) => p.drills[k] === "y").length;
        const qs = lessonQuizzes(l); const qd = qs.filter((q) => { const x = p.quizzes[q]; return x && x.best / x.total >= PASS; }).length;
        const complete = (keys.length || qs.length) && done === keys.length && qd === qs.length;
        return (
          <li key={l.id}><a href={`#/leccion/${l.id}`} className={complete ? "done" : ""}>
            <span className="lnum">{l.num || "·"}</span>
            <span className="ltitle">{l.title}</span>
            <span className="lmeta">{keys.length ? `${done}/${keys.length} frases` : ""}{qs.length ? `${keys.length ? " · " : ""}${qd}/${qs.length} ejercicios` : ""}</span>
          </a></li>
        );
      })}
    </ol>
  </>);
}

function PageImage({ n }: { n: number }) {
  const [zoom, setZoom] = useState(false);
  return (
    <figure className={"page-fig" + (zoom ? " zoom" : "")}>
      <div className="page-scroll">
        <img className="page-img" loading="lazy" src={`/pages/${String(n).padStart(3, "0")}.webp`}
          alt={`Página ${n} del manual original`} width={1275} height={1650} onClick={() => setZoom(!zoom)} />
      </div>
      <figcaption><span>Página {n}</span><button className="ghost small" onClick={() => setZoom(!zoom)}>{zoom ? "Reducir" : "Ampliar para leer"}</button></figcaption>
    </figure>
  );
}

function LessonView({ data, id }: { data: AllData; id: string }) {
  const i = data.course.lessons.findIndex((x) => x.id === id);
  const l = data.course.lessons[i];
  const [orig, setOrig] = useState<Record<number, boolean>>({});
  if (!l) return <NotFound />;
  const stage = data.course.stages.find((s) => s.id === l.stage)!;
  const next = data.course.lessons[i + 1], prev = data.course.lessons[i - 1];
  return (<>
    <a className="back" href={`#/etapa/${stage.id}`}>← {stage.title}</a>
    <div className="eyebrow">{l.num ? `Capítulo ${l.num}` : "Lección"} · {l.pages.length > 1 ? `Páginas ${l.pages[0].n}–${l.pages[l.pages.length - 1].n}` : `Página ${l.pages[0].n}`}</div>
    <h1>{l.title}</h1>
    {l.subs.length > 0 && <ul className="subs">{l.subs.map((s) => <li key={s}>{s}</li>)}</ul>}
    {l.pages.map((pg) => (
      <section key={pg.n} className="page">
        {pg.items.length === 0 ? <PageImage n={pg.n} /> : (<>
          <div className="page-head"><span>Página {pg.n} · Practique</span>
            <button className="ghost small" onClick={() => setOrig({ ...orig, [pg.n]: !orig[pg.n] })}>{orig[pg.n] ? "Ocultar página original" : "Ver página original"}</button></div>
          {orig[pg.n] && <PageImage n={pg.n} />}
          <p className="hint">Escuche, escriba su traducción y compare. Las palabras en <em>azul</em> son los «21».</p>
          <div className="list">{pg.items.map((d) => <Drill key={d.n} page={pg.n} d={d} />)}</div>
        </>)}
        {pg.quizzes.map(({ quiz }) => data.quizzes[quiz] && (
          <a key={quiz} className="quiz-link" href={`#/ejercicio/${quiz}`}><span className="eyebrow">Ejercicio interactivo</span><strong>{data.quizzes[quiz].title}</strong></a>
        ))}
      </section>
    ))}
    <nav className="pager">
      {prev ? <a href={`#/leccion/${prev.id}`}>← {prev.title}</a> : <span />}
      {next && <a href={`#/leccion/${next.id}`}>{next.title} →</a>}
    </nav>
  </>);
}

const quizGroup = (q: Quiz) => /evalua|hora-de-la-verdad/.test(q.id) ? "Evaluaciones" : q.type === "sentence-order" ? "Ordene la frase"
  : q.type === "matching" ? "Verbos" : "Por tema";
function QuizzesIndex({ data }: { data: AllData }) {
  const p = useProgress();
  const all = Object.values(data.quizzes);
  const groups = ["Evaluaciones", "Por tema", "Ordene la frase", "Verbos"];
  return (<>
    <div className="eyebrow">Banco de ejercicios</div>
    <h1>Ejercicios <span>interactivos</span></h1>
    <p className="lead">{all.length} ejercicios del curso original. Apruebe con 70% o más para sumar 10 puntos a su rango.</p>
    {groups.map((g) => (
      <section key={g}><h2 className="h-sec">{g}</h2>
        <div className="qgrid">{all.filter((q) => quizGroup(q) === g).map((q) => {
          const r = p.quizzes[q.id]; const pass = r && r.best / r.total >= PASS;
          return <a key={q.id} href={`#/ejercicio/${q.id}`} className={"qcard" + (pass ? " done" : "")}>
            <strong>{q.title}</strong>
            <small>{q.type === "multiple-choice" ? `${q.questions.length} preguntas` : q.type === "matching" ? `${q.pairs.length} verbos` : "1 frase"}{r ? ` · mejor: ${Math.round((100 * r.best) / r.total)}%` : ""}</small>
          </a>;
        })}</div>
      </section>
    ))}
  </>);
}

function QuizView({ data, id }: { data: AllData; id: string }) {
  const q = data.quizzes[id];
  if (!q) return <NotFound />;
  const back = () => history.length > 1 ? history.back() : go("ejercicios");
  return (<>
    <button className="back linkish" onClick={back}>← Volver</button>
    <div className="eyebrow">{quizGroup(q)}</div>
    <h1 className="h-quiz">{q.title}</h1>
    <QuizPlayer key={id} quiz={q} onDone={back} />
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
  const [view, id] = useRoute();
  const tab = view === "homenaje" ? "homenaje" : view === "ejercicios" || view === "ejercicio" ? "ejercicios" : "curso";
  const body = view === "etapa" ? <StageView data={data} id={id} />
    : view === "leccion" ? <LessonView data={data} id={id} />
    : view === "ejercicio" ? <QuizView data={data} id={id} />
    : view === "ejercicios" ? <QuizzesIndex data={data} />
    : view === "homenaje" ? <Homenaje data={data} />
    : !view ? <Home data={data} /> : <NotFound />;
  return <Shell tab={tab}>{body}<footer>«Inglés a su Alcance» © 2002 TC Jairo Alberto Payán. Contenido y audio originales.</footer></Shell>;
}
