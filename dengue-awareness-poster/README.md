# Dengue Starts at Home — Awareness Poster

Awareness poster for the Department of Public Health, Independent University, Bangladesh (IUB),
built to the course guideline deck "Guidelines to Develop Awareness Poster/Leaflet" (topic chosen
from the course list: **Dengue**).

## Files

| File | Purpose |
|---|---|
| `poster.html` | Poster source (A-series portrait at CSS scale: 1587 × 2245 px) |
| `dengue-poster-A3.pdf` | Print-ready vector PDF, A3 (297 × 420 mm) |
| `dengue-poster-A2.pdf` | Print-ready vector PDF, A2 (420 × 594 mm) |
| `dengue-poster-A3-300dpi.png` | 3508 × 4961 px image (300 dpi at A3) for sharing or printing |
| `pretest-form.html` / `dengue-pretest-form.pdf` | A4 pre-test questionnaire and tally sheet (guideline step 3) |
| `leaflet.html` / `dengue-leaflet-A4.pdf` | A4 landscape tri-fold leaflet, 2 pages (page 1 outside, page 2 inside) |
| `dengue-leaflet-outside-300dpi.png`, `dengue-leaflet-inside-300dpi.png` | 300 dpi images of each leaflet side |
| `leaflet-cover-scene.png` | Leaflet cover illustration (the poster's scene without labels) |
| `fonts/` | Anton and Hind Siliguri (SIL Open Font License), used for offline rendering |

## The six basic parts (from the guidelines)

1. **Caption** — "DENGUE STARTS AT HOME." with a Bangla line: এডিস মশা জন্মায় ঘরেই — প্রতিরোধ শুরু হোক ঘর থেকেই।
2. **Picture** — a Dhaka apartment building at dusk, cut open, with six Aedes breeding spots marked:
   rooftop tank and tubs, flower-pot trays, AC drip water, fridge drip tray, stored water drums, tyres/shells/packets.
   Also: symptom icons (high fever, severe headache, pain behind the eyes, muscle and joint pain, nausea and vomiting, skin rash).
3. **Key benefits** — "Early care saves lives" and "No still water · No Aedes · No dengue".
4. **Support points** — nearest government hospital, health helpline 16263, emergency 999.
   (These were crossed out as missing on the sample posters in the guidelines.)
5. **Call for actions** — "Find it. Empty it. Cover it. Every 3 days", plus: empty and scrub pots, trays and buckets;
   cover water drums and tanks; throw away tyres, cans, shells and packets; use nets and repellent and wear full sleeves.
   Fever care: test early (NS1), drink plenty, paracetamol only (no aspirin or ibuprofen), sleep under a net.
   Danger signs: severe belly pain, vomiting 3+ times a day, bleeding gums or nose, blood in vomit or stool,
   very tired, restless or irritable — often starting as the fever goes down.
6. **Logo** — Department of Public Health, IUB. **Replace the dashed "IUB LOGO" placeholder in the footer with the
   official IUB logo before printing.**

## The leaflet (A4 tri-fold)

Follows the guideline slide "Instructions for each group": A4 paper, title, key messages and images,
call to action, IUB name and logo. Per the "Crafting messages" slide, key benefits and the call to
action are spelled out in more detail than on the poster.

- **Outside (page 1):** inside flap = "Your 3-day home check" (8-item checklist with Day 1/4/7 boxes) ·
  back = "Where to get help" (hospital, 16263, 999), share prompt, Bangla reminder, credits · front cover.
- **Inside (page 2):** 1 What is dengue? (Aedes facts, how it spreads, higher-risk groups) · 2 Signs to watch for
  (symptoms, danger signs, "any fever in dengue season? get tested") · 3 Have a fever? Act early (five care steps,
  dehydration signs).
- **Printing:** print both pages double-sided, *flip on short edge*, at 100% ("actual size"). Checked to stay
  readable when photocopied in black and white.
- **Folding:** lay the sheet inside-up. Fold the right panel ("Have a fever?") in first, then fold the left panel
  ("What is dengue?") over it. The cover ends up on the front and the checklist is the first thing you see on opening.

## Before printing

- Check the helpline numbers (16263, 999) are still current.
- Insert the official IUB logo (poster footer and leaflet cover), and fill in the group number and course code on the leaflet back.
- Run the pre-test with `dengue-pretest-form.pdf` and get the course teacher's approval (guideline point 6).
- Print an A4 test copy first; check colours and readability from about 2 metres.

## Regenerating the print files

Open `poster.html` in Chromium at a 1587 × 2245 viewport. Screenshot at deviceScaleFactor 3508/1587 for the
A3 300 dpi PNG. Print to PDF at 420 × 594 mm for A2, or at 297 × 420 mm with scale 297/420 (and an
`@page { size: 297mm 420mm }` override) for A3, with backgrounds enabled.
