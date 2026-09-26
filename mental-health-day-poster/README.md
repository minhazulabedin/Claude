# World Mental Health Day 2026 — Poster (IUB Competition)

Poster for the World Mental Health Day 2026 poster competition at IUB.

**Theme:** "Lived experiences heard: real voices, real change."

## Files

| File | Purpose |
|---|---|
| `poster.html` | Poster source (A2 portrait at CSS scale: 1587 × 2245 px = 420 × 594 mm) |
| `poster-a2-300dpi.png` | Print-ready raster, 4962 × 7019 px (300 dpi at A2) |
| `poster-a2.pdf` | Print-ready vector PDF at true A2 size (420 × 594 mm) |

## Design

- **One clear message:** listening to lived experience leads to real change (slogan: "Listen to the voice, not the label.")
- **Central visual:** a person shares their story (speech bubble with a voice waveform), a listener receives it, and ripples spread outward to a community standing together — listen → value → include → change.
- **Flow band:** Listen → Value → Include → Change with icons and short captions.
- **Call to action:** "Listen without judgement — and include people in the decisions that affect them."
- **Colours:** deep teal `#12626B`, coral `#E0684B`, amber `#E89A3C` on warm ivory `#FAF6EF`; dark ink `#1E2A2B` for text.
- **Fonts:** Fraunces (display) + Work Sans (supporting) — two families, loaded from Google Fonts.

## Spec compliance

- A2 portrait, 420 × 594 mm, ≥300 dpi output
- Main title/theme: 88 px = 66 pt bold (spec 48–72 pt)
- Slogan: 62 px = 46.5 pt (spec 36–48 pt)
- Section headings: 42 px = 31.5 pt (spec 28–36 pt)
- Supporting text: ≥27 px = ≥20 pt (spec 20–24 pt minimum)
- ~60–70% visual, 2 font families, 3 accent colours + neutrals, strong contrast, single dominant visual

## Regenerating the print files

Open `poster.html` in Chromium at a 1587 × 2245 viewport and screenshot at deviceScaleFactor ≈ 3.13 for the 300 dpi PNG; print to PDF at 420 × 594 mm with backgrounds enabled for the PDF (e.g. via Playwright's `page.screenshot` / `page.pdf`).
