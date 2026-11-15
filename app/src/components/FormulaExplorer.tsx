// Interactive explanation of the method: pick a formula, tap each piece (S, 21, N, V, C) to see what it is.
import { useState } from "react";
import { FORMULAS } from "../data";

type Role = "S" | "21" | "N" | "V" | "C";
const ROLES: Record<Role, { name: string; desc: string }> = {
  S: { name: "Sujeto", desc: "Quién realiza la acción. Puede ser un pronombre (I, you, he, she, it, we, they) o un sustantivo (Pedro, the pilot, my car)." },
  "21": { name: "Auxiliar («21»)", desc: "Cualquiera de los 21 auxiliares del método: do, does, did, am, are, is, was, were, have, has, had, can, could, may, might, will, would, shall, should, must… Sirven para preguntar, negar o dar un sentido especial a la frase." },
  N: { name: "Negación", desc: "La palabra NOT. Siempre va pegada al 21 y casi siempre se contrae: do not → don’t, did not → didn’t, can not → can’t." },
  V: { name: "Verbo", desc: "La acción: fly, eat, study, go. Cuando hay un 21, el verbo va en su forma simple: «Did you buy», nunca «Did you bought»." },
  C: { name: "Complemento", desc: "Todo lo demás: qué, dónde, cuándo, cómo. También se llama predicado: today, helicopters, in Cali." },
};
// The manual's own five model sentences (page 20).
const EXAMPLES: Record<number, { es: string; parts: [Role, string][] }> = {
  1: { es: "Yo vuelo hoy", parts: [["S", "I"], ["V", "fly"], ["C", "today"]] },
  2: { es: "Él debe volar hoy", parts: [["S", "He"], ["21", "must"], ["V", "fly"], ["C", "today"]] },
  3: { es: "Yo no vuelo hoy", parts: [["S", "I"], ["21", "do"], ["N", "not"], ["V", "fly"], ["C", "today"]] },
  4: { es: "¿Tú vuelas helicópteros?", parts: [["21", "Do"], ["S", "you"], ["V", "fly"], ["C", "helicopters?"]] },
  5: { es: "¿No volaste ayer?", parts: [["21", "Did"], ["N", "not"], ["S", "you"], ["V", "fly"], ["C", "yesterday?"]] },
};
const CONTRACTED: Record<number, string> = { 3: "I don’t fly today", 5: "Didn’t you fly yesterday?" };

export function FormulaExplorer() {
  const [f, setF] = useState(4);
  const [role, setRole] = useState<Role>("21");
  const ex = EXAMPLES[f];
  const pieces = FORMULAS[f][1].split(" + ") as Role[];
  return (
    <section className="fx" aria-label="Las 5 fórmulas">
      <h2>Las 5 fórmulas</h2>
      <p className="hint">Toda frase en inglés obedece a una de estas fórmulas. Escoja una y toque cada pieza.</p>
      <div className="fx-tabs" role="tablist">
        {Object.entries(FORMULAS).map(([k, [name]]) => (
          <button key={k} role="tab" aria-selected={+k === f} onClick={() => { setF(+k); if (!EXAMPLES[+k].parts.some(([r]) => r === role)) setRole("S"); }}>
            <b>({k})</b> {name}
          </button>
        ))}
      </div>
      <div className="fx-board">
        <div className="fx-formula">
          {pieces.map((r, i) => (
            <button key={i} className={"piece r" + r.replace("21", "x") + (r === role ? " on" : "")} onClick={() => setRole(r)}>{r}</button>
          ))}
        </div>
        <div className="fx-sentence">
          {ex.parts.map(([r, w], i) => (
            <button key={i} className={"word r" + r.replace("21", "x") + (r === role ? " on" : "")} onClick={() => setRole(r)}>
              {w}<small>{r}</small>
            </button>
          ))}
        </div>
        <div className="fx-es">{ex.es}{CONTRACTED[f] && <> · contraída: <b>{CONTRACTED[f]}</b></>}</div>
        <div className={"fx-def r" + role.replace("21", "x")}>
          <b>{role} = {ROLES[role].name}</b>
          <p>{ROLES[role].desc}</p>
        </div>
      </div>
      <p className="hint">Observe la posición del 21: en las preguntas pasa al comienzo, antes del sujeto.</p>
    </section>
  );
}
