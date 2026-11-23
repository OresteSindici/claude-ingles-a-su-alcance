# Manual Inglés a su Alcance

Modernización del manual interactivo **"Manual Inglés a su Alcance"** (2002), creado por el
Teniente Coronel **Jairo Alberto Payán**, Fuerza Aérea Colombiana, en la Base Aérea de Melgar,
durante el tiempo de su injusta detención. Con este método aprendieron inglés cientos de
miembros de la Fuerza Pública de Colombia.

Más de veinte años después, su hijo Ricardo Alberto lo convierte en una app web y móvil gratuita
para cualquier hispanohablante, como homenaje a su autor y a los miembros de las Fuerzas Militares.

## El método

El inglés se construye con lógica casi matemática: cinco fórmulas y los **21 auxiliares** («los 21»).

| Tipo | Frase | Fórmula |
|---|---|---|
| 1 | Afirmativa | S + V + C |
| 2 | Afirmativa con 21 | S + 21 + V + C |
| 3 | Negativa | S + 21 + N + V + C |
| 4 | Interrogativa | 21 + S + V + C |
| 5 | Interrogativa negativa | 21 + N + S + V + C |

## La app

- **Curso** en cuatro etapas con las 48 lecciones del manual como texto fácil de leer y buscar, con las 499 frases de práctica (audio original) y los ejercicios en el lugar donde el manual los propone.
- **Fórmulas interactivas**: toque S, 21, N, V o C para ver qué significa cada pieza.
- **Buscador** en todo el manual.
- **Manual original** (pestaña «Manual»): las 206 páginas tal como se publicaron en 2002, con sus 204 audios, 551 respuestas, ejercicios y enlaces entre páginas funcionando sobre la página, como en el PDF.
- **Ejercicios**: 88 ejercicios interactivos del curso (selección múltiple, ordenar frases, verbos), cada uno enlazado a la lección que lo explica, con los comentarios de «Mi Coronel».
- **Rangos** de Recluta a General según el progreso.
- **Homenaje** al autor.
- Se instala en el celular como app (PWA) y funciona sin conexión en las lecciones ya visitadas.

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `app/` | La aplicación (React + Vite, PWA) |
| `legacy/` | Material original de 2002–2004: PDF, respuestas `.txt`, ejercicios Hot Potatoes, audios, pantallas del instalador |
| `tools/` | Scripts que extraen el contenido del material original |
| `content/` | Contenido extraído y estructurado (JSON + audio) |
| `prototype/` | Prototipo inicial de una lección |

## Trabajar en la app

```bash
cd app
npm install
npm run dev
```

## Regenerar el contenido desde el material original

```bash
pip install pymupdf pillow
python3 tools/extract_pdf.py legacy build
node tools/extract_quizzes.mjs "legacy/Ejercicios Internet" build/quizzes.json
python3 tools/build_content.py legacy
python3 tools/render_pages.py "legacy/MANUAL INGLÉS A SU ALCANCE.pdf" app/public/pages
python3 tools/build_theory.py      # la teoría del PDF como texto estructurado
python3 tools/build_manual.py      # elementos interactivos del PDF (audio, respuestas, enlaces) con su posición
python3 tools/build_app_data.py
```

## Publicar

Ver [DEPLOY.md](DEPLOY.md).
