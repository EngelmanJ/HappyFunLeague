import React, { useEffect, useMemo, useState } from "react";
import { fetchText } from "./lib/data";
import { loadIssue, validateIndex, weekKey } from "./lib/digest";
import useHeaderImage from "./lib/useHeaderImage";
import ScrollTable from "./components/ScrollTable";
import ChartFrame from "./components/ChartFrame";
import { chartTooltipProps } from "./lib/charts";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import footerImg from "./assets/header.png";

export default function WeeklyDigest() {
  const [indexData, setIndexData] = useState(null);
  const [activeKey, setActiveKey] = useState("");
  const [issue, setIssue] = useState(null);
  const [indexError, setIndexError] = useState("");
  const [retry, setRetry] = useState(0);
  const headerImgUrl = useHeaderImage();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIndexError("");
    fetchText('data/weekly/index.json', controller.signal)
      .then(text => validateIndex(JSON.parse(text)))
      .then(index => {
        if (!active) return;
        setIndexData(index);
        setActiveKey(previous => index.weeks.some(w => weekKey(w) === previous) ? previous : weekKey(index.weeks[0]));
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
      <header className="xl:sticky xl:top-0 z-50 site-header border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative">
                {/* {headerImgUrl? <img src={headerImgUrl} alt="HFL header art" className="h-24 md:h-28 w-auto rounded-md border border-slate-800 shadow shrink-0" /> : <div className="h-16 w-28 rounded-md border border-slate-800 bg-slate-800/40" />} */}
                {headerImgUrl? <img src={headerImgUrl} alt="Happy Fun League Logo" className="h-24 md:h-28 w-auto object-contain" /> : <div className="h-16 w-28 rounded-md border border-slate-800 bg-slate-800/40" />}
              </div>
              <h1 className="text-[2rem] leading-[2.25rem] md:text-[3rem] md:leading-[3rem] font-black tracking-tight">
                <span className="block">Happy Fun League</span>
                <span className="block">
                  <span className="text-fuchsia-400">Weekly Summaries of Glory</span> & <span className="text-rose-400">Shame</span>
                </span>
              </h1>
            </div>
            <a
              href={"#/"}
              // className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700/60"
              className="px-5 py-2 rounded-full bg-slate-800 border border-slate-700 text-lg font-semibold hover:bg-slate-700/60 whitespace-nowrap"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {err && <p role="alert" className="text-rose-300 mb-3">{err} <button className="underline" onClick={() => setRetry(n => n + 1)}>Retry</button></p>}

        <div className="grid md:grid-cols-[14rem_minmax(0,1fr)] gap-4 items-start">
          <aside className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <h2 className="font-semibold mb-2">Select Week</h2>
            <select aria-label="Select Week" className="md:hidden w-full min-h-11 rounded border border-slate-700 bg-slate-900 px-2 text-base" value={activeKey} onChange={event => setActiveKey(event.target.value)} disabled={!indexData}>
              {!indexData && <option value="">Loading weeks…</option>}
              {indexData?.weeks.map(w => <option key={weekKey(w)} value={weekKey(w)}>{w.title || `Week ${String(w.week).padStart(2,"0")}, ${w.year}`}</option>)}
            </select>
            <div className="hidden md:block space-y-1 max-h-[420px] overflow-auto">
              {indexData?.weeks?.map(w => {
                const key = `${w.year}-W${String(w.week).padStart(2,"0")}`;
                const label = w.title || `Week ${String(w.week).padStart(2,"0")}, ${w.year}`;
                return (
                  <button
                    key={key}
                    aria-pressed={activeKey === key}
                    onClick={() => setActiveKey(key)}
                    className={`w-full text-left px-2 py-1 rounded border ${activeKey===key ? "border-emerald-500/60 bg-emerald-900/20" : "border-slate-800 hover:border-slate-700"}`}
                    title={label}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </aside>

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
                <ChartFrame label="Weekly points" height={224}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tinyChartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                      <XAxis dataKey="date" tick={{ fill: "#cbd5e1" }} stroke="#64748b" angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fill: "#cbd5e1" }} stroke="#64748b" />
                      <Tooltip {...chartTooltipProps} />
                      <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
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
          </section>
        </div>
        {/* <footer className="mt-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0"> <img src="header.png" alt="Robot Rockstar" className="w-80 h-80 object-contain" /> Built with Tailwind, Recharts, and a healthy dose of trash-talk. </footer> */}
        <footer className="mt-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0"> <img src={footerImg} alt="Robot Rockstar" className="w-80 h-80 object-contain" /> Built with Tailwind, Recharts, and a healthy dose of trash-talk. </footer>
      </main>
    </div>
  );
}
