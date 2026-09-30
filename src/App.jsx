import React, { useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "./components/SiteHeader";
import { cn, groupBy, seasonMaxByYear, buildH2HIndex, loadDashboard } from "./lib/data";

import ScrollTable, { FrozenCell } from "./components/ScrollTable";
import ChartFrame from "./components/ChartFrame";
import { seriesStyle, formatPercent, chartTooltipProps, winLossDomain } from "./lib/charts";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, Text
} from "recharts";

import footerImg from "./assets/header.png";

// Wrap labels within a reserved column instead of estimating glyph widths.
function OpponentTick({ x, y, payload }) {
  return <Text x={x} y={y} width={132} textAnchor="end" verticalAnchor="middle"
    fontSize={13} lineHeight={16} fill="#cbd5e1">{payload.value}</Text>;
}


const DIV_PALETTE=["#8b5cf6","#f59e0b","#10b981","#3b82f6","#ef4444","#ec4899","#14b8a6","#84cc16","#f97316","#06b6d4"]; 
const divColor=(name)=>{ if(!name) return undefined; const s=String(name); let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return DIV_PALETTE[h%DIV_PALETTE.length]; };
const aBg=(hex)=>{ if(!hex) return undefined; const h=hex.replace('#',''); const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16); return `rgba(${r},${g},${b},0.15)`; };

const DIV_MAP = {
  "0": { full: "Pandas",   short: "P" },
  "1": { full: "Shibas",   short: "S" },
  "2": { full: "Unicorns", short: "U" },
};
const toDivFull = (x) => {
  const k = String(x ?? "").trim();
  if (DIV_MAP[k]) return DIV_MAP[k].full;
  const hit = Object.values(DIV_MAP).find(v =>
    v.full.toLowerCase() === k.toLowerCase() || v.short.toLowerCase() === k.toLowerCase()
  );
  return hit ? hit.full : k;
};
export const toDivShort = (x) => {
  const k = String(x ?? "").trim();
  if (DIV_MAP[k]) return DIV_MAP[k].short;
  const hit = Object.values(DIV_MAP).find(v =>
    v.full.toLowerCase() === k.toLowerCase() || v.short.toLowerCase() === k.toLowerCase()
  );
  return hit ? hit.short : (k ? k[0].toUpperCase() : "");
};


