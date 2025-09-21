import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

// const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : "/";
const base = ""; // use relative URLs

const cn = (...xs) => xs.filter(Boolean).join(" ");

function normalizeRow(r){
  const year=Number(r.season||r.year); const fs=Number(r.final_standing||r["team.final_standing"]);
  const owner=((r.owner_first||"")+" "+(r.owner_last||"")).trim();
  return {team_id:String(r.team_id||""), team_name:String(r.team_name||""), owner, year:Number.isFinite(year)?year:undefined, final_standing:Number.isFinite(fs)?fs:undefined};
}
function normalizeH2HSummaryRow(r){
  return {season:Number(r.season||r.year), team_id:String(r.team_id||""), opp_id:String(r.opponent_id||r.opp_id||""), wins:+(r.wins||0), losses:+(r.losses||0), ties:+(r.ties||0), pf:+(r.points_for||0), pa:+(r.points_against||0)};
}
function normalizeH2HGameRow(r){
  const season=Number(r.season||r.year); if(!Number.isFinite(season)) return;
  const a=String(r.team_a_id||r.team_id||r.home_id||""), b=String(r.team_b_id||r.opponent_id||r.away_id||"");
  if(!a||!b) return; const as=Number(r.team_a_points||r.points_for), bs=Number(r.team_b_points||r.points_against);
  let winsA=0,winsB=0,ties=0; if(Number.isFinite(as)&&Number.isFinite(bs)){ if(as>bs) winsA=1; else if(bs>as) winsB=1; else ties=1; }
  return {season,a,b,as,bs,winsA,winsB,ties};
}
function normalizeDivisionsBySeasonRow(r){ return {season:+r.season||+r.year, division_id:String(r.division_id||r.division||""), division_name:String(r.division_name||r.name||r.division||"")}; }
function normalizeTeamDivisionRow(r){ return {season:+r.season||+r.year, team_id:String(r.team_id||""), division_id:String(r.division_id||r.division||"")}; }

function groupBy(xs,key){const m=new Map(); for(const x of xs){const k=key(x); if(!m.has(k)) m.set(k,[]); m.get(k).push(x);} return m;}
function seasonMaxByYear(rows){const by=groupBy(rows.filter(r=>Number.isFinite(r.year)&&Number.isFinite(r.final_standing)),r=>r.year); const mm=new Map(); for(const [y,list] of by) mm.set(y,Math.max(...list.map(l=>l.final_standing))); return mm;}

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

const lineColors=["#ef4444","#eab308","#22c55e","#3b82f6"]; const lineDashes=["","5 5"];

