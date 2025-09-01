# Happy Fun League — Records of Glory & Shame

A tiny React + Vite static site that renders your league history with a snarky table and a wiggly-line chart.

## Quick start (local)

```bash
npm i
npm run dev
```

## Deploy to GitHub Pages (no actions)

This repo is configured to build into the `docs/` folder so you can point GitHub Pages at it directly.

1. Put your CSV and banner here:
   - `public/records_raw_with_owner_names.csv`
   - `public/header.png`
2. Build:
   ```bash
   npm run build
   ```
3. Commit + push.
4. In your repo **Settings → Pages**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (or default) / **Folder**: `/docs`
5. Visit the URL that GitHub gives you.

If you prefer the Actions workflow instead, switch build output back to `dist` in `vite.config.js` and enable Pages with the recommended Vite action.

## Data

On first load the app fetches `public/records_raw_with_owner_names.csv`. Users can still upload an alternate CSV (only for their own browser session). The header art defaults to `public/header.png`, but each viewer can click **Change Art** and save their own in localStorage.

