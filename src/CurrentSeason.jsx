import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from './components/SiteHeader';
import ScrollTable, { FrozenCell } from './components/ScrollTable';
import ChartFrame from './components/ChartFrame';
import PlayoffBracket from './components/PlayoffBracket';
import { loadCurrentSeason } from './lib/data';
import { seasonStats } from './lib/currentSeason';
import { seriesStyle, chartTooltipProps } from './lib/charts';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
const points = n => n.toLocaleString(undefined,{maximumFractionDigits:2});
export default function CurrentSeason() {
 const [season,setSeason]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[selected,setSelected]=useState([]);
 useEffect(()=>{
  const controller=new AbortController();let active=true;setError('');
  loadCurrentSeason(controller.signal).then(data=>{if(active){setSeason(data);setSelected(data.teams.slice(0,3).map(t=>t.id));}}).catch(()=>{if(active)setError('Could not load the current season.');});
  return ()=>{active=false;controller.abort();};
 },[retry]);
 const [expanded,setExpanded]=useState([]);
 const [divisionFilter,setDivisionFilter]=useState('');
 const stats=useMemo(()=>season?seasonStats(season):null,[season]);
 const visibleStandings=stats?.standings.filter(t=>!divisionFilter||t.division===divisionFilter) ?? [];
 const names=new Map(season?.teams.map(t=>[t.id,t.name]));
 return <div className="min-h-screen bg-slate-950 text-slate-100"><SiteHeader />
  <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
   {error?<p role="alert">{error} <button className="underline" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:!season?<p role="status">Loading current season…</p>:<>
    <div><p className="text-emerald-300 text-sm mb-2">Through Week {season.throughWeek} · Completed games only</p><h2 className="text-3xl font-black">{season.season} · The season so far</h2><p className="text-slate-400 mt-2">The race, the results, and who's finding their stride.</p></div>
    <section aria-labelledby="season-standings"><h3 id="season-standings" className="text-xl font-bold mb-2">Standings</h3>
     <p className="text-sm text-slate-400 mb-3">{season.espn ? 'ESPN playoff seed order. Top four qualify; odds are ESPN’s playoff probabilities.' : 'Ordered by win percentage, then points scored.'} Select a team for season stats and every completed game.</p>
     <label className="block text-sm text-slate-300 mb-3">Division <select className="ml-2 rounded border border-slate-700 bg-slate-900 p-2" value={divisionFilter} onChange={e=>setDivisionFilter(e.target.value)}><option value="">All divisions</option>{[...new Set(stats.standings.map(t=>t.division))].sort().map(d=><option key={d} value={d}>{d}</option>)}</select></label>
     <ScrollTable label="Current season standings" tableClassName="season-standings"><thead><tr><FrozenCell heading>Team</FrozenCell>{[season.espn?'Seed':'Rank','W–L–T','PCT','PF','PA','Playoff %'].map(s=><th key={s} className="p-3 text-center whitespace-nowrap">{s}</th>)}</tr></thead><tbody>
      {visibleStandings.map(t=><React.Fragment key={t.id}><tr><FrozenCell title={t.name}><button className="season-team-toggle text-left w-full whitespace-normal text-emerald-300 hover:underline" aria-expanded={expanded.includes(t.id)} aria-controls={'games-'+t.id} onClick={()=>setExpanded(ids=>ids.includes(t.id)?ids.filter(id=>id!==t.id):[...ids,t.id])}><span>{expanded.includes(t.id)?'▾':'▸'}</span>{' '}<span>{t.name}</span></button><span className="team-caption">({t.owner}, <em>{t.division}</em>)</span></FrozenCell><td className="p-3 text-center">{t.rank}{season.espn&&t.seed<=season.espn.playoffTeamCount&&<span className="block text-xs text-emerald-300">In</span>}</td><td className="p-3 text-center whitespace-nowrap">{t.wins}–{t.losses}–{t.ties}</td><td className="p-3 text-center">{t.pct.toFixed(3)}</td><td className="p-3 text-center">{points(t.pf)}</td><td className="p-3 text-center">{points(t.pa)}</td><td className="p-3 text-center">{t.playoffPct==null?'—':Math.round(t.playoffPct*100)+'%'}</td></tr>
      {expanded.includes(t.id)&&<tr><td colSpan={7} className="p-0"><section id={'games-'+t.id} aria-label={t.name+' season games'} className="season-game-log p-4 bg-slate-900"><h4 className="font-semibold mb-2">{t.name} · Season games</h4>
      {season.espn&&<dl className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-4">{[['Division record',t.divisionRecord.join('–')],['Games back (division)',t.gamesBack===0?'—':t.gamesBack],['Home',t.homeRecord.join('–')],['Away',t.awayRecord.join('–')],['Streak',t.streak.type==='NONE'?'—':t.streak.type[0]+t.streak.length],['Moves',t.moves ?? '—'],['Point difference',points(t.pf-t.pa)]].map(([label,value])=><div key={label}><dt className="text-slate-400">{label}</dt><dd>{value}</dd></div>)}</dl>}
      <ol className="space-y-2">{season.games.filter(g=>g.a===t.id||g.b===t.id).sort((a,b)=>a.week-b.week).map(g=>{
       const home=g.a===t.id,score=home?g.as:g.bs,against=home?g.bs:g.as,result=g.winner===null?'T':g.winner===t.id?'W':'L';
       return <li key={g.week} className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="text-slate-400">Week {g.week}</span><strong className={result==='W'?'text-emerald-300':result==='L'?'text-rose-300':'text-slate-300'}>{result} {points(score)}–{points(against)}</strong><span>{home?'vs':'at'} {names.get(home?g.b:g.a)}</span>{score===against&&result!=='T'&&<span className="text-slate-400">Tiebreaker</span>}</li>;
      })}</ol></section></td></tr>}</React.Fragment>)}
     </tbody></ScrollTable>
    </section>
    <PlayoffBracket snapshot={season.espn} standings={stats.standings} throughWeek={season.throughWeek}/>
    <section aria-labelledby="latest-games"><div className="flex flex-wrap justify-between gap-2 mb-3"><h3 id="latest-games" className="text-xl font-bold">Week {season.throughWeek} results</h3><Link className="text-emerald-300" to={'/weekly?issue='+season.season+'-W'+String(season.throughWeek).padStart(2,'0')}>Read the weekly summary →</Link></div>
     <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{season.games.filter(g=>g.week===season.throughWeek).map(g=><article key={g.a} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      {[[g.a,g.as],[g.b,g.bs]].map(([id,score])=><div key={id} className={'flex justify-between gap-4 py-1 '+(g.winner===id?'text-emerald-300 font-semibold':'text-slate-300')}><span>{names.get(id)}{g.winner===id?' · W':''}</span><span>{points(score)}</span></div>)}
      {g.winner===null&&<p className="text-xs text-slate-400 mt-2">Tie</p>}
     </article>)}</div>
    </section>
    <section aria-labelledby="scoring-trends" className="rounded-xl border border-slate-800 p-4 bg-slate-900/60"><h3 id="scoring-trends" className="text-xl font-bold mb-2">Weekly scoring</h3><p className="text-sm text-slate-400 mb-3">Choose teams to compare their points each week.</p>
     <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5">{season.teams.map(t=><label key={t.id} className="flex gap-2 items-center text-sm"><input type="checkbox" checked={selected.includes(t.id)} onChange={()=>setSelected(ids=>ids.includes(t.id)?ids.filter(id=>id!==t.id):[...ids,t.id])}/>{t.name}</label>)}</div>
     <ChartFrame label="Current season weekly scoring" hasData={selected.length>0} emptyMessage="Select a team to compare weekly scoring."><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.trend} margin={{left:0,right:12,top:12,bottom:8}}><CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3}/><XAxis dataKey="week" tickFormatter={w=>'W'+w} tick={{fill:'#cbd5e1'}}/><YAxis domain={[0,'auto']} tick={{fill:'#cbd5e1'}} width={45}/><Tooltip {...chartTooltipProps} labelFormatter={w=>'Week '+w}/><Legend/>{selected.map(id=><Line key={id} dataKey={id} name={names.get(id)} {...seriesStyle(id)} strokeWidth={2} dot={{r:3}} connectNulls={false}/>)}</LineChart></ResponsiveContainer></ChartFrame>
    </section>
    <Link to="/history" className="block text-emerald-300">Explore league history and all-time rivalries →</Link>
   </>}
  </main>
 </div>;
}
