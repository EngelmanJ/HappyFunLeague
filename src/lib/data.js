import { toDivFull } from './divisions';
import { validateSeason } from './currentSeason';
import Papa from 'papaparse';

const first = (...values) => values.find(v => v != null && String(v).trim() !== '');
const number = v => v == null || String(v).trim() === '' ? NaN : Number(v);
export const cn = (...xs) => xs.filter(Boolean).join(' ');

export function normalizeRow(r) {
  const year = number(first(r.season, r.year));
  const final_standing = number(first(r.final_standing, r['team.final_standing']));
  const team_id = String(first(r.team_id) ?? '');
  if (!team_id || !Number.isInteger(year) || !Number.isInteger(final_standing) || final_standing < 1) throw new Error('Invalid team standing');
  return { team_id, team_name: String(r.team_name ?? ''), owner: `${r.owner_first ?? ''} ${r.owner_last ?? ''}`.trim(), year, final_standing };
}

export function normalizeH2HGameRow(r) {
  const season = number(first(r.season, r.year));
  const week = number(r.week);
  const a = String(first(r.team_a_id, r.team_id, r.home_id) ?? '');
  const b = String(first(r.team_b_id, r.opponent_id, r.away_id) ?? '');
  const as = number(first(r.team_a_points, r.points_for));
  const bs = number(first(r.team_b_points, r.points_against));
  if (!Number.isInteger(season) || !Number.isInteger(week) || week < 1 || !a || !b || a === b || !Number.isFinite(as) || !Number.isFinite(bs)) throw new Error('Invalid head-to-head game');
  return { season, week, a, b, as, bs, winsA: +(as > bs), winsB: +(bs > as), ties: +(as === bs) };
}

export function normalizeCurrentTeam(r) {
  const season = number(r.season);
  const team_id = String(r.team_id ?? '').trim();
  const team_name = String(r.team_name ?? '').trim();
  const owner = `${r.owner_first ?? ''} ${r.owner_last ?? ''}`.trim();
  if (!Number.isInteger(season) || !team_id || !team_name || !owner) throw new Error('Invalid current team');
  return { season, team_id, team_name, owner };
}

export function normalizeDivisionsBySeasonRow(r) {
  return { season: number(first(r.season, r.year)), division_id: String(first(r.division_id, r.division) ?? ''), division_name: String(first(r.division_name, r.name, r.division) ?? '') };
}
export function normalizeTeamDivisionRow(r) {
  return { season: number(first(r.season, r.year)), team_id: String(r.team_id ?? ''), division_id: String(first(r.division_id, r.division) ?? '') };
}
export function groupBy(xs, key) {
  const m = new Map();
  for (const x of xs) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
}
export function seasonMaxByYear(rows) {
  return new Map([...groupBy(rows, r => r.year)].map(([year, list]) => [year, Math.max(...list.map(r => r.final_standing))]));
}
export function buildH2HIndex(games) {
  const index = new Map();
  const seen = new Set();
  for (const g of games) {
    const gameKey = JSON.stringify([g.season, g.week, ...[g.a, g.b].sort()]);
    if (seen.has(gameKey)) throw new Error('Duplicate head-to-head game');
    seen.add(gameKey);
    for (const [team, opp, wins, losses, pf, pa] of [[g.a, g.b, g.winsA, g.winsB, g.as, g.bs], [g.b, g.a, g.winsB, g.winsA, g.bs, g.as]]) {
      const key = `${g.season}__${team}__${opp}`;
      const rec = index.get(key) ?? { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 };
      rec.wins += wins; rec.losses += losses; rec.ties += g.ties; rec.pf += pf; rec.pa += pa;
      index.set(key, rec);
    }
  }
  return index;
}
export function parseCSV(text, normalize = r => r) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });
  if (result.errors.length || !result.data.length) throw new Error('Empty or malformed CSV');
  return result.data.map(normalize);
}
export async function fetchText(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.text();
}
export async function loadCurrentSeason(signal, context) {
 const [season, currentTeams, teamDivisions] = await Promise.all([
  fetchText('data/current_season.json',signal).then(text=>validateSeason(JSON.parse(text))),
  context ? context.currentTeams : fetchText('data/current_teams.csv',signal).then(text=>parseCSV(text,normalizeCurrentTeam)),
  context ? context.teamDivisions : fetchText('data/team_divisions.csv',signal).then(text=>parseCSV(text,normalizeTeamDivisionRow)),
 ]);
 return {...season,teams:season.teams.map(t=>{
  const identity=currentTeams.find(c=>c.team_id===t.id&&c.season===season.season);
  const division=teamDivisions.filter(d=>d.team_id===t.id&&d.season<=season.season).sort((a,b)=>b.season-a.season)[0];
  if(!identity || !division)throw Error('Missing current team identity or division');
  const official=season.espn?.teams.find(row=>row.id===t.id);
  return {...t,name:identity.team_name,owner:identity.owner,divisionId:official?.divisionId ?? division.division_id,division:official?.division ?? toDivFull(division.division_id)};
 })};
}
export async function loadDashboard(signal) {
  const specs = [
    ['records_raw_with_owner_names.csv', normalizeRow],
    ['h2h_games.csv', normalizeH2HGameRow],
    ['divisions_by_season.csv', normalizeDivisionsBySeasonRow],
    ['team_divisions.csv', normalizeTeamDivisionRow],
    ['current_teams.csv', normalizeCurrentTeam],
  ];
  const [rows, games, divisions, teamDivisions, currentTeams] = await Promise.all(specs.map(async ([file, normalize]) => parseCSV(await fetchText(`data/${file}`, signal), normalize)));
  for (const [year, teams] of groupBy(rows, r => r.year)) {
    const standings = teams.map(r => r.final_standing).sort((a, b) => a - b);
    if (new Set(teams.map(r => r.team_id)).size !== teams.length || standings.some((v, i) => v !== i + 1)) throw new Error(`Incomplete or duplicate standings for ${year}`);
  }
  const currentSeason = await loadCurrentSeason(signal, {currentTeams, teamDivisions});
  const currentIds = new Set(currentTeams.map(t=>t.team_id));
  if(currentSeason.season!==currentTeams[0]?.season || currentSeason.teams.length!==currentTeams.length || currentSeason.teams.some(t=>!currentIds.has(t.id))) throw Error('Current season identities disagree');
  // The current season is authoritative for its games; final seasons stay in the archive.
  const combinedGames = [...games.filter(g=>g.season!==currentSeason.season),...currentSeason.games];
  buildH2HIndex(combinedGames); // Reject duplicate games before committing any dashboard state.
  for (const d of [...divisions, ...teamDivisions]) if (!Number.isInteger(d.season) || !d.division_id) throw new Error('Invalid division data');
  const historyIds = new Set(rows.map(r => r.team_id));
  if (new Set(currentTeams.map(r => r.team_id)).size !== currentTeams.length ||
      new Set(currentTeams.map(r => r.season)).size !== 1 ||
      currentTeams.some(r => !historyIds.has(r.team_id) || r.season < Math.max(...rows.map(r => r.year)))) throw new Error('Review current franchise links');
  return { rows, games: combinedGames, divisions, teamDivisions, currentTeams, currentSeason };
}
