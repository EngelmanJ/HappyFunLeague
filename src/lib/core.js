// src/lib/core.js
export const cn = (...xs) => xs.filter(Boolean).join(" ");

export function normalizeRow(r){
  const year = Number(r.season ?? r.year);
  const fs = Number(r.final_standing ?? r["team.final_standing"]);
  const owner = `${r.owner_first ?? ""} ${r.owner_last ?? ""}`.trim();
  return {
    team_id: String(r.team_id ?? ""),
    team_name: String(r.team_name ?? ""),
    owner,
    year: Number.isFinite(year) ? year : undefined,
    final_standing: Number.isFinite(fs) ? fs : undefined
  };
}

export function normalizeH2HSummaryRow(r){
  return {
    season: Number(r.season ?? r.year),
    team_id: String(r.team_id ?? ""),
    opp_id: String(r.opponent_id ?? r.opp_id ?? ""),
    wins: +(r.wins ?? 0),
    losses: +(r.losses ?? 0),
    ties: +(r.ties ?? 0),
    pf: +(r.points_for ?? 0),
    pa: +(r.points_against ?? 0)
  };
}

export function normalizeH2HGameRow(r){
  const season = Number(r.season ?? r.year);
  if(!Number.isFinite(season)) return;
  const a = String(r.team_a_id ?? r.team_id ?? r.home_id ?? "");
  const b = String(r.team_b_id ?? r.opponent_id ?? r.away_id ?? "");
  if(!a || !b) return;
  const as = Number(r.team_a_points ?? r.points_for);
  const bs = Number(r.team_b_points ?? r.points_against);
  let winsA=0, winsB=0, ties=0;
  if(Number.isFinite(as) && Number.isFinite(bs)){
    if(as>bs) winsA=1; else if(bs>as) winsB=1; else ties=1;
  }
  return { season, a, b, as, bs, winsA, winsB, ties };
}

export function normalizeDivisionsBySeasonRow(r){
  return {
    season: +r.season || +r.year,
    division_id: String(r.division_id ?? r.division ?? ""),
    division_name: String(r.division_name ?? r.name ?? r.division ?? "")
  };
}

export function normalizeTeamDivisionRow(r){
  return {
    season: +r.season || +r.year,
    team_id: String(r.team_id ?? ""),
    division_id: String(r.division_id ?? r.division ?? "")
  };
}

export function groupBy(xs, key){
  const m = new Map();
  for(const x of xs){
    const k = key(x);
    if(!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

export function seasonMaxByYear(rows){
  const by = groupBy(rows.filter(r=>Number.isFinite(r.year)&&Number.isFinite(r.final_standing)), r => r.year);
  const mm = new Map();
  for(const [y, list] of by) mm.set(y, Math.max(...list.map(l => l.final_standing)));
  return mm;
}
