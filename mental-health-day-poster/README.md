# From Being Heard to Creating Change — Poster & Leaflet

World Mental Health Day 2026 poster and A4 tri-fold leaflet, Independent University, Bangladesh (IUB).
Prepared by **Group 12 · Health and Society**, from the group's own notes (30-09-26).

- **Title (group's):** "From Being Heard to Creating Change"
- **Theme line (exact, on the ribbon under the title):** "Lived experiences heard: real voices, real change."
- **Slogan (group's):** "Your voice can start a conversation. Your action can create change."
- **Steps:** Speak → Be heard → Take action → Create change (poster); Speak → Listen → Understand → Act → Create change (leaflet)
- **Call to action (group's):** "Join the conversation — be a part of it. Work together and take small, meaningful steps."
- **Domain:** Positive Change (dignity, better support, reduced stigma), marked "Our focus" on the poster.

## Files

| File | Purpose |
|---|---|
| `poster.html` | Poster source (A2 portrait at CSS scale: 1587 × 2245 px = 420 × 594 mm) |
| `poster-a2-300dpi.png` | Print-ready raster, 4962 × 7019 px (300 dpi at A2) |
| `poster-a2.pdf` | Print-ready vector PDF at true A2 size (420 × 594 mm) |
| `leaflet.html` / `leaflet-A4.pdf` | A4 landscape tri-fold leaflet, 2 pages (page 1 outside, page 2 inside) |
| `leaflet-outside-300dpi.png`, `leaflet-inside-300dpi.png` | 300 dpi images of each leaflet side |
| `leaflet-cover-scene.png` | Leaflet cover illustration (the poster's bridge scene) |
| `people/` | Photo cut-outs used in the scene (`couple.png`, `unheard.png`, `community.png`); faces blurred |
| `fonts/` | Fraunces and Work Sans (SIL Open Font License), used for offline rendering |

## The poster

- **Title:** the group's title "From Being Heard to Creating Change" (92 px ≈ 69 pt bold).
- **Theme line:** written exactly on the coral ribbon underneath.
- **Central visual (about 40% of the sheet):** a bridge made of speech bubbles. The people are real-looking photo
  cut-outs with blurred faces, set into the drawn scene (the layout follows the group's mockup).
  - **Left, "Unheard":** a grey cliff with signposts reading STIGMA, SILENCE, LEFT OUT. A faded grey person walks
    away, head down; their faint speech bubble is where the bridge begins.
  - **The bridge:** the bubbles change from grey "…", to teal voice waves, to coral and amber hearts (spoken,
    heard, valued).
  - **The top:** two young people hold hands under a glowing heart: the moment of being heard.
  - **Right, "Heard & included":** under a rising sun, four friends, one in a wheelchair, sit at a round table.
    An empty chair is pulled out: "A seat at the table".
  - **The gap:** a path winds through a meadow under the bridge, with the group's slogan over it.
- **Journey ("How being heard becomes change"):**
  - Speak: share your thoughts, concerns and ideas.
  - Be heard: listen to others and understand different perspectives.
  - Take action: work together to turn ideas into meaningful action.
  - Create change (our focus): small actions can create a better community.
- **Call to action:** "Join the conversation — be a part of it. Work together and take small, meaningful steps."
  It comes with three example small steps: offer peer support, challenge stigma, check in on a friend.
- **Respect line:** "Every story is different — share with consent, listen with respect."

## The leaflet (A4 tri-fold)

- **Inside (page 2):** the group's five leaflet steps, each with its own line from the notes and three things to try.
  - Speak: "Don't be afraid to share your ideas and concerns."
  - Listen: "Respect other people's opinions and experience."
  - Understand: "Hear from different perspectives and identify what needs to change."
  - Act: "Work together and take small, meaningful steps."
  - Create change: "Small actions can create a better community."
  - Also: what lived experience means, why being heard matters, "Nothing about us, without us",
    and words to say or avoid when listening.
- **Outside (page 1):**
  - **Inside flap:** "My small step this week", a tick-box pledge with space for your own step.
  - **Back:** where to find support (someone you trust, university counselling, Shastho Batayon 16263, emergency 999),
    "Share with care", when to check in, and the Group 12 credit.
  - **Front cover:** the title, the bridge scene, the theme line, the slogan and the five steps.
- **Printing:** print both pages double-sided, *flip on short edge*, at 100% ("actual size").
- **Folding:** lay the sheet inside-up. Fold the right panel (Act / Create change) in first, then fold the left panel
  (Speak) over it. The cover ends up on the front, and the "My small step" checklist is the first thing you see on opening.

## Spec compliance (poster)

- A2 portrait, 420 × 594 mm, 300 dpi output
- Font sizes:
  - title 92 px ≈ 69 pt bold (48–72)
  - slogan 50 px = 37.5 pt (36–48)
  - section heading and step titles 40 px = 30 pt (28–36)
  - all supporting text ≥ 27 px ≈ 20 pt
- About 125 words; roughly 60% visual
- Two font families: Fraunces + Work Sans
- Strict palette: teal `#12626B`, coral `#E0684B`, amber `#E89A3C`, plus ink `#1E2A2B` and ivory `#FAF6EF`
- People are dignified and cannot be identified: every face is blurred, and there is no distressing imagery.
  Distress is shown only as a faded grey figure walking away, never as a suffering person.

## About the photo people

The people were cut out of the group's own AI-generated mockup image (724 × 1024 px), cleaned and placed
into the vector poster. Faces that were still visible were blurred. Everything else on the poster is vector and
prints sharp; the people print soft when seen up close (fine from normal poster-viewing distance). For a
sharper A2 print, replace the three files in `people/` with higher-resolution versions (same poses, transparent
background) and re-render. Ideally use free-licence stock photos (Unsplash or Pexels, faces hidden or blurred),
and credit them here.

## Before submitting

- Check the helpline numbers (16263, 999) are still current.
- Print an A4 test copy of the poster (teal often prints darker) and check it in greyscale.
- Print one leaflet double-sided and fold it to check the panel order.
- Add team member names if the competition or course asks for them. The group's note says the names go on top of
  the white submission file.

## Regenerating the print files

- **Poster:** open `poster.html` in Chromium at a 1587 × 2245 viewport. Screenshot at deviceScaleFactor ≈ 3.13
  for the 300 dpi PNG. Print to PDF at 420 × 594 mm with backgrounds enabled.
- **Leaflet:** open `leaflet.html` at a 1123 px wide viewport. Screenshot each `.sheet` at deviceScaleFactor
  3508/1123. Print to PDF at 297 × 210 mm with backgrounds enabled.
