# World Mental Health Day 2026 — Poster (IUB Competition)

Poster for the World Mental Health Day 2026 poster competition at IUB.

**Theme:** "Lived experiences heard: real voices, real change."

## Files

| File | Purpose |
|---|---|
| `poster.html` | Poster source (A2 portrait at CSS scale: 1587 × 2245 px = 420 × 594 mm) |
| `poster-a2-300dpi.png` | Print-ready raster, 4962 × 7019 px (300 dpi at A2) |
| `poster-a2.pdf` | Print-ready vector PDF at true A2 size (420 × 594 mm) |

## Design approach

Built against the brief's own final checklist: one message, one domain (Voice), minimal text,
one dominant visual. The illustration carries the content instead of text panels.

- **Theme** — the 2026 theme line, written exactly, as the main title (≈69 pt bold).
- **Slogan** — "Listen to the voice, not the label." on a ribbon (≈37.5 pt).
- **Central visual (~40% of the sheet)** — a speaker's tangled inner story becomes a voice inside a
  heart-shaped speech bubble; a listener receives it with a heart in mind. In front, a diverse
  community stands together, and five speech bubbles rise from it naming the lived experiences in the
  brief: living with a condition, seeking care, recovering, supporting someone, facing barriers.
  Places are shown through props rather than words: a parent holding a child's hand (family), a
  graduation cap (university), a work lanyard (workplace), the crowd itself (community). Peer support
  (an arm around a friend), a wheelchair user, an elder and a raised hand (taking part) show inclusion.
- **Journey** — Before → Listen → Value → Include → Change, with "Voice · our focus" marking the
  chosen domain. The path runs from muted ink (stigma and silence) through teal to amber (change).
- **Call to action** — "Listen without judgement. Include people in decisions that affect them."
  plus two actions: offer peer support, challenge stigma.

## Spec compliance

- A2 portrait, 420 × 594 mm, 300 dpi output
- Main title 92 px ≈ 69 pt bold (48–72); slogan 50 px ≈ 37.5 pt (36–48); headings 40 px = 30 pt (28–36);
  all supporting text ≥ 27 px ≈ 20 pt
- 75 words in total; roughly 65–70% visual
- Two font families: Fraunces + Work Sans
- Strict palette: teal `#12626B`, coral `#E0684B`, amber `#E89A3C`, plus ink `#1E2A2B` and ivory `#FAF6EF`
- Dignified, non-identifiable figures; no distressing imagery

## Before submitting

- Print an A4 test copy (teal often prints darker) and check it in greyscale.
- View it from about 3 metres and as a thumbnail — the title, slogan and scene should read in seconds.
- Add team names (up to 3) if the competition rules ask for them on the poster.

## Regenerating the print files

Open `poster.html` in Chromium at a 1587 × 2245 viewport and screenshot at deviceScaleFactor ≈ 3.13 for the 300 dpi PNG; print to PDF at 420 × 594 mm with backgrounds enabled for the PDF (e.g. via Playwright's `page.screenshot` / `page.pdf`).
