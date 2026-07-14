# Voronoi Accessibility Analysis — Dhaka City

Using **Voronoi diagrams** to evaluate how utility services are distributed across Dhaka:
each location is assigned to its **nearest facility**, coverage is scored by distance-to-nearest,
and new-facility sites are recommended where the gap is largest.

**Services analysed (75 facilities):** Metro (MRT-6) · Hospitals · Water (WASA) · Fuel/CNG · Bus stops · Fire stations.

## What's here

| File | What it is |
|------|-----------|
| **`voronoi-dhaka.html`** | The interactive tool — **double-click to open** (no server, works offline). Switch service, toggle heatmap ↔ Voronoi regions, drag the underserved threshold, hover for coordinates/distance. |
| **`report.html`** | The written report (double-click to open, or print to PDF). |
| **`Voronoi-Dhaka-Report.pdf`** | The report as a ready-to-submit PDF. |
| `figures/` | Coverage heatmaps and Voronoi-region maps for every service (PNG). |
| `data/facilities.csv` | The 75 facility coordinates (service, name, lat, lon). |
| `data/neighbourhoods.csv` | 24 reference neighbourhoods used for labelling. |

## Method (in one paragraph)

Facility longitude/latitude are projected equirectangularly about 23.78°N (`1° lat ≈ 110.6 km`,
`1° lon ≈ 101.9 km`). The city polygon is sampled on a 420×740 grid (~30 m/pixel); each interior
pixel is assigned to its nearest facility — the **Voronoi cell** — and stores its **distance** to
that facility. From this we report mean / median / worst access and the share of the city beyond a
threshold, and place new sites by the greedy **largest-empty-circle** rule.

## Key finding

Across all six services, **66–75 % of the city lies more than 1.5 km from the nearest facility**.
The consistently underserved areas are the **eastern belt (Bashundhara–Badda)** and the
**northern & north-western periphery (Dakshinkhan, Uttarkhan, Turag)**. The metro has the most
facilities yet the worst accessibility, because its stations are collinear and leave the east far away.

> **Data disclaimer.** Coordinates are hand-compiled approximations for a methodological case study —
> not an official register. Distances are straight-line, not road-network. Treat magnitudes as indicative.
