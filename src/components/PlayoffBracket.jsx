import React from 'react';

export default function PlayoffBracket({ snapshot, standings, throughWeek }) {
 if(!snapshot) return null;
 const bySeed=new Map(standings.map(t=>[t.seed,t]));
 const roundLabel=round=>round?.length ? `Weeks ${Math.min(...round)}–${Math.max(...round)}` : 'Dates TBD';
 const pair=(a,b)=> <article key={a} className="bracket-match" aria-label={`Seed ${a} versus seed ${b}`}>
  {[a,b].map(seed=>{const team=bySeed.get(seed);return <div key={seed} className="bracket-team"><span className="text-emerald-300 font-bold">#{seed}</span><div><strong>{team.name}</strong><p className="text-xs text-slate-400 mt-1">{team.wins}–{team.losses}–{team.ties} · {team.division}</p></div></div>;})}
 </article>;
 const placeholder=(title,lines)=><article className="bracket-match" key={title}><h5 className="text-sm font-semibold mb-2">{title}</h5>{lines.map(line=><p key={line} className="text-sm text-slate-400 py-2">{line}</p>)}</article>;
 const supported=snapshot.playoffTeamCount===4&&standings.length===12;
 return <section aria-labelledby="playoff-bracket">
  <h3 id="playoff-bracket" className="text-xl font-bold mb-2">If the playoffs started today</h3>
  <p className="text-sm text-slate-400 mb-4">ESPN seeds through Week {throughWeek}. Three division winners and one wildcard qualify; intra-division record is the seeding tiebreaker. Matchups can change before the playoffs.</p>
  {!supported||throughWeek>snapshot.regularSeasonWeeks ? <p className="text-slate-300">See ESPN for the current postseason bracket.</p> : <>
   <div className="bracket-rounds">
    <div><h4 className="font-semibold mb-3">Semifinals <span className="text-slate-400 text-sm">· {roundLabel(snapshot.rounds[0])}</span></h4><div className="space-y-3">{pair(1,4)}{pair(2,3)}</div></div>
    <div><h4 className="font-semibold mb-3">Final round <span className="text-slate-400 text-sm">· {roundLabel(snapshot.rounds[1])}</span></h4><div className="space-y-3">{placeholder('Championship',['Winner of #1 vs #4','Winner of #2 vs #3'])}{placeholder('Third place',['Loser of #1 vs #4','Loser of #2 vs #3'])}</div></div>
   </div>
   {snapshot.consolationEnabled && <details className="mt-4 rounded-xl border border-slate-800 p-4"><summary className="cursor-pointer font-semibold text-slate-200">Consolation ladder · Seeds 5–12</summary>
    <div className="bracket-rounds mt-4"><div><h4 className="font-semibold mb-3">Round 1 · {roundLabel(snapshot.rounds[0])}</h4><div className="space-y-3">{pair(5,6)}{pair(7,8)}{pair(9,10)}{pair(11,12)}</div></div>
     <div><h4 className="font-semibold mb-3">Round 2 · {roundLabel(snapshot.rounds[1])}</h4><div className="space-y-3">{placeholder('Ladder match 5',['Winner of #5 vs #6','Winner of #7 vs #8'])}{placeholder('Ladder match 6',['Loser of #5 vs #6','Winner of #9 vs #10'])}{placeholder('Ladder match 7',['Loser of #7 vs #8','Winner of #11 vs #12'])}{placeholder('Ladder match 8',['Loser of #9 vs #10','Loser of #11 vs #12'])}</div></div>
    </div>
   </details>}
  </>}
 </section>;
}
