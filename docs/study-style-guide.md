# Study section — content style guide (for authors, not rendered)

Each topic lives in `public/study/<slug>/`:
- `index.md` — the article (GitHub-flavored Markdown, rendered with `marked`).
- `*.svg` — diagrams/illustrations referenced by the article.

## Markdown rules
- **No `#` H1.** The page renders the title itself. Start with a short intro paragraph.
- `##` = main sections (these become the table of contents — aim for 8–14). `###` = subsections. Avoid `####`+.
- Fenced code blocks ALWAYS carry a language: ```bash, ```sql, ```ts, ```json, ```yaml, ```text …
- Tables (GFM) are welcome for comparisons.
- Callouts: a blockquote whose first word is a bold label:
  - `> **TIP:** ...` · `> **NOTE:** ...` · `> **WARNING:** ...` · `> **EXERCISE:** ...`
- Images: `![Alt text describing the diagram](study/<slug>/<file>.svg "Figure caption shown under the image")`
  - Path has **no leading slash** and starts with `study/` (the site runs under a base-href).
  - The quoted title becomes the visible caption — always provide one.
- End with `## Cheat sheet` (dense recap) and `## Where to go next` (resources / next steps).
- UTF-8, plain ASCII punctuation preferred. No emoji. No raw `<script>`/`<style>`/iframes.
- Tone: direct, practical, second person ("you"), taught to a smart beginner, building up to advanced.
  Explain *why*, not just *how*. Use concrete examples, realistic commands, and small worked scenarios.
- Length target: 5,000–8,000 words. 6–9 SVG figures.
- Facts must be accurate as of **September 2026**. Where things drift (prices, free-tier limits, versions),
  say "at the time of writing (2026)" and advise checking the provider's page. Never invent product names or numbers;
  verify with WebSearch when unsure.

## Language modules (Languages track) — overrides
- Target-language text (Cyrillic, Hanzi, Kana/Kanji, accented Latin) is required and must be UTF-8.
  Always pair it with romanization/transliteration (pinyin with tone marks, Hepburn romaji, Russian transliteration)
  and an English gloss, e.g. `привет (privet) - hi`.
- Use tables heavily: alphabets/syllabaries, conjugations, cases, particles, vocab lists.
- Dialogues: use a table or a code-free block with speaker labels; add English translation beneath each line.
- Include a realistic weekly study plan, spaced-repetition advice, and free resources available in 2026 (verify they exist).
- `## Cheat sheet` and `## Where to go next` are still required.
- SVG text containing non-Latin script: `font-family="'Courier New', 'Noto Sans CJK SC', 'Noto Sans JP', 'Microsoft YaHei', 'Yu Gothic', sans-serif"`
  (CJK glyphs are roughly 1em wide, not 0.6em — size boxes accordingly).

## SVG rules (matrix aesthetic)
- Standalone file: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 H" role="img" aria-labelledby="t d">`
  with `<title id="t">` and `<desc id="d">`. Width 800, height as needed (300–600). No width/height attributes.
- Background: first child `<rect width="100%" height="100%" fill="#020a02"/>` (near-black green).
- Palette (use ONLY these):
  - primary green `#00ff41` (strokes, key text) · dim green `#0f7a2a` (secondary strokes, grid) · deep panel `#062b0f` (box fills)
  - text light `#d8ffd8` · muted text `#7fbf8f`
  - amber `#ffb000` (highlight / "attention") · red `#ff4d4d` (danger/errors) · cyan `#39e6ff` (data flow / secondary accent, sparingly)
- Font: `font-family="'Courier New', monospace"`; minimum font-size 13; titles 18–22.
- Lines 1.5–2px, rounded corners rx=6. Arrowheads via a `<marker>` in `<defs>`.
- A subtle glow is OK: `<filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` applied to headings/key strokes only.
- No external fonts, images, scripts, or CSS imports. Keep each file < 25 KB. All text must be legible and must not overlap or overflow boxes — compute coordinates carefully (Courier New ~0.6em per char).
- Diagrams must teach something real (architecture, flows, hierarchies, comparisons, timelines) — not decoration.