export default function App(){
  const [rows,setRows]=useState([]); const [parseError,setParseError]=useState("");
  const [podiumOnly,setPodiumOnly]=useState(false); const [showHistory,setShowHistory]=useState(false); const [lastStyle,setLastStyle]=useState("skull");
  const [selectedTeamIds,setSelectedTeamIds]=useState([]);
  // const [headerImgUrl]=useState(()=>{try{return localStorage.getItem("hfl_header_art")||(`${base}assets/hfl-header-gritty.png`);}catch{return `${base}assets/hfl-header-gritty.png`;}});
  // const [headerImgUrl]=useState(()=>{try{return localStorage.getItem("hfl_header_art")||(`assets/hfl-header-gritty.png`);}catch{return `assets/hfl-header-gritty.png`;}});
  const [headerImgUrl] = useState(() => { try { return localStorage.getItem("hfl_header_art") || `/logo-180x180.png`; } catch { return `/logo-180x180.png`; } });
  const [h2hSummary,setH2hSummary]=useState([]); const [h2hGames,setH2hGames]=useState([]);
  const [focalTeamId,setFocalTeamId]=useState(""); const [selectedOppIds,setSelectedOppIds]=useState([]);

  const [divSeasonRows,setDivSeasonRows]=useState([]); const [teamDivRows,setTeamDivRows]=useState([]);

  useEffect(()=>{
    async function fetchTextOk(url){
      try{ const res = await fetch(url,{cache:"no-store"}); if(!res.ok) return null; return await res.text(); }catch{ return null; }
    }
    async function load(){
      let txt=null;
      // const recCandidates=[`${base}data/records_raw_with_owner_names.csv`,`${base}data/records_raw_with_owner.csv`,`${base}data/records.csv`];
      const recCandidates=[`data/records_raw_with_owner_names.csv`,`data/records_raw_with_owner.csv`,`data/records.csv`];
      for(const u of recCandidates){ txt = await fetchTextOk(u); if(txt) break; }
      if(!txt){ setParseError("Records CSV not found under data/. Place records_raw_with_owner_names.csv or records_raw_with_owner.csv."); return; }
      Papa.parse(txt,{header:true,skipEmptyLines:true,complete:(res)=>{
        const norm=res.data.map(normalizeRow).filter(r=>r.year&&r.team_id);
        if(!norm.length){ setParseError("No usable rows in records CSV"); return; }
        setRows(norm);
        const ids=[...new Set(norm.map(r=>r.team_id))];
        if(ids.length){ const rand=ids[Math.floor(Math.random()*ids.length)]; setSelectedTeamIds([rand]); if(!focalTeamId) setFocalTeamId(rand); }
      }});

      // const s1 = await fetchTextOk(`${base}data/h2h_summary.csv`);
      const s1 = await fetchTextOk(`data/h2h_summary.csv`);
      if(s1){ Papa.parse(s1,{header:true,skipEmptyLines:true,complete:(res)=>{
        const n=res.data.map(normalizeH2HSummaryRow).filter(r=>r.team_id&&r.opp_id&&r.season);
        setH2hSummary(n);
        if(!focalTeamId && n.length) setFocalTeamId(String(n[0].team_id));
      }}); }

      // const s2 = await fetchTextOk(`${base}data/h2h_games.csv`);
      const s2 = await fetchTextOk(`data/h2h_games.csv`);
      if(s2){ Papa.parse(s2,{header:true,skipEmptyLines:true,complete:(res)=>{ setH2hGames(res.data.map(normalizeH2HGameRow).filter(Boolean)); }}); }

      // const s3 = await fetchTextOk(`${base}data/divisions_by_season.csv`);
      const s3 = await fetchTextOk(`data/divisions_by_season.csv`);
      if(s3){ Papa.parse(s3,{header:true,skipEmptyLines:true,complete:(res)=>{ setDivSeasonRows(res.data.map(normalizeDivisionsBySeasonRow).filter(r=>r.season&&r.division_id)); }}); }

      // const s4 = await fetchTextOk(`${base}data/team_divisions.csv`);
      const s4 = await fetchTextOk(`data/team_divisions.csv`);
      if(s4){ Papa.parse(s4,{header:true,skipEmptyLines:true,complete:(res)=>{ setTeamDivRows(res.data.map(normalizeTeamDivisionRow).filter(r=>r.season&&r.team_id&&r.division_id)); }}); }
    }
    load();
  },[focalTeamId]);

  const years=useMemo(()=>[...new Set(rows.map(r=>r.year).filter(Boolean))].sort((a,b)=>a-b),[rows]);
  const maxByYear=useMemo(()=>seasonMaxByYear(rows),[rows]);
  const leagueMax=useMemo(()=>{const v=rows.map(r=>r.final_standing).filter(Number.isFinite); return v.length?Math.max(...v):12;},[rows]);
  const grouped=useMemo(()=>groupBy(rows,r=>r.team_id),[rows]);

  const divNameMap=useMemo(()=>{const m=new Map(); for(const r of divSeasonRows){ if(!r.season||!r.division_id) continue; if(!m.has(r.season)) m.set(r.season,new Map()); m.get(r.season).set(r.division_id,r.division_name||r.division_id);} return m;},[divSeasonRows]);
  const teamDivMap=useMemo(()=>{const m=new Map(); for(const r of teamDivRows){ if(!r.season||!r.team_id||!r.division_id) continue; m.set(`${r.season}__${r.team_id}`,r.division_id);} return m;},[teamDivRows]);
  const getDivisionName=(team_id,season)=>{ if(!team_id||!season) return; const did=teamDivMap.get(`${season}__${team_id}`); if(!did) return; const by=divNameMap.get(season); return toDivFull((by&&by.get(did))||did); };

  const summaryRows=useMemo(()=>{
    const out=[]; 
    for(const [team_id,list] of grouped){ 
      const byY=groupBy(list,r=>r.year); 
      const last=list.slice().sort((a,b)=>(a.year||0)-(b.year||0)).at(-1)||{}; 
      const current_name=last.team_name||"(unknown)"; 
      const current_owner=last.owner||"(unknown)"; 
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
  },[grouped,years,maxByYear,divNameMap,teamDivMap]);

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

  const chartData=useMemo(()=>{ if(!selectedTeamIds.length) return []; const lab=new Map(teamOptions.map(o=>[o.id,o.label])); return years.map(y=>{ const row={year:y}; for(const id of selectedTeamIds){ const t=summaryRows.find(tt=>tt.team_id===id); const val=t?.yearMap?.[y]??null; row[lab.get(id)||id]=Number.isFinite(val)?val:null; } return row;}); },[years,selectedTeamIds,summaryRows,teamOptions]);

  const yMeta=useMemo(()=>{ const vals=[]; for(const r of chartData){ for(const [k,v] of Object.entries(r)) if(k!=="year"&&Number.isFinite(v)) vals.push(v);} const maxSel=vals.length?Math.max(...vals):leagueMax; const domainMax=Math.max(1,maxSel); const ticks=[]; for(let i=1;i<=domainMax;i+=2) ticks.push(i); if(domainMax%2===0&&ticks.at(-1)!==domainMax) ticks.push(domainMax); return {domainMax,ticks}; },[chartData,leagueMax]);

  const toggleSelected=(id)=> setSelectedTeamIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const lastRender=(v,y,podium)=>{ const isLast=maxByYear.get(y)===v; if(isLast&&podium){ if(lastStyle==="cry") return "😭"; if(lastStyle==="skull") return "💀"; return "LAST";} return v; };

  const focalTeams=useMemo(()=>{ const ids=new Set([focalTeamId,...summaryRows.map(r=>r.team_id),...h2hSummary.map(r=>r.team_id)]); return [...ids].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true})); },[summaryRows,h2hSummary,focalTeamId]);
  const h2hSeasons=useMemo(()=>{ const ys=new Set([ ...h2hSummary.map(r=>r.season).filter(Boolean), ...h2hGames.map(g=>g.season).filter(Boolean) ]); return [...ys].sort((a,b)=>a-b); },[h2hSummary,h2hGames]);

  const h2hIndex=useMemo(()=>{ const key=(s,t,o)=>`${s}__${t}__${o}`; const idx=new Map(); for(const r of h2hSummary){ const k=key(r.season,r.team_id,r.opp_id); const cur=idx.get(k)||{wins:0,losses:0,ties:0,pf:0,pa:0}; cur.wins+=r.wins||0; cur.losses+=r.losses||0; cur.ties+=r.ties||0; cur.pf+=r.pf||0; cur.pa+=r.pa||0; idx.set(k,cur);} for(const g of h2hGames){ const kAB=key(g.season,g.a,g.b); const ab=idx.get(kAB)||{wins:0,losses:0,ties:0,pf:0,pa:0}; ab.wins+=g.winsA||0; ab.losses+=g.winsB||0; ab.ties+=g.ties||0; ab.pf+=g.as||0; ab.pa+=g.bs||0; idx.set(kAB,ab); const kBA=key(g.season,g.b,g.a); const ba=idx.get(kBA)||{wins:0,losses:0,ties:0,pf:0,pa:0}; ba.wins+=g.winsB||0; ba.losses+=g.winsA||0; ba.ties+=g.ties||0; ba.pf+=g.bs||0; ba.pa+=g.as||0; idx.set(kBA,ba);} return idx; },[h2hSummary,h2hGames]);

  const oppListForFocal=useMemo(()=>{ if(!focalTeamId) return []; const opps=new Set(); for(const k of h2hIndex.keys()){ const [,t,o]=k.split("__"); if(t===String(focalTeamId)) opps.add(o);} return [...opps].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true})); },[focalTeamId,h2hIndex]);
  const getTeamName=(id)=> summaryRows.find(r=>r.team_id===id)?.current_name||`Team ${id}`;

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
  const diffExtent=useMemo(()=>{ if(!h2hAllTimeBars.length) return [-1,1]; let min=Math.min(...h2hAllTimeBars.map(d=>d.diff)); let max=Math.max(...h2hAllTimeBars.map(d=>d.diff)); if(min===max){ if(min===0){min=-1;max=1;} else {min=Math.min(0,min-1); max=Math.max(0,max+1);} } return [min,max]; },[h2hAllTimeBars]);
  const yAxisWidth=useMemo(()=>{ const m=h2hAllTimeBars.reduce((M,d)=>Math.max(M,(d.label||"").length),0); return Math.min(260,Math.max(140,m*7)); },[h2hAllTimeBars]);

  const h2hRows = useMemo(() => (
    oppListForFocal.map((opp, idx) => (
      <tr key={opp} className={idx%2?"bg-slate-950":"bg-slate-900/50"}>
        <td className="sticky left-0 bg-slate-950 z-10 p-2 border-b border-slate-800 whitespace-nowrap">{getTeamName(opp)}</td>
        {h2hSeasons.map(s=>{ const c=(h2hMatrix.find(r=>r.opp===opp)?.cells?.[s])||{txt:"",pct:undefined,div:undefined}; let cls="text-slate-300"; const p=c.pct; if(p===undefined) cls="text-slate-500/40"; else if(p>0.66) cls="bg-emerald-700/40 text-emerald-100"; else if(p>0.5) cls="bg-emerald-600/30 text-emerald-100"; else if(p===0.5) cls="bg-slate-600/30"; else if(p>=0.33) cls="bg-rose-700/30 text-rose-100"; else cls="bg-rose-800/40 text-rose-100"; const col=c.div? divColor(c.div):undefined; return (
          <td key={s} className={cn("p-2 text-center border-b border-slate-800 min-w-[96px] w-24",cls)} style={col?{boxShadow:`inset 0 3px 0 0 ${col}`} : undefined} title={c.div||undefined}>{c.txt}</td>
        );})}
      </tr>
    ))
  ), [oppListForFocal,h2hSeasons,h2hMatrix]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="xl:sticky xl:top-0 z-50 bg-slate-900/95 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative">
                {/* {headerImgUrl? <img src={headerImgUrl} alt="HFL header art" className="h-24 md:h-28 w-auto rounded-md border border-slate-800 shadow shrink-0" /> : <div className="h-16 w-28 rounded-md border border-slate-800 bg-slate-800/40" />} */}
                {headerImgUrl? <img src={headerImgUrl} alt="Happy Fun League Logo" className="h-24 md:h-28 w-auto object-contain" /> : <div className="h-16 w-28 rounded-md border border-slate-800 bg-slate-800/40" />}
              </div>
              <h1 className="text-[2rem] leading-[2.25rem] md:text-[3.5rem] md:leading-[3rem] font-black tracking-tight">
                <span className="block">Happy Fun League</span>
                <span className="block"><span className="text-fuchsia-400">Records of Glory</span> & <span className="text-rose-400">Shame</span></span>
              </h1>
            </div>
            <div className="flex flex-col items-end gap-2 max-w-full">
              <div className="flex gap-3 items-center justify-end">
                <Link
                  to="/weekly"
                  // className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700/60"
                  className="px-5 py-2 rounded-full bg-slate-800 border border-slate-700 text-lg font-semibold hover:bg-slate-700/60 whitespace-nowrap"
                >
                  Weekly Summaries
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-24 pt-6 overflow-x-auto">
        <div className="min-w-[var(--mobile-lock-width)] md:min-w-0">
          {!rows.length && (
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-slate-200 font-medium">Static data mode: loading <code className="px-1 rounded bg-slate-800 border border-slate-700">public/data/*.csv</code>.</p>
              {parseError && <p className="text-rose-300 mt-2">{parseError}</p>}
            </div>
          )}

          {!!rows.length && (
            <>
              <section className="mb-10">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">League Timeline (rolled-up by franchise)</h2>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
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
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <div className="overflow-auto">
                    <table className="min-w-[980px] w-full text-sm">
                      <thead className="bg-slate-900">
                        <tr>
                          <th className="sticky left-0 z-30 bg-slate-900 border-b border-slate-800 p-2 text-left w-40 min-w-[160px]">Name</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-left w-36 min-w-[144px]">Owner</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center w-24">Div</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">1st</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">2nd</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">3rd</th>
                          <th className="bg-slate-900 border-b border-slate-800 p-2 text-center border-r-2 border-slate-700">Last</th>
                          {years.map((y) => (
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
                                <td className="sticky left-0 z-10 bg-slate-950 p-2 border-b border-slate-800 w-40 min-w-[160px] truncate" title={r.current_name}>{r.current_name}</td>
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
                                {years.map(y=>{ const v=r.yearMap[y]; const podium=v===1||v===2||v===3; const isLast=maxByYear.get(y)===v; const faded=podiumOnly&&!podium&&!isLast; const color=podium? (v===1?"text-yellow-300":v===2?"text-slate-200":"text-amber-600") : isLast?"text-rose-400":"text-slate-400"; const divName=getDivisionName(r.team_id,y); const col=divColor(String(divName||"")); return (
                                  <td key={y} className={cn("p-2 border-b border-slate-800 text-center font-bold min-w-[96px] w-24", faded?"text-slate-500/20":color)} style={divName?{boxShadow:`inset 0 3px 0 0 ${col}`} : undefined} title={divName||undefined}>{Number.isFinite(v)? lastRender(v,y,podiumOnly):""}</td>
                                );})}
                              </tr>
                              {showHistory && segs.map((seg,sidx)=> (
                                <tr key={`${r.team_id}_seg_${sidx}`} className={cn(idx%2?"bg-slate-950":"bg-slate-900/50")}> 
                                  <td className="sticky left-0 z-10 bg-slate-950 p-2 border-b border-slate-800 text-slate-300 w-40 min-w-[160px] truncate" title={seg.team_name}>↳ {seg.team_name}</td>
                                  <td className="p-2 border-b border-slate-800 text-slate-300 w-36 min-w-[144px] truncate">{seg.owner} <span className="text-slate-500">({seg.start}-{seg.end})</span></td>
                                  <td className="p-2 border-b border-slate-800 text-center" />
                                  <td className="p-2 border-b border-slate-800 text-center bg-slate-900/60" colSpan={4} />
                                  {years.map(y=>{ const v=seg.yearVals[y]; const active=Number.isFinite(v); const podium=v===1||v===2||v===3; const isLast=maxByYear.get(y)===v; const faded=podiumOnly&&!podium&&!isLast; const color=podium? (v===1?"text-yellow-300":v===2?"text-slate-200":"text-amber-600") : isLast?"text-rose-400":"text-slate-400"; const divName=getDivisionName(r.team_id,y); const col=divColor(String(divName||"")); return (
                                    <td key={y} className={cn("p-2 border-b border-slate-800 text-center font-bold min-w-[96px] w-24", active&&"bg-slate-800/40", faded?"text-slate-500/20":color)} style={divName?{boxShadow:`inset 0 3px 0 0 ${col}`} : undefined} title={divName||undefined}>{active? lastRender(v,y,podiumOnly):""}</td>
                                  );})}
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold">Head-to-Head Arena</h2>

                <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs uppercase tracking-wide text-slate-400">Focal Franchise</label>
                      <select value={focalTeamId} onChange={e=>setFocalTeamId(e.target.value)} className="w-60 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm">
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

                <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 overflow-auto mt-3">
                  {/* <h3 className="font-semibold mb-2">Season Matrix</h3> */}
                  {(!focalTeamId||!h2hSeasons.length)? <p className="text-slate-400 text-sm">Choose a franchise.</p> : (
                    <table className="text-sm w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 bg-slate-900 z-20 p-2 text-left border-b border-slate-800">Opponent</th>
                          {h2hSeasons.map(s=> <th key={s} className="p-2 text-center border-b border-slate-800 min-w-[96px] w-24">{s}</th>)}
                        </tr>
                      </thead>
                      <tbody>{h2hRows}</tbody>
                    </table>
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

                <div className="grid md:grid-cols-3 gap-4 items-start mt-4">
                  <div className="md:col-span-2 rounded-xl border border-slate-800 p-3 bg-slate-900/60">
                    <h3 className="font-semibold mb-2">Trend vs Selected Opponents</h3>
                    <div className="h-[360px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={h2hTrendData} margin={{left:12,right:12,top:12,bottom:12}}>
                          <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                          <XAxis dataKey="season" tick={{fill:"#cbd5e1"}} stroke="#64748b" angle={-45} textAnchor="end" height={50} />
                          <YAxis tick={{fill:"#cbd5e1"}} stroke="#64748b" domain={[0,1]} ticks={[0,0.25,0.5,0.75,1]} />
                          <Tooltip
                            contentStyle={{background:"#0f172a",border:"1px solid #1f2937"}}
                            itemStyle={{color:"#e2e8f0"}}
                            labelStyle={{color:"#e2e8f0"}}
                            formatter={v=> v==null?"—":(v*100).toFixed(0)+"%"}
                          />
                          <Legend wrapperStyle={{color:"#e2e8f0"}} />
                          {oppSelection.map((o,idx)=> <Line key={o} type="monotone" dataKey={o} name={`vs ${getTeamName(o)}`} stroke={lineColors[idx%lineColors.length]} strokeOpacity={0.95} strokeWidth={2} dot={{r:2}} strokeDasharray={lineDashes[Math.floor(idx/lineColors.length)%lineDashes.length]} connectNulls />)}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60">
                    <h3 className="font-semibold mb-2">All-Time vs Opponents</h3>
                    <div className="w-full h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={h2hAllTimeBars} layout="vertical" margin={{left:40,right:12,top:12,bottom:12}}>
                          <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                          <XAxis type="number" domain={diffExtent} tick={{fill:"#cbd5e1"}} stroke="#64748b" />
                          <YAxis type="category" dataKey="label" width={yAxisWidth} interval={0} tickMargin={6} tick={{ fill: "#cbd5e1" }} tickFormatter={(v)=>String(v).replace(/ /g,'\u00A0')} stroke="#64748b" />
                          <Tooltip
                            contentStyle={{background:"#0f172a",border:"1px solid #1f2937"}}
                            itemStyle={{color:"#e2e8f0"}}
                            labelStyle={{color:"#e2e8f0"}}
                            formatter={(v,n,p)=>[v,p&&p.payload?`vs ${p.payload.label}`:""]}
                          />
                          <Legend wrapperStyle={{color:"#e2e8f0"}} />
                          <Bar dataKey="diff" name="Win-Loss Diff" fill="#22c55e">
                            {h2hAllTimeBars.map((d,idx)=>(<Cell key={`cell-${idx}`} fill={d.diff>=0?"#22c55e":"#ef4444"} />))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-3">
                <h2 className="text-xl font-bold">Wiggly Lines of Triumph (and Despair)</h2>
                <p className="text-slate-400 text-sm mb-2">Pick teams to plot their final standing over time. Lower is better; axis is flipped so #1 sits at the top.</p>
                <div className="grid md:grid-cols-5 gap-3 items-start">
                  <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 max-h-[560px] overflow-auto md:col-span-1">
                    <div className="grid grid-cols-1 gap-2">
                      {teamOptions.map(t=> (
                        <label key={t.id} className={cn("flex items-center gap-2 px-2 py-1 rounded cursor-pointer border", selectedTeamIds.includes(t.id)?"border-emerald-500/60 bg-emerald-900/20":"border-slate-800 hover:border-slate-700")}> 
                          <input type="checkbox" checked={selectedTeamIds.includes(t.id)} onChange={()=>toggleSelected(t.id)} />
                          <span className="text-sm leading-tight">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 md:col-span-4">
                    <div className="h-[560px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{left:12,right:12,top:12,bottom:12}}>
                          <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                          <XAxis dataKey="year" tick={{fill:"#cbd5e1"}} stroke="#64748b" angle={-45} textAnchor="end" height={50} />
                          <YAxis tick={{fill:"#cbd5e1"}} stroke="#64748b" allowDecimals={false} domain={[yMeta.domainMax,1]} ticks={yMeta.ticks} reversed />
                          <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1f2937",color:"#e2e8f0"}} />
                          <Legend wrapperStyle={{color:"#e2e8f0"}} />
                          {selectedTeamIds.map((id,idx)=> <Line key={id} type="monotone" dataKey={teamOptions.find(t=>t.id===id)?.label||id} stroke={lineColors[idx%lineColors.length]} strokeOpacity={0.95} strokeWidth={2} dot={{r:2}} strokeDasharray={lineDashes[Math.floor(idx/lineColors.length)%lineDashes.length]} connectNulls />)}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* <footer className="mt-12 text-center text-xs text-slate-500">Built with Tailwind, Recharts, and a healthy dose of trash-talk.</footer> */}
          <footer className="mt-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0"> <img src="/header.png" alt="Robot Rockstar" className="w-80 h-80 object-contain" /> Built with Tailwind, Recharts, and a healthy dose of trash-talk. </footer>
        </div>
      </main>
    </div>
  );
}
