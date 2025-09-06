# HFL Repo Assets

Contents:
- public/assets/hfl-header-*.png
- public/assets/division-colors.json
- src/lib/colors.js
- src/lib/core.js

Copy these into your repo (keep folder structure). In your code:

```js
import { divisionPillStyle, divisionBandStyle } from "./src/lib/colors";
import { cn, normalizeRow } from "./src/lib/core";
```
