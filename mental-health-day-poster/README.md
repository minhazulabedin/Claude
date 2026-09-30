# World Mental Health Day 2026 — Poster (IUB Competition)

Poster for the World Mental Health Day 2026 poster competition at IUB.

**Theme:** "Lived experiences heard: real voices, real change."
**Chosen message:** "From being heard to creating change" (listening leads to better support).
**Slogan (original):** "Listening is where change begins."

## Files

| File | Purpose |
|---|---|
| `poster.html` | Poster source (A2 portrait at CSS scale: 1587 × 2245 px = 420 × 594 mm) |
| `poster-a2-300dpi.png` | Print-ready raster, 4962 × 7019 px (300 dpi at A2) |
| `poster-a2.pdf` | Print-ready vector PDF at true A2 size (420 × 594 mm) |
| `fonts/` | Fraunces and Work Sans (SIL Open Font License), used for offline rendering |

## Design approach

One message, told as one picture. The message is a journey, so the central visual is a bridge.

- **Theme**: the 2026 theme line, written exactly, as the main title (≈69 pt bold).
- **Message**: "From being heard to creating change" on the ribbon under the title (37.5 pt).
- **Central visual (about 40% of the sheet)**: a bridge made of speech bubbles.
  - **Left, "Unheard":** a grey cliff with signposts reading STIGMA, SILENCE, LEFT OUT. A faded,
    dashed figure tries to speak, and its first faint speech bubble is where the bridge begins.
  - **The bridge:** the bubbles change from grey "…" (unheard), to teal voice waves (speaking), to
    coral and amber hearts (heard and valued). Footprints show the speaker has walked across.
  - **The top:** the speaker meets a listener and they hold hands under a glowing heart, the moment
    of being heard.
  - **Right, "Heard & included":** a warm bank under a rising sun. A diverse community (a woman in a
    hijab, a young person, an elder, a wheelchair user) sits at a round table. An empty chair is
    pulled out for the speaker: "A seat at the table".
  - **The gap:** the slogan "Listening is where change begins." sits over the gap.
- **Journey ("How being heard becomes change")**: Listen → Value → Include → Create change, with
  "Our focus" over *Create change*. The line runs from teal to amber, like the bridge.
  - "Include" carries the lived-experience principle "Nothing about us, without us."
  - "Create change" names the result: better support, dignity and less stigma.
- **Call to action**: "Listen without judgement. Include people in decisions that affect them." plus
  two concrete actions: offer peer support, challenge stigma.
- **Respect line**: "Every story is different — share with consent, listen with respect."

## Spec compliance

- A2 portrait, 420 × 594 mm, 300 dpi output
- Font sizes:
  - main title 92 px ≈ 69 pt bold (48–72)
  - message ribbon 50 px = 37.5 pt and slogan 54 px ≈ 40.5 pt (36–48)
  - section heading 40 px = 30 pt (28–36)
  - all supporting text ≥ 27 px ≈ 20 pt
- About 100 words in total; roughly 65–70% visual
- Two font families: Fraunces + Work Sans
- Strict palette: teal `#12626B`, coral `#E0684B`, amber `#E89A3C`, plus ink `#1E2A2B` and ivory `#FAF6EF`
- Figures are dignified and cannot be identified, and there is no distressing imagery. Distress is shown
  only as greyness and a faded outline, never as a suffering person.

## Before submitting

- Print an A4 test copy (teal often prints darker) and check it in greyscale.
- View it from about 3 metres and as a thumbnail. The title, message and bridge should read in seconds.
- Add team names (up to 3) if the competition rules ask for them on the poster.

## Regenerating the print files

Open `poster.html` in Chromium at a 1587 × 2245 viewport and screenshot at deviceScaleFactor ≈ 3.13 for the 300 dpi PNG; print to PDF at 420 × 594 mm with backgrounds enabled for the PDF (e.g. via Playwright's `page.screenshot` / `page.pdf`).
