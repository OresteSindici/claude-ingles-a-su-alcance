// "Mi Coronel dice": the author's own feedback lines from the 2002 quizzes, shown inline after an answer
// and kept on screen until the student moves on.
import { createContext, useContext, type ReactNode } from "react";
import type { Voice } from "./data";
const Ctx = createContext<Voice>({ right: ["¡Bien!"], wrong: ["Siga estudiando!"] });
export function VoiceProvider({ voice, children }: { voice: Voice; children: ReactNode }) {
  return <Ctx.Provider value={voice}>{children}</Ctx.Provider>;
}
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
export function useLine() {
  const v = useContext(Ctx);
  return (ok: boolean) => pick(ok ? v.right : v.wrong);
}
export function Coronel({ text, ok, children }: { text: string; ok?: boolean; children?: ReactNode }) {
  return (
    <div className={"coronel" + (ok === true ? " ok" : ok === false ? " bad" : "")} role="status">
      <img src="/homenaje/tc-payan.jpg" alt="" />
      <div><b>Mi Coronel dice</b><p>{text}</p>{children}</div>
    </div>
  );
}
