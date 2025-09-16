import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
// const base = (import.meta?.env?.BASE_URL) ? import.meta.env.BASE_URL : "/";
const base = ""; // use relative URLs

const fetchText = async (url) => {
  try { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) return null; return await r.text(); } catch { return null; }
};
const fetchJSON = async (url) => {
  try { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) return null; return await r.json(); } catch { return null; }
};

export default function WeeklyDigest() {
  const [indexData, setIndexData] = useState(null);
  const [activeKey, setActiveKey] = useState("");
  const [summaryHTML, setSummaryHTML] = useState("");
  const [stats, setStats] = useState(null);
  const [statsCSV, setStatsCSV] = useState(null);
  const [err, setErr] = useState("");

  // const [headerImgUrl] = useState(() => {
  //   try { return localStorage.getItem("hfl_header_art") || `${base}assets/hfl-header-gritty.png`; }
  //   catch { return `${base}assets/hfl-header-gritty.png`; }
  // });
  const [headerImgUrl] = useState(() => { try { return localStorage.getItem("hfl_header_art") || `assets/hfl-header-gritty.png`; } catch { return `assets/hfl-header-gritty.png`; } });

  useEffect(() => {
    (async () => {
      // const idx = await fetchJSON(`${base}data/weekly/index.json`);
      const idx = await fetchJSON(`data/weekly/index.json`);
      if (!idx || !idx.weeks?.length) { setErr("No weekly index found."); return; }
      setIndexData(idx);
      const first = idx.weeks[0];
      setActiveKey(prev => prev || `${first.year}-W${String(first.week).padStart(2,"0")}`);
    })();
  }, []);

  useEffect(() => {
    if (!indexData || !activeKey) return;
    const week = indexData.weeks.find(w => `${w.year}-W${String(w.week).padStart(2,"0")}` === activeKey);
    if (!week) return;

    (async () => {
      // const html = await fetchText(`${base}${week.summary}`);
      const html = await fetchText(`${week.summary}`);
      if (!html) { setErr("Failed to load summary.html"); return; }
      setSummaryHTML(html);
    })();

    (async () => {
      // const url = `${base}${week.stats}`;
      const url = `${week.stats}`;
      if (url.endsWith(".json")) {
        const j = await fetchJSON(url);
        setStats(j);
        setStatsCSV(null);
      } else if (url.endsWith(".csv")) {
        const t = await fetchText(url);
        if (!t) { setErr("Failed to load stats.csv"); return; }
        const parsed = Papa.parse(t, { header: true, skipEmptyLines: true }).data;
        setStatsCSV(parsed);
        setStats(null);
      }
    })();
  }, [indexData, activeKey]);

  const tinyChartData = useMemo(() => {
    if (stats?.trend) return stats.trend;
    if (Array.isArray(statsCSV)) {
      return statsCSV.map(r => ({ date: r.date, value: Number(r.value) || 0 }));
    }
    return [];
  }, [stats, statsCSV]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="xl:sticky xl:top-0 z-40 bg-slate-900/95 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative">
                {headerImgUrl
                  ? <img src={headerImgUrl} alt="HFL header art" className="h-24 md:h-28 w-auto rounded-md border border-slate-800 shadow shrink-0" />
                  : <div className="h-16 w-28 rounded-md border border-slate-800 bg-slate-800/40" />
                }
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
        {err && <p className="text-rose-300 mb-3">{err}</p>}

        <div className="grid md:grid-cols-[18rem_1fr] gap-4 items-start">
          <aside className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <h2 className="font-semibold mb-2">Select Week</h2>
            <div className="space-y-1 max-h-[420px] overflow-auto">
              {indexData?.weeks?.map(w => {
                const key = `${w.year}-W${String(w.week).padStart(2,"0")}`;
                const label = w.title || `Week ${String(w.week).padStart(2,"0")}, ${w.year}`;
                return (
                  <button
                    key={key}
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

          <section className="space-y-4">
            <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              {/* <h2 className="text-lg font-semibold mb-3">Summary</h2> */}
              {!summaryHTML ? (
                <p className="text-slate-400 text-sm">Loading…</p>
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
                <p className="text-slate-400 text-sm">No stats for this week.</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tinyChartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                      <XAxis dataKey="date" tick={{ fill: "#cbd5e1" }} stroke="#64748b" angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fill: "#cbd5e1" }} stroke="#64748b" />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1f2937", color: "#e2e8f0" }} />
                      <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {Array.isArray(stats?.table) && stats.table.length > 0 && (
                <div className="mt-4 overflow-auto">
                  <table className="text-sm w-full">
                    <thead>
                      <tr>
                        {Object.keys(stats.table[0]).map(k => (
                          <th key={k} className="bg-slate-900 border-b border-slate-800 p-2 text-left">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.table.map((row, i) => (
                        <tr key={i} className={i%2 ? "bg-slate-950" : "bg-slate-900/40"}>
                          {Object.keys(row).map(k => (
                            <td key={k} className="p-2 border-b border-slate-800">{row[k]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