export default function App(){
  const [rows,setRows]=useState([]); const [parseError,setParseError]=useState("");
  const [currentTeams,setCurrentTeams]=useState([]);
  const [podiumOnly,setPodiumOnly]=useState(false); const [showHistory,setShowHistory]=useState(false); const [lastStyle,setLastStyle]=useState("skull");
  const [newestFirst,setNewestFirst]=useState(true);
  const [selectedTeamIds,setSelectedTeamIds]=useState([]);

  const [h2hGames,setH2hGames]=useState([]);
  const [focalTeamId,setFocalTeamId]=useState(""); const [selectedOppIds,setSelectedOppIds]=useState([]);

  const [divSeasonRows,setDivSeasonRows]=useState([]); const [teamDivRows,setTeamDivRows]=useState([]);

  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setParseError("");
    loadDashboard(controller.signal).then(data => {
      if (!active) return;
      setRows(data.rows);
      setCurrentTeams(data.currentTeams);
      setH2hGames(data.games);
      setDivSeasonRows(data.divisions);
      setTeamDivRows(data.teamDivisions);
      const ids = [...new Set(data.rows.map(r => r.team_id))];
      const initial = ids[Math.floor(Math.random() * ids.length)];
      setSelectedTeamIds([initial]);
      setFocalTeamId(initial);
    }).catch(error => {
      if (active) setParseError(error.message);
    });
    return () => { active = false; controller.abort(); };
  }, [loadAttempt]);

  const years=useMemo(()=>[...new Set(rows.map(r=>r.year).filter(Boolean))].sort((a,b)=>a-b),[rows]);
  const tableYears=useMemo(()=>newestFirst ? [...years].reverse() : years,[years,newestFirst]);
  const maxByYear=useMemo(()=>seasonMaxByYear(rows),[rows]);
  const leagueMax=useMemo(()=>{const v=rows.map(r=>r.final_standing).filter(Number.isFinite); return v.length?Math.max(...v):12;},[rows]);
  const grouped=useMemo(()=>groupBy(rows,r=>r.team_id),[rows]);
  const currentTeamMap=useMemo(()=>new Map(currentTeams.map(r=>[r.team_id,r])),[currentTeams]);

  const divNameMap=useMemo(()=>{const m=new Map(); for(const r of divSeasonRows){ if(!r.season||!r.division_id) continue; if(!m.has(r.season)) m.set(r.season,new Map()); m.get(r.season).set(r.division_id,r.division_name||r.division_id);} return m;},[divSeasonRows]);
  const teamDivMap=useMemo(()=>{const m=new Map(); for(const r of teamDivRows){ if(!r.season||!r.team_id||!r.division_id) continue; m.set(`${r.season}__${r.team_id}`,r.division_id);} return m;},[teamDivRows]);
  const getDivisionName=(team_id,season)=>{ if(!team_id||!season) return; const did=teamDivMap.get(`${season}__${team_id}`); if(!did) return; const by=divNameMap.get(season); return toDivFull((by&&by.get(did))||did); };

  const summaryRows=useMemo(()=>{
    const out=[]; 
    for(const [team_id,list] of grouped){ 
      const byY=groupBy(list,r=>r.year); 
      const last=list.slice().sort((a,b)=>(a.year||0)-(b.year||0)).at(-1)||{}; 
      const current=currentTeamMap.get(team_id)||last;
      const current_name=current.team_name||"(unknown)"; 
      const current_owner=current.owner||"(unknown)"; 
      const current_div=getDivisionName(team_id,last.year);
      let firsts=0,seconds=0,thirds=0,lasts=0; 
      const yearMap={}; 
      for(const y of years){ 
        const r=(byY.get(y)||[])[0]; 
        const v=r?.final_standing; 
        if(Number.isFinite(v)){ 
          if(v===1) firsts++; else if(v===2) seconds++; else if(v===3) thirds++; 
          const m=maxByYear.get(y); if(m&&v===m) lasts++; 
        } 
        yearMap[y]=Number.isFinite(v)?v:null; 
      }
      out.push({team_id,current_name,current_owner,current_division:current_div,firsts,seconds,thirds,lasts,yearMap}); 
    }
    return out; 
  },[grouped,years,maxByYear,divNameMap,teamDivMap,currentTeamMap]);

  const [sortKey,setSortKey]=useState("division");
  const avgStanding=(r)=>{ const vals=Object.values(r.yearMap).filter(v=>Number.isFinite(v)); return vals.length? vals.reduce((a,b)=>a+b,0)/vals.length : Infinity; };
  const sortedSummary=useMemo(()=>{
    const arr=summaryRows.slice();
    switch(sortKey){
      case "division":
        arr.sort((a,b)=> (String(a.current_division||"").localeCompare(String(b.current_division||"")) || String(a.current_name||"").localeCompare(String(b.current_name||""))));
        break;
      case "alpha":
        arr.sort((a,b)=> String(a.current_name||"").localeCompare(String(b.current_name||"")));
        break;
      case "avg":
        arr.sort((a,b)=> avgStanding(a)-avgStanding(b));
        break;
      case "titles":
        arr.sort((a,b)=> (b.firsts-a.firsts) || String(a.current_name||"").localeCompare(String(b.current_name||"")));
        break;
      case "podiums":
        arr.sort((a,b)=> ((b.firsts+b.seconds+b.thirds)-(a.firsts+a.seconds+a.thirds)) || String(a.current_name||"").localeCompare(String(b.current_name||"")));
        break;
      case "lasts":
        arr.sort((a,b)=> (b.lasts-a.lasts) || String(a.current_name||"").localeCompare(String(b.current_name||"")));
        break;
      case "franchise":
      default:
        arr.sort((a,b)=> String(a.team_id).localeCompare(String(b.team_id),undefined,{numeric:true}));
    }
    return arr;
  },[summaryRows,sortKey]);

  const teamOptions=useMemo(()=>summaryRows.map(r=>({id:r.team_id,label:r.current_name})),[summaryRows]);

  const chartData=useMemo(()=>{ if(!selectedTeamIds.length) return []; return years.map(y=>{ const row={year:y}; for(const id of selectedTeamIds){ const t=summaryRows.find(tt=>tt.team_id===id); const val=t?.yearMap?.[y]??null; row[id]=Number.isFinite(val)?val:null; } return row;}); },[years,selectedTeamIds,summaryRows]);

  const yMeta=useMemo(()=>{ const vals=[]; for(const r of chartData){ for(const [k,v] of Object.entries(r)) if(k!=="year"&&Number.isFinite(v)) vals.push(v);} const maxSel=vals.length?Math.max(...vals):leagueMax; const domainMax=Math.max(1,maxSel); const ticks=[]; for(let i=1;i<=domainMax;i+=2) ticks.push(i); if(domainMax%2===0&&ticks.at(-1)!==domainMax) ticks.push(domainMax); return {domainMax,ticks}; },[chartData,leagueMax]);

  const toggleSelected=(id)=> setSelectedTeamIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const lastRender=(v,y,podium)=>{ const isLast=maxByYear.get(y)===v; if(isLast&&podium){ if(lastStyle==="cry") return "😭"; if(lastStyle==="skull") return "💀"; return "LAST";} return v; };

  const focalTeams=useMemo(()=>{ const ids=new Set([focalTeamId,...summaryRows.map(r=>r.team_id),...h2hGames.flatMap(g=>[g.a,g.b])]); return [...ids].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true})); },[summaryRows,h2hGames,focalTeamId]);
  const h2hSeasons=useMemo(()=>{ const ys=new Set([ ...h2hGames.map(g=>g.season).filter(Boolean) ]); return [...ys].sort((a,b)=>a-b); },[h2hGames]);

  const h2hIndex = useMemo(() => buildH2HIndex(h2hGames), [h2hGames]);

  const oppListForFocal=useMemo(()=>{ if(!focalTeamId) return []; const opps=new Set(); for(const k of h2hIndex.keys()){ const [,t,o]=k.split("__"); if(t===String(focalTeamId)) opps.add(o);} return [...opps].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true})); },[focalTeamId,h2hIndex]);
  const getTeamName=(id)=> summaryRows.find(r=>r.team_id===id)?.current_name||`Team ${id}`;

  const tableH2hSeasons=useMemo(()=>newestFirst ? [...h2hSeasons].reverse() : h2hSeasons,[h2hSeasons,newestFirst]);
  const h2hMatrix=useMemo(()=> oppListForFocal.map(opp=>{ const cells={}; for(const s of h2hSeasons){ const rec=h2hIndex.get(`${s}__${focalTeamId}__${opp}`); if(!rec){ cells[s]={txt:"",pct:undefined,div:getDivisionName(opp,s)}; continue; } const g=(rec.wins||0)+(rec.losses||0)+(rec.ties||0); const pct=g?(rec.wins+0.5*(rec.ties||0))/g:undefined; const txt=g?`${rec.wins}-${rec.losses}${rec.ties?`-${rec.ties}`:``}`:""; cells[s]={txt,pct,div:getDivisionName(opp,s)};} return {opp,cells}; }),[oppListForFocal,h2hSeasons,h2hIndex,focalTeamId,teamDivRows,divSeasonRows]);

  const seedRef = useRef({ teamId: null, seeded: false });
  useEffect(()=>{
    if (seedRef.current.teamId !== focalTeamId) {
      seedRef.current = { teamId: focalTeamId, seeded: false };
    }
    if (!seedRef.current.seeded && focalTeamId && oppListForFocal.length) {
      const rand = oppListForFocal[Math.floor(Math.random()*oppListForFocal.length)];
      setSelectedOppIds([rand]);
      seedRef.current.seeded = true;
    }
  },[focalTeamId, oppListForFocal]);

  const oppSelection = selectedOppIds;

  const h2hTrendData=useMemo(()=>{ if(!focalTeamId) return []; return h2hSeasons.map(s=>{ const row={season:s}; for(const o of oppSelection){ const rec=h2hIndex.get(`${s}__${focalTeamId}__${o}`); if(!rec){ row[o]=null; continue;} const g=(rec.wins||0)+(rec.losses||0)+(rec.ties||0); row[o]=g?(rec.wins+0.5*(rec.ties||0))/g:null;} return row; }); },[focalTeamId,h2hSeasons,h2hIndex,oppSelection]);

  const h2hAllTimeBars=useMemo(()=>{ if(!focalTeamId) return []; const out=oppListForFocal.map(o=>{ let w=0,l=0,t=0; for(const s of h2hSeasons){ const r=h2hIndex.get(`${s}__${focalTeamId}__${o}`); if(!r) continue; w+=r.wins||0; l+=r.losses||0; t+=r.ties||0; } return {opp:o,label:getTeamName(o),wins:w,losses:l,ties:t,diff:w-l}; }); out.sort((a,b)=>(b.wins+b.losses+b.ties)-(a.wins+a.losses+a.ties)); return out; },[focalTeamId,oppListForFocal,h2hSeasons,h2hIndex]);
  const diffExtent = useMemo(() => winLossDomain(h2hAllTimeBars.map(row => row.diff)), [h2hAllTimeBars]);

  const h2hRows = useMemo(() => (
    oppListForFocal.map((opp, idx) => (
      <tr key={opp} className={idx%2?"bg-slate-950":"bg-slate-900/50"}>
        <FrozenCell title={getTeamName(opp)}>{getTeamName(opp)}</FrozenCell>
        {tableH2hSeasons.map(s=>{ const c=(h2hMatrix.find(r=>r.opp===opp)?.cells?.[s])||{txt:"",pct:undefined,div:undefined}; let cls="text-slate-300"; const p=c.pct; if(p===undefined) cls="text-slate-500/40"; else if(p>0.66) cls="bg-emerald-700/40 text-emerald-100"; else if(p>0.5) cls="bg-emerald-600/30 text-emerald-100"; else if(p===0.5) cls="bg-slate-600/30"; else if(p>=0.33) cls="bg-rose-700/30 text-rose-100"; else cls="bg-rose-800/40 text-rose-100"; const col=c.div? divColor(c.div):undefined; return (
          <td key={s} className={cn("p-2 text-center border-b border-slate-800 min-w-[96px] w-24",cls)} style={col?{boxShadow:`inset 0 3px 0 0 ${col}`} : undefined} title={c.div||undefined}>{c.txt}</td>
        );})}
      </tr>
    ))
  ), [oppListForFocal,tableH2hSeasons,h2hMatrix]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
    {/* <div className="min-h-dvh bg-slate-950 text-slate-200"> */}
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 pb-24 pt-6">
<nav aria-label="History sections" className="flex flex-wrap gap-4 mb-6 text-sm text-emerald-300">{[["timeline","League Timeline"],["arena","Head-to-Head Arena"],["standings","Final Standings"]].map(([id,label])=><button key={id} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"})}>{label} ↓</button>)}</nav>
        <div className="min-w-0">
          {!rows.length && (
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-slate-200 font-medium">{parseError ? "League records are unavailable." : "Loading league records…"}</p>
              {parseError && <p role="alert" className="text-rose-300 mt-2">{parseError} <button className="underline ml-2" onClick={() => setLoadAttempt(n => n + 1)}>Retry</button></p>}
            </div>
          )}

          {!!rows.length && (
            <>
              <section className="mb-10">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 id="timeline" className="text-xl font-bold">League Timeline (rolled-up by franchise)</h2>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button type="button" onClick={()=>setNewestFirst(v=>!v)} aria-label="Reverse year order in both tables" title="Changes the timeline and head-to-head tables" className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm">{newestFirst ? "Newest first ↓" : "Oldest first ↑"}</button>
                    <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                      <input type="checkbox" className="peer sr-only" checked={podiumOnly} onChange={e=>setPodiumOnly(e.target.checked)} />
                      <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 peer-checked:bg-amber-500/20 peer-checked:border-amber-400 text-sm">Podium-Only Goggles</span>
                    </label>
                    <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                      <input type="checkbox" className="peer sr-only" checked={showHistory} onChange={e=>setShowHistory(e.target.checked)} />
                      <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 text-sm">History Nerd Mode</span>
                    </label>
                    <select value={sortKey} onChange={e=>setSortKey(e.target.value)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sm">
                      <option value="division">Sort: Division</option>
                      <option value="avg">Sort: Overall Standing</option>
                      <option value="franchise">Sort: Franchise #</option>
                      <option value="alpha">Sort: Alphabetical</option>
                      <option value="titles">Sort: Most Titles</option>
                      <option value="podiums">Sort: Most Podiums</option>
                      <option value="lasts">Sort: Most Lasts</option>
                    </select>
                    <select value={lastStyle} onChange={e=>setLastStyle(e.target.value)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sm cursor-pointer">
                      <option value="text">Style: LAST</option>
                      <option value="cry">Style: 😭</option>
                      <option value="skull">Style: 💀</option>
                    </select>

                  </div>
                </div>
                <ScrollTable label="League Timeline" tableClassName="min-w-[980px]">
                      <thead className="bg-slate-900">
                        <tr>
                          <FrozenCell heading>Name</FrozenCell>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-left w-36 min-w-[144px]">Owner</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center w-24">Div</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">1st</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">2nd</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">3rd</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center border-r-2 border-slate-700">Last</th>
                          {tableYears.map((y) => (
                            <th key={y} className="bg-slate-900 border-b border-slate-800 p-2 text-center font-semibold min-w-[96px] w-24">{y}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSummary.map((r, idx) => {
                          const list = (grouped.get(r.team_id) || []).slice().sort((a, b) => a.year - b.year);
                          const segs = [];
                          let cur = null;
                          for (const it of list) {
                            const key = `${it.team_name}||${it.owner}`;
                            if (!cur || cur.key !== key) {
                              if (cur) segs.push(cur);
                              cur = { key, team_name: it.team_name, owner: it.owner, start: it.year, end: it.year, yearVals: {} };
                            } else cur.end = it.year;
                            if (Number.isFinite(it.final_standing)) cur.yearVals[it.year] = it.final_standing;
                          }
                          if (cur) segs.push(cur);
                          const divPillColor=divColor(r.current_division||"");
                          return (
                            <React.Fragment key={r.team_id}>
                              <tr className={cn(idx%2?"bg-slate-950":"bg-slate-900/50")}> 
                                <FrozenCell title={r.current_name}>{r.current_name}</FrozenCell>
                                <td className="p-2 border-b border-slate-800 w-36 min-w-[144px] truncate" title={r.current_owner}>{r.current_owner}</td>
                                <td className="p-2 border-b border-slate-800 text-center">
                                  {r.current_division? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold border" style={{color:divPillColor,borderColor:divPillColor, backgroundColor:aBg(divPillColor)}} title={r.current_division}>{toDivShort(r.current_division)}</span>
                                  ): <span className="text-slate-500">—</span>}
                                </td>
                                <td className="p-2 border-b border-slate-800 text-center font-semibold text-amber-300 bg-slate-900/60">{r.firsts}</td>
                                <td className="p-2 border-b border-slate-800 text-center font-semibold text-slate-200 bg-slate-900/60">{r.seconds}</td>
                                <td className="p-2 border-b border-slate-800 text-center font-semibold text-amber-700 bg-slate-900/60">{r.thirds}</td>
                                <td className="p-2 border-b border-slate-800 text-center font-semibold text-rose-300 bg-slate-900/60 border-r-2 border-slate-700">{r.lasts}</td>
                                {tableYears.map(y=>{ const v=r.yearMap[y]; const podium=v===1||v===2||v===3; const isLast=maxByYear.get(y)===v; const faded=podiumOnly&&!podium&&!isLast; const color=podium? (v===1?"text-yellow-300":v===2?"text-slate-200":"text-amber-600") : isLast?"text-rose-400":"text-slate-400"; const divName=getDivisionName(r.team_id,y); const col=divColor(String(divName||"")); return (
                                  <td key={y} className={cn("p-2 border-b border-slate-800 text-center font-bold min-w-[96px] w-24", faded?"text-slate-500/20":color)} style={divName?{boxShadow:`inset 0 3px 0 0 ${col}`} : undefined} title={divName||undefined}>{Number.isFinite(v)? lastRender(v,y,podiumOnly):""}</td>
                                );})}
                              </tr>
                              {showHistory && segs.map((seg,sidx)=> (
                                <tr key={`${r.team_id}_seg_${sidx}`} className={cn(idx%2?"bg-slate-950":"bg-slate-900/50")}> 
                                  <td className="sticky left-0 z-10 bg-slate-950 p-2 border-b border-slate-800 text-slate-300 w-40 min-w-[160px] truncate" title={seg.team_name}>↳ {seg.team_name}</td>
                                  <td className="p-2 border-b border-slate-800 text-slate-300 w-36 min-w-[144px] truncate">{seg.owner} <span className="text-slate-500">({seg.start}-{seg.end})</span></td>
                                  <td className="p-2 border-b border-slate-800 text-center" />
                                  <td className="p-2 border-b border-slate-800 text-center bg-slate-900/60" colSpan={4} />
                                  {tableYears.map(y=>{ const v=seg.yearVals[y]; const active=Number.isFinite(v); const podium=v===1||v===2||v===3; const isLast=maxByYear.get(y)===v; const faded=podiumOnly&&!podium&&!isLast; const color=podium? (v===1?"text-yellow-300":v===2?"text-slate-200":"text-amber-600") : isLast?"text-rose-400":"text-slate-400"; const divName=getDivisionName(r.team_id,y); const col=divColor(String(divName||"")); return (
                                    <td key={y} className={cn("p-2 border-b border-slate-800 text-center font-bold min-w-[96px] w-24", active&&"bg-slate-800/40", faded?"text-slate-500/20":color)} style={divName?{boxShadow:`inset 0 3px 0 0 ${col}`} : undefined} title={divName||undefined}>{active? lastRender(v,y,podiumOnly):""}</td>
                                  );})}
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </ScrollTable>
              </section>

              <section className="mb-8">
                <h2 id="arena" className="text-xl font-bold">Head-to-Head Arena</h2>

                <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs uppercase tracking-wide text-slate-400">Focal Franchise</label>
                      <select aria-label="Focal Franchise" value={focalTeamId} onChange={e=>setFocalTeamId(e.target.value)} className="w-60 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm">
                        <option value="" disabled>Select franchise</option>
                        {focalTeams.map(id=> <option key={id} value={id}>{getTeamName(id)}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      {["Pandas","Shibas","Unicorns"].map(name=>{
                        const c = divColor(name);
                        return (
                          <span key={name} className="px-2 py-0.5 rounded-full text-xs font-semibold border" style={{color:c,borderColor:c,backgroundColor:aBg(c)}}>{name}</span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 min-w-0">
                  {/* <h3 className="font-semibold mb-2">Season Matrix</h3> */}
                  {(!focalTeamId||!h2hSeasons.length)? <p className="text-slate-400 text-sm">Choose a franchise.</p> : (
                    <ScrollTable label="Head-to-Head Arena">
                      <thead>
                        <tr>
                          <FrozenCell heading>Opponent</FrozenCell>
                          {tableH2hSeasons.map(s=> <th key={s} className="p-2 text-center border-b border-slate-800 min-w-[96px] w-24">{s}</th>)}
                        </tr>
                      </thead>
                      <tbody>{h2hRows}</tbody>
                    </ScrollTable>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 mt-3">
                  <h3 className="font-semibold mb-2">Opponents to Trend</h3>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-auto">
                    {oppListForFocal.map(o=> (
                      <label key={o} className={cn("flex items-center gap-2 px-2 py-1 rounded cursor-pointer border", selectedOppIds.includes(o)?"border-emerald-500/60 bg-emerald-900/20":"border-slate-800 hover:border-slate-700")}>
                        <input
                          type="checkbox"
                          checked={selectedOppIds.includes(o)}
                          onChange={()=>{
                            setSelectedOppIds(prev=> prev.includes(o)? prev.filter(x=>x!==o):[...prev,o]);
                          }}
                        />
                        <span className="text-sm leading-tight">vs {getTeamName(o)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid xl:grid-cols-2 gap-4 items-start mt-4">
                  <div className="min-w-0 rounded-xl border border-slate-800 p-3 bg-slate-900/60">
                    <h3 className="font-semibold mb-2">Win Percentage vs. Selected Opponents</h3>
                    <ChartFrame label="Head-to-head win percentage" hasData={oppSelection.length > 0} emptyMessage="Select an opponent to see their trend.">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={h2hTrendData} margin={{left:12,right:12,top:12,bottom:12}}>
                          <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                          <XAxis dataKey="season" tick={{fill:"#cbd5e1"}} stroke="#64748b" angle={-45} textAnchor="end" height={50} />
                          <YAxis tick={{fill:"#cbd5e1"}} stroke="#64748b" domain={[0,1]} ticks={[0,0.25,0.5,0.75,1]} tickFormatter={formatPercent} />
                          <Tooltip
                            {...chartTooltipProps}
                            formatter={v=> v==null?"—":(v*100).toFixed(0)+"%"}
                          />
                          <Legend wrapperStyle={{color:"#e2e8f0"}} />
                          {oppSelection.map(o=> <Line key={o} type="monotone" dataKey={o} name={`vs ${getTeamName(o)}`} {...seriesStyle(o)} strokeOpacity={0.95} strokeWidth={2} dot={{r:2}} connectNulls={false} />)}
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartFrame>
                  </div>
                  <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60">
                    <h3 className="font-semibold mb-2">All-Time vs Opponents</h3>
                    <ChartFrame label="All-time win-loss difference" height={Math.max(360, h2hAllTimeBars.length * 56 + 64)} hasData={h2hAllTimeBars.length > 0}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={h2hAllTimeBars} layout="vertical" margin={{left:0,right:12,top:12,bottom:12}}>
                          <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                          <XAxis type="number" domain={diffExtent} tick={{fill:"#cbd5e1"}} stroke="#64748b" />
                          <YAxis type="category" dataKey="label" width={148} interval={0} tickMargin={8} tick={<OpponentTick />} stroke="#64748b" />
                          <Tooltip
                            {...chartTooltipProps}
                            formatter={(v,n,p)=>[v,p&&p.payload?`vs ${p.payload.label}`:""]}
                          />
                          <Legend wrapperStyle={{color:"#e2e8f0"}} />
                          <ReferenceLine x={0} stroke="#94a3b8" />
                          <Bar dataKey="diff" name="Win-Loss Diff" fill="#22c55e">
                            {h2hAllTimeBars.map((d,idx)=>(<Cell key={`cell-${idx}`} fill={d.diff>=0?"#22c55e":"#ef4444"} />))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartFrame>
                  </div>
                </div>
              </section>

              <section className="mb-3">
                <h2 id="standings" className="text-xl font-bold">Wiggly Lines of Triumph (and Despair)</h2>
                <p className="text-slate-400 text-sm mb-2">Pick teams to plot their final standing over time. Lower is better; axis is flipped so #1 sits at the top.</p>
                <div className="grid md:grid-cols-[14rem_minmax(0,1fr)] gap-3 items-start">
                  <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 max-h-[560px] overflow-auto ">
                    <div className="grid grid-cols-1 gap-2">
                      {teamOptions.map(t=> (
                        <label key={t.id} className={cn("flex items-center gap-2 px-2 py-1 rounded cursor-pointer border", selectedTeamIds.includes(t.id)?"border-emerald-500/60 bg-emerald-900/20":"border-slate-800 hover:border-slate-700")}> 
                          <input type="checkbox" checked={selectedTeamIds.includes(t.id)} onChange={()=>toggleSelected(t.id)} />
                          <span className="text-sm leading-tight">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 min-w-0">
                    <ChartFrame label="Final standings over time" height={560} hasData={selectedTeamIds.length > 0} emptyMessage="Select a team to see their standings.">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{left:12,right:12,top:12,bottom:12}}>
                          <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                          <XAxis dataKey="year" tick={{fill:"#cbd5e1"}} stroke="#64748b" angle={-45} textAnchor="end" height={50} />
                          <YAxis tick={{fill:"#cbd5e1"}} stroke="#64748b" allowDecimals={false} domain={[1,yMeta.domainMax]} ticks={yMeta.ticks} reversed />
                          <Tooltip {...chartTooltipProps} />
                          <Legend wrapperStyle={{color:"#e2e8f0"}} />
                          {selectedTeamIds.map(id=> <Line key={id} type="monotone" dataKey={id} name={teamOptions.find(t=>t.id===id)?.label||id} {...seriesStyle(id)} strokeOpacity={0.95} strokeWidth={2} dot={{r:2}} connectNulls={false} />)}
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartFrame>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* <footer className="mt-12 text-center text-xs text-slate-500">Built with Tailwind, Recharts, and a healthy dose of trash-talk.</footer> */}
          {/* <footer className="mt-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0"> <img src="header.png" alt="Robot Rockstar" className="w-80 h-80 object-contain" /> Built with Tailwind, Recharts, and a healthy dose of trash-talk. </footer> */}
          <footer className="mt-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0"> <img src={footerImg} alt="Robot Rockstar" className="w-80 h-80 object-contain" /> Built with Tailwind, Recharts, and a healthy dose of trash-talk. </footer>
        </div>
      </main>
    </div>
  );
}
