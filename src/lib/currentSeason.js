export function validateSeason(raw) {
 if (!Number.isInteger(raw?.season) || !Number.isInteger(raw.throughWeek) || raw.throughWeek < 1 || !Array.isArray(raw.teams) || raw.teams.length < 2 || !Array.isArray(raw.games)) throw Error('Invalid current season');
 const ids=new Set(raw.teams.map(t=>t.id));
 if(ids.size!==raw.teams.length || raw.teams.some(t=>typeof t.id!=='string'||!t.id||typeof t.name!=='string'||!t.name)) throw Error('Invalid season teams');
 for (const g of raw.games) {
  if(g.season!==raw.season || !Number.isInteger(g.week)||g.week<1||g.week>raw.throughWeek||!ids.has(g.a)||!ids.has(g.b)||g.a===g.b||!Number.isFinite(g.as)||!Number.isFinite(g.bs)||g.as<0||g.bs<0||![null,g.a,g.b].includes(g.winner)) throw Error('Invalid season game');
  if(g.as!==g.bs && g.winner!==(g.as>g.bs?g.a:g.b)) throw Error('Winner disagrees with score');
 }
 for(let week=1;week<=raw.throughWeek;week++) {
  const played=raw.games.filter(g=>g.week===week).flatMap(g=>[g.a,g.b]);
  if(played.length!==ids.size||new Set(played).size!==ids.size) throw Error('Missing or duplicate weekly games');
 }
 const normalized = {...raw,games:raw.games.map(g=>({...g,winsA:+(g.winner===g.a),winsB:+(g.winner===g.b),ties:+(g.winner===null)}))};
 if(raw.espn) validateEspn(raw.espn, normalized);
 return normalized;
}
export function validateEspn(snapshot, season) {
 if(snapshot.source!=='ESPN'||snapshot.season!==season.season||snapshot.throughWeek!==season.throughWeek||!Number.isFinite(Date.parse(snapshot.fetchedAt))||!Array.isArray(snapshot.teams)||snapshot.teams.length!==season.teams.length) throw Error('ESPN snapshot week or teams mismatch');
 const ids=new Set(season.teams.map(t=>t.id));
 if(new Set(snapshot.teams.map(t=>t.id)).size!==ids.size||snapshot.teams.some(t=>!ids.has(t.id))||snapshot.teams.map(t=>t.seed).sort((a,b)=>a-b).some((s,i)=>s!==i+1)) throw Error('Invalid ESPN seeds');
 if(!Number.isInteger(snapshot.playoffTeamCount)||snapshot.playoffTeamCount<2||snapshot.playoffTeamCount>ids.size||!Number.isInteger(snapshot.regularSeasonWeeks)||snapshot.regularSeasonWeeks<1||typeof snapshot.seedRule!=='string'||!Array.isArray(snapshot.rounds)||snapshot.rounds.length<2||snapshot.rounds.some(r=>!Array.isArray(r)||!r.length||r.some(w=>!Number.isInteger(w)||w<=snapshot.regularSeasonWeeks))) throw Error('Invalid playoff settings');
 const calculated=seasonStats({...season,espn:null}).standings;
 for(const team of snapshot.teams) {
  const totals=calculated.find(t=>t.id===team.id);
  for(const key of ['wins','losses','ties','pf','pa']) if(!Number.isFinite(team[key])||Math.abs(team[key]-totals[key])>0.001) throw Error('ESPN standings disagree with completed games');
  if(typeof team.division!=='string'||!team.division||typeof team.divisionId!=='string'||!Number.isFinite(team.pct)||Math.abs(team.pct-totals.pct)>0.001||!Number.isFinite(team.gamesBack)||team.gamesBack<0||!(team.playoffPct===null||(Number.isFinite(team.playoffPct)&&team.playoffPct>=0&&team.playoffPct<=1))) throw Error('Invalid ESPN standings');
  for(const key of ['divisionRecord','homeRecord','awayRecord']) if(!Array.isArray(team[key])||team[key].length!==3||team[key].some(n=>!Number.isInteger(n)||n<0)) throw Error('Invalid split records');
  for(let i=0;i<3;i++) if(team.homeRecord[i]+team.awayRecord[i]!==[team.wins,team.losses,team.ties][i]||team.divisionRecord[i]>[team.wins,team.losses,team.ties][i]) throw Error('Inconsistent split records');
  if(!team.streak||!['WIN','LOSS','TIE','NONE'].includes(team.streak.type)||!Number.isInteger(team.streak.length)||team.streak.length<0||!(team.moves===null||(Number.isInteger(team.moves)&&team.moves>=0))) throw Error('Invalid streak or transactions');
 }
}
export function seasonStats(season) {
 const teams=new Map(season.teams.map(t=>[t.id,{...t,wins:0,losses:0,ties:0,pf:0,pa:0}]));
 const trend=Array.from({length:season.throughWeek},(_,i)=>({week:i+1}));
 for(const g of season.games) for(const [id,opp,points,against] of [[g.a,g.b,g.as,g.bs],[g.b,g.a,g.bs,g.as]]) {
  const t=teams.get(id);t.pf+=points;t.pa+=against;t.wins+=+(g.winner===id);t.losses+=+(g.winner===opp);t.ties+=+(g.winner===null);trend[g.week-1][id]=points;
 }
 const standings=[...teams.values()].map(t=>({...t,pct:(t.wins+t.ties/2)/(t.wins+t.losses+t.ties)})).sort((a,b)=>b.pct-a.pct||b.pf-a.pf||a.name.localeCompare(b.name));
 standings.forEach((t,i)=>t.rank=i&&t.pct===standings[i-1].pct&&t.pf===standings[i-1].pf?standings[i-1].rank:i+1);
 if(season.espn) {
  const official=new Map(season.espn.teams.map(t=>[t.id,t]));
  for(const team of standings) Object.assign(team,official.get(team.id),{rank:official.get(team.id).seed});
  standings.sort((a,b)=>a.seed-b.seed);
 }
 return {standings,trend};
}
