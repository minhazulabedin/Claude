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
- **Central visual:** two detailed profile silhouettes face each other — the speaker's tangled thoughts become a flowing line into a heart-shaped speech bubble carrying a voice waveform; the listener holds a heart in mind; ripples, butterflies and rising hearts spread to a diverse community (seven varied figures, including a child) standing on common ground with corner foliage.
- **Decorative system:** double frame with corner diamonds, ornamental rules with diamond glyphs, folded-ribbon slogan banner, swash underline, dotted-path flow with numbered double-ring medallions, oversized quote marks in the CTA band, sparkle accents, dot-grid texture patches, and soft background arcs and tint blobs.
- **Flow band:** "From being heard to real change" — Listen → Value → Include → Change medallions with icons, numbers and short captions.
- **Call to action:** "Listen without judgement — and include people in the decisions that affect them."
- **Colours:** deep teal `#12626B` / ink teal `#0E3A40`, coral `#E0684B` / deep coral `#B5472E`, amber `#E89A3C` / gold `#C9822F` on warm ivory `#FAF6EF`; dark ink `#1E2A2B` for text (three hue families used consistently).
- **Fonts:** Fraunces (display, incl. italic) + Work Sans (supporting) — two families, loaded from Google Fonts.

## Spec compliance

- A2 portrait, 420 × 594 mm, ≥300 dpi output
- Main title/theme: 88 px = 66 pt bold (spec 48–72 pt)
- Slogan: 62 px = 46.5 pt (spec 36–48 pt)
- Section headings: 42 px = 31.5 pt (spec 28–36 pt)
- Supporting text: ≥27 px = ≥20 pt (spec 20–24 pt minimum)
- ~60–70% visual, 2 font families, 3 accent colours + neutrals, strong contrast, single dominant visual

## Regenerating the print files

Open `poster.html` in Chromium at a 1587 × 2245 viewport and screenshot at deviceScaleFactor ≈ 3.13 for the 300 dpi PNG; print to PDF at 420 × 594 mm with backgrounds enabled for the PDF (e.g. via Playwright's `page.screenshot` / `page.pdf`).
