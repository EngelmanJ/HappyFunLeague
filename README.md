# Happy Fun League — Records of Glory & Shame

A lightweight React/Vite site for HFL stats, history, and weekly recaps. Built for GitHub Pages.

- **Live site:** `https://engelmanj.github.io/HappyFunLeague/`
- **Routes:**
  - `/` — main dashboard (records, charts, head-to-head, divisions)
  - `#/weekly` — weekly digest browser

---

## Stack (pinned patterns)

- **Vite 7.x + React 18**
- **react-router-dom 6.30.x** (uses **HashRouter**)
- **Tailwind CSS 4.x** with **`@tailwindcss/postcss`** (and optional `@tailwindcss/vite`)
- **Deploy:** GitHub Pages → build to `docs/`, `base: "./"`
- **Assets rule:**
  - **Images:** `src/assets/*` and **import** them in code (lets Vite rewrite URLs for Pages)
  - **Data:** `public/data/*` fetched via **relative** paths (`data/...`) — **no leading “/”**

---

## Quick start

```bash
# Node 18+ recommended
npm i

# dev
npm run dev

# build → docs/ (publish this to Pages)
npm run build
```

---

## Directory layout

```
/public
  /data/                         # CSV/JSON fetched at runtime
  header.png (legacy fallback)
  favicon-32x32.png, favicon.ico, apple-touch-icon.png, site.webmanifest
/src
  /assets/                       # importable images (Vite rewrites paths)
    logo-180x180.png
    header.png
  /components, /lib
  App.jsx
  WeeklyDigest.jsx
  main.jsx
  index.css
docs/                            # build output for GitHub Pages (generated)
vite.config.js
tailwind.config.js
postcss.config.js
```

---

## Data files

Put runtime data under `public/data/`:

- `public/data/records_raw_with_owner_names.csv` — main dataset for records pages
- `public/data/weekly/index.json` — weekly digest index (and any supporting weekly JSON/CSV)

Fetch them with **relative** URLs, e.g.:

```js
// good
fetch('data/records_raw_with_owner_names.csv')
// good
fetch('data/weekly/index.json')
```

> Don’t use leading slashes (`/data/...`) — those break on GitHub Pages subpaths.

---

## Images & header art

- Default header/logo is imported from `src/assets/logo-180x180.png` so Vite handles the path.
- A user can override via `localStorage.setItem('hfl_header_art', <url>)`.
  To reset: open DevTools console on the site and run:
  ```js
  localStorage.removeItem('hfl_header_art'); location.reload();
  ```
- In code, prefer imports:
  ```jsx
  import defaultLogo from "./assets/logo-180x180.png";
  const [headerImgUrl, setHeaderImgUrl] = useState(defaultLogo);
  ```

---

## Tailwind (v4) configuration

- **`postcss.config.js`**
  ```js
  export default {
    plugins: {
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  }
  ```

- **`src/index.css`** (v4 style)
  ```css
  @import "tailwindcss";
  @source "./index.html";
  @source "./src/**/*.{js,jsx,ts,tsx}";
  /* optional inline safelist for dynamic classes */
  @source inline("bg-slate-950 text-slate-200 border-slate-800 bg-slate-900/60");
  ```

> The old `@tailwind base; @tailwind components; @tailwind utilities;` form was v3-era. v4 prefers the single `@import "tailwindcss"`.

---

## Vite config for GitHub Pages

`vite.config.js` is set to emit to `docs/` and use a **relative base** in production:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  build: { outDir: "docs", assetsDir: "assets" },
}));
```

This works with **HashRouter** and imported images. (Do not use leading slashes for runtime fetches.)

---

## Deploy checklist

1. `npm run build` (emits to `docs/`)
2. Commit and push `docs/`
3. GitHub repo settings → Pages → Source: `main` → `/docs`
4. Hard refresh the site

---

## Troubleshooting

**Site looks unstyled**
- Confirm Tailwind v4 plugin is configured:
  - `postcss.config.js` has `@tailwindcss/postcss`
  - `src/index.css` uses `@import "tailwindcss"` and `@source` lines
- Open `docs/assets/*.css` and search for `.bg-slate-950` or `--tw-` to confirm utilities exist.

**Images show wrong / fallback image**
- Make sure all images are **imported** from `src/assets` in code.
- Clear `localStorage` override:
  ```js
  localStorage.removeItem('hfl_header_art'); location.reload();
  ```

**Data fetch 404s on Pages**
- Check that requests start with `data/...` (no leading `/`).
- Ensure the files are under `public/data/` before building.

**React Router “future” warnings in dev**
- Harmless. Optional opt-in:
  ```jsx
  <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {/* routes */}
  </HashRouter>
  ```

**Chunk size warning on build**
- Safe to ignore. Consider code-splitting later via dynamic `import()` if desired.

---

## Version checks

```bash
node -p "require('tailwindcss/package.json').version"
node -p "require('@tailwindcss/postcss/package.json').version"
node -p "require('vite/package.json').version"
node -p "require('react-router-dom/package.json').version"
```

---

## Conventions

- Keep GH Pages invariants: `docs/` output, `base: "./"`, **HashRouter**, relative data paths.
- Never use leading “/” in runtime asset paths.
- Prefer imported images over string paths.
