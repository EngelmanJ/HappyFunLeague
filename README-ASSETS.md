# README-ASSETS.md

## Assets guide

This project deploys to GitHub Pages, so paths matter. Follow these rules to avoid broken images in production.

### Where to put things

- **Importable images (preferred):** `src/assets/*`  
  Import in code so Vite rewrites URLs correctly:
  ```jsx
  import logo180 from "./assets/logo-180x180.png";
  <img src={logo180} alt="HFL logo" />
  ```
- **Runtime data (CSV/JSON):** `public/data/*`  
  Fetch with **relative** paths: `fetch('data/file.csv')`

### Do not

- Don’t use leading slashes in runtime paths (`/logo.png`, `/data/...`) — they break on Pages subpaths.
- Don’t climb directories in paths (`../logo.png`) — that escapes the repo path on Pages.

### Header art override

- Stored under `localStorage['hfl_header_art']`.
- Reset from the browser console:
  ```js
  localStorage.removeItem('hfl_header_art'); location.reload();
  ```
- In code, always seed with an imported default and only accept an override if it loads:
  ```jsx
  import defaultLogo from "./assets/logo-180x180.png";
  const [headerImgUrl, setHeaderImgUrl] = useState(defaultLogo);
  useEffect(() => {
    const url = localStorage.getItem("hfl_header_art");
    if (!url) return;
    const img = new Image();
    img.onload = () => setHeaderImgUrl(url);
    img.onerror = () => localStorage.removeItem("hfl_header_art");
    img.src = url;
  }, []);
  ```

### File formats & tips

- Prefer **PNG** or **SVG** for logos/UI; use **JPG** for photos.
- Keep logos ≤ 512×512 unless there’s a reason to go bigger.
- Optimize with `pngquant`/`svgo`/`imagemin` (smaller = faster Pages loads).

### Alt text

- Use meaningful `alt` text for accessibility and SEO:
  ```jsx
  <img src={logo180} alt="Happy Fun League logo" />
  ```
