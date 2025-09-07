import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import LeagueTimeline from "./components/LeagueTimeline";
import H2H from "./components/H2H";
import WigglyLines from "./components/WigglyLines";
import {
  cn,
  normalizeRow,
  normalizeH2HSummaryRow,
  normalizeH2HGameRow,
  normalizeDivisionsBySeasonRow,
  normalizeTeamDivisionRow,
  groupBy,
  seasonMaxByYear
} from "./lib/core";

export default function App(){
  const [rows,setRows]=useState([]);
  const [parseError,setParseError]=useState("");
  const [csvFileName,setCsvFileName]=useState("");

  const [podiumOnly,setPodiumOnly]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [lastStyle,setLastStyle]=useState("text");
  const [selectedTeamIds,setSelectedTeamIds]=useState([]);

  const [headerImgUrl,setHeaderImgUrl]=useState(()=>{
    try{return localStorage.getItem("hfl_header_art")||"/assets/hfl-header-gritty.png";}catch{return "/assets/hfl-header-gritty.png";}
  });

  const [h2hSummary,setH2hSummary]=useState([]);
  const [h2hGames,setH2hGames]=useState([]);
  const [h2hErr,setH2hErr]=useState("");
  const [h2hSummaryName,setH2hSummaryName]=useState("");
  const [h2hGamesName,setH2hGamesName]=useState("");
  const [focalTeamId,setFocalTeamId]=useState("");
  const [selectedOppIds,setSelectedOppIds]=useState([]);

  const [divSeasonRows,setDivSeasonRows]=useState([]);
  const [teamDivRows,setTeamDivRows]=useState([]);
  const [divSeasonName,setDivSeasonName]=useState("");
  const [teamDivName,setTeamDivName]=useState("");

  useEffect(()=>{ document.documentElement.style.setProperty('--mobile-lock-width','1024px'); },[]);

  const onHeaderArtUpload=(file)=>{ if(!file) return; const r=new FileReader(); r.onload=()=>{ const data=String(r.result||""); setHeaderImgUrl(data); try{localStorage.setItem("hfl_header_art",data);}catch{} }; r.readAsDataURL(file); };

  const onCSVUpload=(file)=>{ setCsvFileName(file?.name||""); setParseError(""); Papa.parse(file,{header:true,skipEmptyLines:true,complete:(res)=>{ const norm=res.data.map(normalizeRow).filter(r=>r.year&&r.team_id); if(!norm.length) setParseError("No usable rows found. Expect team_id, team_name, owner_first, owner_last, season, final_standing."); setRows(norm); const ids=[...new Set(norm.map(r=>r.team_id))]; if(ids.length){ const rand=ids[Math.floor(Math.random()*ids.length)]; setSelectedTeamIds([rand]); if(!focalTeamId) setFocalTeamId(rand);} else setSelectedTeamIds([]); }, error:(e)=>setParseError(String(e?.message||e))}); };

  const onH2HSummaryUpload=(file)=>{ if(!file) return; setH2hSummaryName(file.name); setH2hErr(""); Papa.parse(file,{header:true,skipEmptyLines:true,complete:(res)=>{ const n=res.data.map(normalizeH2HSummaryRow).filter(r=>r.team_id&&r.opp_id&&r.season); setH2hSummary(n); if(!focalTeamId&&n.length) setFocalTeamId(n[0].team_id); }, error:(e)=>setH2hErr(String(e?.message||e))}); };
  const onH2HGamesUpload=(file)=>{ if(!file) return; setH2hGamesName(file.name); setH2hErr(""); Papa.parse(file,{header:true,skipEmptyLines:true,complete:(res)=>{ setH2hGames(res.data.map(normalizeH2HGameRow).filter(Boolean)); }, error:(e)=>setH2hErr(String(e?.message||e))}); };

  const onDivSeasonUpload=(file)=>{ if(!file) return; setDivSeasonName(file.name); Papa.parse(file,{header:true,skipEmptyLines:true,complete:(res)=>{ setDivSeasonRows(res.data.map(normalizeDivisionsBySeasonRow).filter(r=>r.season&&r.division_id)); }}); };
  const onTeamDivUpload=(file)=>{ if(!file) return; setTeamDivName(file.name); Papa.parse(file,{header:true,skipEmptyLines:true,complete:(res)=>{ setTeamDivRows(res.data.map(normalizeTeamDivisionRow).filter(r=>r.season&&r.team_id&&r.division_id)); }}); };

  useEffect(() => {
    async function maybeLoad(path, handler) {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) return;
        const text = await res.text();
        Papa.parse(text, { header: true, skipEmptyLines: true, complete: (r) => handler(r) });
      } catch {}
    }
    maybeLoad("/data/records_raw_with_owner_names.csv", (res) => {
      const norm = res.data.map(normalizeRow).filter(r => r.year && r.team_id);
      if (!norm.length) return;
      setRows(norm);
      const ids = [...new Set(norm.map(r => r.team_id))];
      if (ids.length) {
        const rand = ids[Math.floor(Math.random() * ids.length)];
        setSelectedTeamIds([rand]);
        if (!focalTeamId) setFocalTeamId(rand);
      }
    });
    maybeLoad("/data/h2h_summary.csv", (res) => setH2hSummary(res.data.map(normalizeH2HSummaryRow).filter(r => r.team_id && r.opp_id && r.season)));
    maybeLoad("/data/h2h_games.csv", (res) => setH2hGames(res.data.map(normalizeH2HGameRow).filter(Boolean)));
    maybeLoad("/data/divisions_by_season.csv", (res) => setDivSeasonRows(res.data.map(normalizeDivisionsBySeasonRow).filter(r => r.season && r.division_id)));
    maybeLoad("/data/team_divisions.csv", (res) => setTeamDivRows(res.data.map(normalizeTeamDivisionRow).filter(r => r.season && r.team_id && r.division_id)));
  }, []);

  const years=useMemo(()=>[...new Set(rows.map(r=>r.year).filter(Boolean))].sort((a,b)=>a-b),[rows]);
  const maxByYear=useMemo(()=>seasonMaxByYear(rows),[rows]);
  const grouped=useMemo(()=>groupBy(rows,r=>r.team_id),[rows]);

  const divNameMap=useMemo(()=>{const m=new Map(); for(const r of divSeasonRows){ if(!r.season||!r.division_id) continue; if(!m.has(r.season)) m.set(r.season,new Map()); m.get(r.season).set(r.division_id,r.division_name||r.division_id);} return m;},[divSeasonRows]);
  const teamDivMap=useMemo(()=>{const m=new Map(); for(const r of teamDivRows){ if(!r.season||!r.team_id||!r.division_id) continue; m.set(`${r.season}__${r.team_id}`,r.division_id);} return m;},[teamDivRows]);
  const getDivisionName=(team_id,season)=>{ if(!team_id||!season) return; const did=teamDivMap.get(`${season}__${team_id}`); if(!did) return; const by=divNameMap.get(season); return (by&&by.get(did))||did; };

  const leagueMax = useMemo(() => {
    const v = rows.map(r => r.final_standing).filter(Number.isFinite);
    return v.length ? Math.max(...v) : 12;
  }, [rows]);

  const summaryRows = useMemo(()=>{
    const out=[];
    for(const [team_id,list] of grouped){
      const byY = groupBy(list, r=>r.year);
      const last = list.slice().sort((a,b)=>(a.year||0)-(b.year||0)).at(-1)||{};
      const current_name = last.team_name || "(unknown)";
      const current_owner = last.owner || "(unknown)";
      const current_div = getDivisionName(team_id,last.year);
      let firsts=0,seconds=0,thirds=0,lasts=0;
      const yearMap={};
      for(const y of years){
        const r=(byY.get(y)||[])[0];
        const v=r?.final_standing;
        if(Number.isFinite(v)){
          if(v===1) firsts++;
          else if(v===2) seconds++;
          else if(v===3) thirds++;
          const m=maxByYear.get(y);
          if(m&&v===m) lasts++;
        }
        yearMap[y] = Number.isFinite(v)? v : null;
      }
      out.push({team_id,current_name,current_owner,current_division:current_div,firsts,seconds,thirds,lasts,yearMap});
    }
    out.sort((a,b)=>String(a.team_id).localeCompare(String(b.team_id),undefined,{numeric:true}));
    return out;
  },[grouped,years,maxByYear,divNameMap,teamDivMap]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative">
                {headerImgUrl? <img src={headerImgUrl} alt="HFL header art" className="h-16 w-auto rounded-md border border-slate-800 shadow shrink-0" /> : <div className="h-16 w-28 rounded-md border border-slate-800 bg-slate-800/40" />}
                <input id="artfile" type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&onHeaderArtUpload(e.target.files[0])} className="sr-only" />
                <label htmlFor="artfile" className="absolute -bottom-2 left-0 translate-y-full mt-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] cursor-pointer">Change Art</label>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                <span className="block">Happy Fun League</span>
                <span className="block"><span className="text-fuchsia-400">Records of Glory</span> & <span className="text-rose-400">Shame</span></span>
              </h1>
            </div>
            <div className="flex flex-col items-end gap-2 max-w-full">
              <div className="flex gap-3 items-center">
                <label className="inline-flex items-center gap-2 select-none cursor-pointer justify-end">
                  <input type="checkbox" className="peer sr-only" checked={podiumOnly} onChange={e=>setPodiumOnly(e.target.checked)} />
                  <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 peer-checked:bg-amber-500/20 peer-checked:border-amber-400 text-sm">Podium-Only Goggles</span>
                </label>
                <label className="inline-flex items-center gap-2 select-none cursor-pointer justify-end">
                  <input type="checkbox" className="peer sr-only" checked={showHistory} onChange={e=>setShowHistory(e.target.checked)} />
                  <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 text-sm">History Nerd Mode</span>
                </label>
              </div>
              <div className="flex gap-3 items-center flex-wrap justify-end">
                <div className="inline-flex items-center gap-2 select-none">
                  <input id="csvfile" type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&onCSVUpload(e.target.files[0])} className="sr-only" />
                  <label htmlFor="csvfile" className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm cursor-pointer">CSV:</label>
                  <span className="text-xs text-slate-300 truncate max-w-[260px]">{csvFileName||"No file chosen"}</span>
                </div>
                <div className="inline-flex items-center gap-2 select-none">
                  <input id="divseason" type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&onDivSeasonUpload(e.target.files[0])} className="sr-only" />
                  <label htmlFor="divseason" className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm cursor-pointer">Divisions by Season:</label>
                  <span className="text-xs text-slate-300 truncate max-w-[220px]">{divSeasonName||"No file"}</span>
                </div>
                <div className="inline-flex items-center gap-2 select-none">
                  <input id="teamdiv" type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&onTeamDivUpload(e.target.files[0])} className="sr-only" />
                  <label htmlFor="teamdiv" className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm cursor-pointer">Team Divisions:</label>
                  <span className="text-xs text-slate-300 truncate max-w-[220px]">{teamDivName||"No file"}</span>
                </div>
                <div className="select-none">
                  <select value={lastStyle} onChange={e=>setLastStyle(e.target.value)} className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm cursor-pointer">
                    <option value="text">Style: LAST</option>
                    <option value="cry">Style: 😭</option>
                    <option value="skull">Style: 💀</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-24 pt-6 overflow-x-auto">
        <div className="min-w-[var(--mobile-lock-width)] md:min-w-0">
          {!rows.length && (
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-slate-200 font-medium">Upload <code className="px-1 rounded bg-slate-800 border border-slate-700">records_raw_with_owner_names.csv</code> to get started.</p>
              <p className="text-slate-400 text-sm mt-2">Expect headers like team_id, team_name, owner_first, owner_last, season, final_standing.</p>
              {parseError && <p className="text-rose-300 mt-2">{parseError}</p>}
            </div>
          )}

          {!!rows.length && (
            <>
              <LeagueTimeline
                years={years}
                summaryRows={summaryRows}
                grouped={grouped}
                maxByYear={maxByYear}
                getDivisionName={getDivisionName}
                podiumOnly={podiumOnly}
                showHistory={showHistory}
                lastStyle={lastStyle}
              />

              <H2H
                h2hSummary={h2hSummary}
                h2hGames={h2hGames}
                summaryRows={summaryRows}
                getDivisionName={getDivisionName}
                focalTeamId={focalTeamId}
                setFocalTeamId={setFocalTeamId}
                selectedOppIds={selectedOppIds}
                setSelectedOppIds={setSelectedOppIds}
              />

              <WigglyLines
                years={years}
                summaryRows={summaryRows}
                selectedTeamIds={selectedTeamIds}
                setSelectedTeamIds={setSelectedTeamIds}
              />
            </>
          )}

          <footer className="mt-12 text-center text-xs text-slate-500">Built with Tailwind, Recharts, and a healthy dose of friendly trash-talk.</footer>
        </div>
      </main>
    </div>
  );
}
