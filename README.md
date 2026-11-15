# Inglés a su Alcance

Modernización del manual interactivo **"Inglés a su Alcance"** (2002), creado por el
Teniente Coronel **Jairo Alberto Payán**, Fuerza Aérea Colombiana, en la Base Aérea de Melgar,
durante el tiempo de su injusta detención. Con este método aprendieron inglés cientos de
miembros de la Fuerza Pública de Colombia.

El objetivo es llevar el curso a una aplicación web y móvil gratuita para cualquier
hispanohablante, como homenaje a su autor y a los miembros de las Fuerzas Militares.

## El método

El inglés se construye con lógica casi matemática: cinco fórmulas y los **21 auxiliares** («los 21»).

| Tipo | Frase | Fórmula |
|---|---|---|
| 1 | Afirmativa | S + V + C |
| 2 | Afirmativa con 21 | S + 21 + V + C |
| 3 | Negativa | S + 21 + N + V + C |
| 4 | Interrogativa | 21 + S + V + C |
| 5 | Interrogativa negativa | 21 + N + S + V + C |

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `legacy/` | Material original de 2002–2004: el PDF, respuestas `.txt`, ejercicios web (Hot Potatoes) y audios |
| `tools/` | Scripts que extraen el contenido del material original |
| `content/` | Contenido extraído y estructurado (JSON + audio) que usa la aplicación |
| `prototype/` | Prototipo de una lección |

## Regenerar el contenido

```bash
pip install pymupdf
python3 tools/extract_pdf.py legacy build
node tools/extract_quizzes.mjs "legacy/Ejercicios Internet" build/quizzes.json
python3 tools/build_content.py legacy
```
