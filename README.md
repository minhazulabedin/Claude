# Dhaka Utility Service

An offline-capable **Progressive Web App (PWA)** for residents of Dhaka,
Bangladesh. No backend, no build step — just static `HTML/CSS/JS`.

## Features

- **Bill estimator** — electricity (DPDC/DESCO progressive slabs + 5% VAT),
  water (Dhaka WASA + sewerage) and gas (Titas metered/flat), with a full
  itemised breakdown.
- **My Bills** — save accounts, amounts and due dates; overdue / due-soon /
  paid status. Stored locally on your device.
- **Service zones (Voronoi map)** — tap a schematic map of Dhaka to find the
  utility office covering that area, plus the nearest **police station,
  metro (MRT-6) station, fuel/CNG pump, hospital and fire station** with
  approximate distances and tap-to-call.
- **Directory** — emergency and utility hotlines (999, 333, 16xxx).
- **Tips** — habits that lower your bills.

> ⚠️ Tariffs and landmark positions are **approximate, for estimation only**.
> Your official printed bill and the utility hotlines are authoritative.

## Run it locally

```bash
git clone https://github.com/minhazulabedin/Claude.git
cd Claude
git checkout claude/dhaka-utility-service-b19p3s
python3 -m http.server 8000
# open http://localhost:8000
```

Service worker (offline) and "Install / Add to Home Screen" work on
`localhost` and any HTTPS host.

## Deploy (GitHub Pages)

A workflow at `.github/workflows/deploy-pages.yml` deploys this site to
GitHub Pages automatically on every push.

**One-time setup:** in the repo, go to **Settings → Pages → Build and
deployment → Source** and select **GitHub Actions**. (GitHub does not allow
the workflow to enable Pages by itself.)

After that, the app is live at:

> **https://minhazulabedin.github.io/Claude/**

Any other static host (Netlify, Vercel, Cloudflare Pages) also works — point
it at this repo/branch with no build command.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell + tab bar |
| `style.css` | Theme (light/dark) and layout |
| `app.js` | Estimator, bill tracker, Voronoi map, directory, tips |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (offline cache) |
| `icons/` | App icons |
