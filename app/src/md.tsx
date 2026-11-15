// Minimal Markdown for the editable Homenaje text: "## " headings, paragraphs, **bold**, *italic*.
import type { ReactNode } from "react";
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part.startsWith("*") && part.length > 1 ? <em key={i}>{part.slice(1, -1)}</em> : part);
}
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/<!--[\s\S]*?-->/g, "").trim().split(/\n\s*\n/);
  return <>{blocks.map((b, i) => b.startsWith("## ")
    ? <h2 key={i}>{b.slice(3).trim()}</h2>
    : <p key={i}>{inline(b.replace(/\n/g, " "))}</p>)}</>;
}
