# World Mental Health Day 2026 — Poster (IUB Competition)

Poster for the World Mental Health Day 2026 poster competition at IUB.

**Theme:** "Lived experiences heard: real voices, real change."

## Files

| File | Purpose |
|---|---|
| `poster.html` | Poster source (A2 portrait at CSS scale: 1587 × 2245 px = 420 × 594 mm) |
| `poster-a2-300dpi.png` | Print-ready raster, 4962 × 7019 px (300 dpi at A2) |
| `poster-a2.pdf` | Print-ready vector PDF at true A2 size (420 × 594 mm) |

## Layout (reading order, top to bottom)

1. **Theme** — the 2026 theme line, written exactly, as the main title, with the event kicker (IUB · World Mental Health Day · 10 October 2026).
2. **Slogan** — "Listen to the voice, not the label." on a folded ribbon.
3. **Central visual** — a speaker's tangled inner story becomes a voice inside a glowing heart-shaped speech bubble; a listener receives it with a heart in mind; between them a diverse community stands on common ground (peers with an arm around each other, a wheelchair user, a child, an elder, a person raising a hand to take part) while hearts and butterflies rise.
4. **Where inclusion happens** — Families · Universities · Workplaces · Communities.
5. **What "lived experience" means** — five speech bubbles: living with a condition, seeking & receiving care, recovering, supporting someone, facing barriers to help.
6. **From being heard to real change** — Before → Listen → Value → Include → Change, grouped under the four domains (Problem · Voice · Action · Change), with Voice marked as the poster's focus. Captions carry stigma/exclusion, listening without judgement, lived experience as expertise, "Nothing about us, without us", and dignity / better support / less stigma. The path shifts from grey (before) through teal to amber (change).
7. **Call to action** — "Listen without judgement — and include people in the decisions that affect them." plus four actions: offer peer support, ask what they need (person-centred care), respect privacy, challenge stigma.
8. **Respect line** — "Every story is different — share with consent, listen with respect."
9. **Footer** — #RealVoicesRealChange · Poster Exhibition · IUB · 13 October 2026.

## Spec compliance

- A2 portrait, 420 × 594 mm, 300 dpi output
- Main title/theme: 92 px ≈ 69 pt bold (spec 48–72 pt)
- Slogan: 50 px ≈ 37.5 pt (spec 36–48 pt)
- Section headings: 40 px = 30 pt (spec 28–36 pt)
- Supporting text: ≥ 27 px ≈ 20 pt everywhere (spec 20–24 pt minimum)
- Two font families: Fraunces (display) + Work Sans (text)
- Colours: teal `#12626B`, coral `#E0684B`, amber `#E89A3C` on warm ivory `#FAF6EF` (with darker/lighter tints of the same hues and a neutral grey for the "before" state)
- One dominant visual; icons, speech bubbles and a before → voice → action → change sequence as infographics
- Dignified, non-identifiable figures; no distressing imagery

## Regenerating the print files

Open `poster.html` in Chromium at a 1587 × 2245 viewport and screenshot at deviceScaleFactor ≈ 3.13 for the 300 dpi PNG; print to PDF at 420 × 594 mm with backgrounds enabled for the PDF (e.g. via Playwright's `page.screenshot` / `page.pdf`).
