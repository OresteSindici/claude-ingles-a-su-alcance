// "Mi Coronel dice": the author's own feedback lines from the 2002 quizzes, shown as a toast.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Voice } from "./data";
type Say = (kind: "right" | "wrong" | "custom", text?: string) => void;
const Ctx = createContext<Say>(() => {});
export const useSay = () => useContext(Ctx);
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
export function VoiceProvider({ voice, children }: { voice: Voice; children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  const t = useRef<number>();
  useEffect(() => { const hide = () => setMsg(null); addEventListener("hashchange", hide); return () => removeEventListener("hashchange", hide); }, []);
  const say = useCallback<Say>((kind, text) => {
    const line = kind === "custom" ? text! : pick(voice[kind]);
    setMsg({ text: line, id: Date.now() });
    clearTimeout(t.current); t.current = window.setTimeout(() => setMsg(null), 3400);
  }, [voice]);
  return (
    <Ctx.Provider value={say}>
      {children}
      <div className={"toast" + (msg ? " show" : "")} role="status" aria-live="polite">
        <img src="/homenaje/tc-payan.jpg" alt="" />
        <div><b>Mi Coronel dice</b><p>{msg?.text}</p></div>
      </div>
    </Ctx.Provider>
  );
}
