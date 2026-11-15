// Renders the manual's theory as readable text, with practice sentences and exercises in place.
import { Fragment, type ReactNode } from "react";
import type { Block, Run, AllData } from "../data";
import { Drill, Reveal } from "./Drill";
import { useProgress, PASS } from "../progress";

export function Runs({ runs }: { runs: Run[] | null }) {
  if (!runs) return null;
  return <>{runs.map((r, i) => {
    let el: ReactNode = r.x;
    if (r.c) el = <span className={"c-" + r.c}>{el}</span>;
    if (r.b) el = <strong>{el}</strong>;
    if (r.i) el = <em>{el}</em>;
    return <Fragment key={i}>{el}</Fragment>;
  })}</>;
}

export function QuizCard({ data, id, label = "Ejercicio interactivo" }: { data: AllData; id: string; label?: string }) {
  const p = useProgress(); const q = data.quizzes[id];
  if (!q) return null;
  const r = p.quizzes[id]; const pass = r && r.best / r.total >= PASS;
  return (
    <a className={"quiz-link" + (pass ? " done" : "")} href={`#/ejercicio/${id}`}>
      <span className="eyebrow">{label}{r ? ` · mejor: ${Math.round((100 * r.best) / r.total)}%` : ""}</span>
      <strong>{q.title}</strong>
    </a>
  );
}

export function Blocks({ blocks, data, lessonId }: { blocks: Block[]; data: AllData; lessonId: string }) {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.t === "drill") {   // group consecutive practice sentences
      const group = [];
      while (i < blocks.length && blocks[i].t === "drill") group.push(blocks[i++] as Extract<Block, { t: "drill" }>);
      out.push(<div className="list" key={"d" + i}>{group.map((d) => <Drill key={`${d.page}-${d.n}`} d={d} />)}</div>);
      continue;
    }
    if (b.t === "li") {
      const group = [];
      while (i < blocks.length && blocks[i].t === "li") group.push(blocks[i++] as Extract<Block, { t: "li" }>);
      out.push(<ul className="t-list" key={"l" + i}>{group.map((li, k) => (
        <li key={k} data-mark={li.mark === "•" ? undefined : li.mark}>{li.mark !== "•" && <b className="mark">{li.mark}</b>}<Runs runs={li.runs} /></li>
      ))}</ul>);
      continue;
    }
    const k = "b" + i;
    switch (b.t) {
      case "page": out.push(<div className="t-page" id={`p${b.n}`} key={k}><span>Página {b.n}</span><a href={`#/manual/${b.n}`}>Ver en el manual original</a></div>); break;
      case "h2": out.push(<h2 className="t-h2" key={k}><Runs runs={b.runs} /></h2>); break;
      case "h3": out.push(<h3 className="t-h3" key={k}><Runs runs={b.runs} /></h3>); break;
      case "p": out.push(<p className="t-p" key={k}><Runs runs={b.runs} /></p>); break;
      case "grid": case "table": {
        const cols = Math.max(...b.rows.map((r) => r.length));
        out.push(<div className="t-scroll" key={k}><table className={b.t === "table" ? "t-table" : "t-grid"}><tbody>{b.rows.map((row, ri) => {
          const filled = row.filter((c) => c && c.length);
          if (b.t === "table" && filled.length === 1 && row.length > 1) return <tr key={ri} className="t-sub"><th colSpan={cols}><Runs runs={filled[0]} /></th></tr>;
          return <tr key={ri}>{row.map((c, ci) => <td key={ci} colSpan={ci === row.length - 1 ? cols - row.length + 1 : 1}><Runs runs={c} /></td>)}</tr>;
        })}</tbody></table></div>); break;
      }
      case "idiom": out.push(<article className="idiom" key={k}><h3>{b.idiom}</h3><p>{b.meaning}</p>{b.example && <p className="ex">{b.example}</p>}</article>); break;
      case "reveal": out.push(<Reveal key={k} id={`${lessonId}:${b.key}`} prompt={b.prompt} answer={b.answer} />); break;
      case "quiz": out.push(<QuizCard key={k} data={data} id={b.id} />); break;
    }
    i++;
  }
  return <div className="theory">{out}</div>;
}
