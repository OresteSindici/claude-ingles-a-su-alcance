import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadAll } from "./data";
import { VoiceProvider } from "./voice";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
loadAll().then((data) => root.render(
  <StrictMode><VoiceProvider voice={data.voice}><App data={data} /></VoiceProvider></StrictMode>,
)).catch(() => root.render(<p style={{ padding: 24 }}>No se pudo cargar el curso. Revise su conexión e intente de nuevo.</p>));
