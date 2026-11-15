// Student progress, saved on this device. (Accounts with cloud sync come later with Firebase Auth.)
import { useSyncExternalStore } from "react";

export type Progress = {
  drills: Record<string, "y" | "n">;           // key "<page>-<n>"
  translations: Record<string, string>;
  quizzes: Record<string, { best: number; total: number }>;  // best correct answers out of total
};
const KEY = "ias-progreso-v1";
let state: Progress = { drills: {}, translations: {}, quizzes: {} };
try { const raw = localStorage.getItem(KEY); if (raw) state = { ...state, ...JSON.parse(raw) }; } catch { /* private mode */ }
const subs = new Set<() => void>();
export function update(fn: (p: Progress) => Progress) {
  state = fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((s) => s());
}
export const useProgress = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => state);

// Points: 1 per drill the student got right, 10 per quiz passed (70%+).
export const PASS = 0.7;
export function points(p: Progress) {
  const d = Object.values(p.drills).filter((v) => v === "y").length;
  const q = Object.values(p.quizzes).filter((x) => x.total && x.best / x.total >= PASS).length;
  return d + q * 10;
}
export const RANKS: [number, string][] = [
  [0, "Recluta"], [10, "Cadete"], [30, "Alférez"], [60, "Subteniente"], [100, "Teniente"],
  [160, "Capitán"], [240, "Mayor"], [340, "Teniente Coronel"], [460, "Coronel"], [600, "General"],
];
export function rank(pts: number) {
  const i = RANKS.filter(([m]) => pts >= m).length - 1;
  return { index: i, name: RANKS[i][1], next: RANKS[i + 1], floor: RANKS[i][0] };
}
