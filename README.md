# Happy Fun League — Records of Glory & Shame

Static React dashboard and newsletter archive, hosted on
[GitHub Pages](https://engelmanj.github.io/HappyFunLeague/).

Use **Node 24 LTS**. Run commands from this website directory:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
npm audit
```

Open the URL printed by Vite. Development, build, and preview all use the
`/HappyFunLeague/` base path. HashRouter serves the dashboard at `#/` and
newsletters at `#/weekly`, including direct navigation and refreshes.
`npm run check` runs tests and builds. CI checks the website and advisories;
it does not deploy.

The stack is React 18, React Router 7, Recharts 2, Vite 7, and Tailwind 4 through
its Vite plugin. Vitest and Testing Library provide regression tests. DOMPurify
sanitizes newsletter markup, preserving ordinary formatting and inline images.
Use the committed package lock for reproducible installs.

## Public data contract

Keep public inputs in `public/data/`. The browser reads five CSVs:

- `records_raw_with_owner_names.csv`: unique team/season standings, using
  `season`, `team_id`, `team_name`, `owner_first`, `owner_last`, and
  `final_standing` or `team.final_standing`. Every season must have complete
  rankings from 1 to its team count.
- `h2h_games.csv`: canonical H2H input, with season, week, team IDs and finite
  scores. Duplicate season/week/pair keys and self-games are rejected.
- `divisions_by_season.csv`: season, division ID, optional division name.
- `team_divisions.csv`: team/season division assignments.
- `current_teams.csv`: current season, franchise ID, team name, owner first name
  and last initial. These labels do not contribute unfinished-season standings.

Both dashboard tables default to newest-first; the year-order toggle reverses
both tables without changing chart chronology. Narrow screens use a compact
newsletter selector and show a scroll hint when a table overflows.

The existing all-time `h2h_summary.csv` remains an export/reconciliation fixture;
the browser does not add it to games or depend on its incompatible season schema.
Python changes and historical collection are separate work. Do not copy
credentials, raw private snapshots, or unapproved drafts here.

`public/data/weekly/index.json` lists each issue's year, week, title, summary path,
and stats path relative to `public/`. Paths must stay under `data/weekly/`.
`stats.json` supports `trend: [{date, value}]` and `table: [{...}]`; table cells
must be scalar values. Different row shapes align to a common column set.
CSV statistics also support tables and optional date/value trends.

Tests validate shipped dashboard inputs, reconcile H2H totals, and check every
indexed weekly file. Refresh the comparison summary with its corresponding games
when updating annual data. Change contracts and tests explicitly if supporting
additional formats.

## Code map

- `src/App.jsx`: dashboard presentation and selections.
- `src/WeeklyDigest.jsx`: issue selection, loading/error states, presentation.
- `src/lib/data.js`: CSV loading/validation and H2H aggregation.
- `src/lib/digest.js`: issue/index validation, HTML sanitation, image resolution.
- `src/lib/useHeaderImage.js`: optional local header-image override.
- `src/components/ScrollTable.jsx`: shared scrolling table and frozen row labels.
- `src/components/ChartFrame.jsx`: responsive chart container and empty states.
- `src/lib/charts.js`: stable franchise styles, tooltips, and chart scales.
- `tests/`: data integrity and user-interaction regression tests.
- `src/assets/`: imported images; `src/index.css`: styling.
- `docs/`: generated publication output; never edit by hand.

Unused alternate dashboard components/normalizers were removed so fixes reach
the active implementation.

## Build and publication

1. Run `npm run check` and `npm audit`.
2. Run `npm run preview`; inspect both routes, tables, and charts.
3. Review the source and generated `docs/` diff.
4. Commit/push only when publication is authorized. Pages serves `main:/docs`.

Building alone does not publish. Use relative runtime data paths (`data/...`)
and imported images. Reset a header override with
`localStorage.removeItem('hfl_header_art')`; disabled storage is harmless.
