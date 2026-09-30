import React, { useEffect, useMemo, useState } from "react";
import { fetchText } from "./lib/data";
import { loadIssue, validateIndex, weekKey } from "./lib/digest";
import CopyIssueLink from "./components/CopyIssueLink";
import SiteHeader from "./components/SiteHeader";
import { Link, useSearchParams } from "react-router-dom";
import ScrollTable from "./components/ScrollTable";
import ChartFrame from "./components/ChartFrame";
import { chartTooltipProps } from "./lib/charts";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import footerImg from "./assets/header.png";

export default function WeeklyDigest() {
  const [indexData, setIndexData] = useState(null);
  const [params, setParams] = useSearchParams();
  const requestedKey = params.get('issue');
  const activeKey = requestedKey || (indexData ? weekKey(indexData.weeks[0]) : '');
  const setActiveKey = key => setParams({issue:key});
  const selectedIndex = indexData?.weeks.findIndex(w => weekKey(w) === activeKey) ?? -1;
  const selectedWeek = indexData?.weeks[selectedIndex];
  const years = [...new Set(indexData?.weeks.map(w=>w.year) ?? [])];
  const [issue, setIssue] = useState(null);
  const [indexError, setIndexError] = useState("");
  const [retry, setRetry] = useState(0);


  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIndexError("");
    fetchText('data/weekly/index.json', controller.signal)
      .then(text => validateIndex(JSON.parse(text)))
      .then(index => {
        if (!active) return;
        setIndexData(index);
      }).catch(() => { if (active) setIndexError("Could not load the weekly index."); });
    return () => { active = false; controller.abort(); };
  }, [retry]);

  useEffect(() => {
    const week = indexData?.weeks.find(w => weekKey(w) === activeKey);
    if (!week) return;
    const controller = new AbortController();
    let active = true;
    setIssue(null);
    loadIssue(week, controller.signal).then(result => {
      if (active) setIssue({ ...result, key: activeKey });
    });
    return () => { active = false; controller.abort(); };
  }, [indexData, activeKey]);

  const current = issue?.key === activeKey ? issue : null;
  const summaryHTML = current?.summaryHTML ?? "";
  const stats = current?.stats;
  const err = indexError || current?.error;
  const tinyChartData = stats?.trend ?? [];
  const columns = useMemo(() => [...new Set((stats?.table ?? []).flatMap(row => Object.keys(row)))], [stats]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {err && <p role="alert" className="text-rose-300 mb-3">{err} <button className="underline" onClick={() => setRetry(n => n + 1)}>Retry</button></p>}

        <div>
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-emerald-300 mb-2">{selectedIndex === 0 ? 'Fresh from the league' : 'From the archive'}</p>
            <h2 className="text-3xl font-bold mb-2">{selectedWeek ? 'Week '+selectedWeek.week+' · '+selectedWeek.year : 'Weekly Summaries'}</h2>
            <p className="text-slate-400">The matchups, the upsets, and the weekly bragging rights.</p>
          </div>
          {indexData && <nav aria-label="Issue navigation" className="issue-nav mb-6">
            <label>Season<select aria-label="Season" value={selectedWeek?.year ?? ''} onChange={e=>setActiveKey(weekKey(indexData.weeks.find(w=>w.year===Number(e.target.value))))}>
             {!selectedWeek && <option value="">Choose season</option>}{years.map(y=><option key={y} value={y}>{y}</option>)}
            </select></label>
            <label>Week<select aria-label="Select Week" value={activeKey} onChange={e=>setActiveKey(e.target.value)}>
             {!selectedWeek && <option value={activeKey}>Choose week</option>}{indexData.weeks.filter(w=>w.year===selectedWeek?.year).map(w=><option key={weekKey(w)} value={weekKey(w)}>Week {w.week}</option>)}
            </select></label>
            <div className="flex gap-2 flex-wrap">
             <button disabled={selectedIndex<0 || selectedIndex===indexData.weeks.length-1} onClick={()=>setActiveKey(weekKey(indexData.weeks[selectedIndex+1]))}>← Previous</button>
             <button disabled={selectedIndex<=0} onClick={()=>setActiveKey(weekKey(indexData.weeks[selectedIndex-1]))}>Next →</button>
            </div>
            {selectedWeek && <CopyIssueLink key={activeKey} issueKey={activeKey} />}
          </nav>}
          {indexData && !selectedWeek ? <p role="alert">This issue is not available. <Link to="/weekly" className="underline">Read the latest issue</Link>.</p> :
          <section className="space-y-4 min-w-0">
            <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              {/* <h2 className="text-lg font-semibold mb-3">Summary</h2> */}
              {!summaryHTML ? (
                <p className="text-slate-400 text-sm">{current || indexError ? "Newsletter unavailable." : "Loading…"}</p>
              ) : (
                <div
                  className="prose prose-invert !max-w-none w-full"
                  dangerouslySetInnerHTML={{ __html: summaryHTML }}
                />
              )}
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-lg font-semibold mb-3">Key Stats</h2>
              {!tinyChartData.length ? (
                <p className="text-slate-400 text-sm">{!current && !indexError ? "Loading statistics…" : stats?.table?.length ? "" : "No stats for this week."}</p>
              ) : (
                <ChartFrame label="League total points by week" height={224}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tinyChartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                      <XAxis dataKey="date" tick={{ fill: "#cbd5e1" }} stroke="#64748b" angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fill: "#cbd5e1" }} stroke="#64748b" />
                      <Tooltip {...chartTooltipProps} />
                      <Line name="League total points" type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartFrame>
              )}
              {Array.isArray(stats?.table) && stats.table.length > 0 && (
                <ScrollTable label="Weekly statistics" className="mt-4">
                    <thead>
                      <tr>
                        {columns.map(k => (
                          <th key={k} className="bg-slate-900 border-b border-slate-800 p-2 text-left">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.table.map((row, i) => (
                        <tr key={i} className={i%2 ? "bg-slate-950" : "bg-slate-900/40"}>
                          {columns.map(k => (
                            <td key={k} className="p-2 border-b border-slate-800">{row[k] == null ? "—" : String(row[k])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </ScrollTable>
              )}
            </article>
          </section>}
          <Link to="/history" className="block mt-8 p-5 rounded-xl border border-slate-700 bg-slate-900 hover:border-emerald-500"><strong className="text-lg">Explore league history →</strong><p className="text-slate-400 mt-1">Revisit the champions, settle a rivalry, or trace your rise through the standings.</p></Link>
        </div>
        {/* <footer className="mt-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0"> <img src="header.png" alt="Robot Rockstar" className="w-80 h-80 object-contain" /> Built with Tailwind, Recharts, and a healthy dose of trash-talk. </footer> */}
        <footer className="mt-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0"> <img src={footerImg} alt="Robot Rockstar" className="w-80 h-80 object-contain" /> Built with Tailwind, Recharts, and a healthy dose of trash-talk. </footer>
      </main>
    </div>
  );
}
