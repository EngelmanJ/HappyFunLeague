\
import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const cn = (...xs) => xs.filter(Boolean).join(" ");

// Defaults for static hosting (GitHub Pages / Vite public folder)
const DEFAULT_CSV_URL =
  (typeof import.meta !== "undefined" ? import.meta.env.BASE_URL : "/") +
  "records_raw_with_owner_names.csv";
const DEFAULT_BANNER_URL =
  (typeof import.meta !== "undefined" ? import.meta.env.BASE_URL : "/") +
  "header.png";

function normalizeRow(raw) {
  const lower = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [String(k || "").toLowerCase().trim(), v])
  );
  const pick = (...names) => {
    for (const n of names) {
      const v = lower[String(n).toLowerCase()];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return undefined;
  };
  const team_id = String(
    pick("team_id", "unique id", "unique_id", "id", "uid", "team uid") ||
      pick("franchise id", "franchise_id") ||
      ""
  ).trim();
  const team_name = String(
    pick(
      "team_name",
      "team",
      "current name",
      "current_name",
      "franchise",
      "franchise_name",
      "name"
    ) || ""
  ).trim();
  const owner_first = (pick(
    "owner_first",
    "owner first",
    "owner_first_name",
    "team.owner.firstname",
    "owner firstname",
    "first name",
    "firstname",
    "first"
  ) || "").toString().trim();
  const owner_last = (pick(
    "owner_last",
    "owner last",
    "owner_last_name",
    "team.owner.lastname",
    "owner lastname",
    "last name",
    "lastname",
    "last"
  ) || "").toString().trim();
  let owner = [owner_first, owner_last].filter(Boolean).join(" ").trim();
  if (!owner) {
    const ownersJson = pick("team.owners", "owners", "team_owners");
    if (ownersJson && typeof ownersJson === "string") {
      try {
        const arr = JSON.parse(ownersJson);
        if (Array.isArray(arr) && arr.length) {
          const o = arr[0] || {};
          owner = [o.firstName, o.lastName].filter(Boolean).join(" ").trim();
        }
      } catch {}
    }
  }
  const yearRaw = pick("season", "year");
  const finalRaw = pick(
    "final_standing",
    "team.final_standing",
    "final standing",
    "final",
    "standing",
    "rank",
    "place",
    "final rank"
  );
  const year = Number(yearRaw);
  const final_standing = Number(finalRaw);
  return {
    team_id: team_id || team_name || owner || "",
    team_name,
    owner,
    year: Number.isFinite(year) ? year : undefined,
    final_standing: Number.isFinite(final_standing) ? final_standing : undefined,
    __raw: raw,
  };
}

function groupBy(xs, keyFn) {
  const m = new Map();
  for (const x of xs) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

function computeSeasonMaxByYear(rows) {
  const byYear = groupBy(
    rows.filter((r) => Number.isFinite(r.year) && Number.isFinite(r.final_standing)),
    (r) => r.year
  );
  const maxByYear = new Map();
  for (const [yr, list] of byYear.entries()) {
    maxByYear.set(yr, Math.max(...list.map((l) => l.final_standing)));
  }
  return maxByYear;
}

const lineColors = ["#ef4444", "#eab308", "#22c55e", "#3b82f6"];
const lineDashes = ["", "5 5"];

export default function HFL() {
  const [rows, setRows] = useState([]);
  const [podiumOnly, setPodiumOnly] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [parseError, setParseError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [headerImgUrl, setHeaderImgUrl] = useState(() => {
    try { return localStorage.getItem("hfl_header_art") || DEFAULT_BANNER_URL; } catch { return DEFAULT_BANNER_URL; }
  });
  const [lastStyle, setLastStyle] = useState("text");

  useEffect(() => {
    if (rows.length) return;
    Papa.parse(DEFAULT_CSV_URL, {
      download: true,
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (res) => {
        const normed = res.data.map(normalizeRow).filter((r) => r.year && r.team_id);
        setRows(normed);
        const ids = Array.from(new Set(normed.map((r) => r.team_id))).slice(0, 5);
        setSelectedTeamIds(ids);
      },
      error: (err) => setParseError(String(err?.message || err)),
    });
  }, []);

  const onHeaderArtUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      setHeaderImgUrl(data);
      try { localStorage.setItem("hfl_header_art", data); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const onCSVUpload = (file) => {
    setCsvFileName(file?.name || "");
    setParseError("");
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (res) => {
        const normed = res.data.map(normalizeRow).filter((r) => r.year && r.team_id);
        if (!normed.length) {
          setParseError(
            "No usable rows found. Check headers like team_id, team_name, owner_first, owner_last, year, final standing."
          );
        }
        setRows(normed);
        const ids = Array.from(new Set(normed.map((r) => r.team_id))).slice(0, 5);
        setSelectedTeamIds(ids);
      },
      error: (err) => setParseError(String(err?.message || err)),
    });
  };

  const years = useMemo(() => {
    const ys = Array.from(new Set(rows.map((r) => r.year).filter(Boolean))).sort((a, b) => a - b);
    return ys;
  }, [rows]);

  const seasonMaxByYear = useMemo(() => computeSeasonMaxByYear(rows), [rows]);
  const leagueMaxStandingEver = useMemo(() => {
    const vals = rows.map((r) => r.final_standing).filter(Number.isFinite);
    return vals.length ? Math.max(...vals) : 12;
  }, [rows]);

  const grouped = useMemo(() => groupBy(rows, (r) => r.team_id), [rows]);

  const summaryRows = useMemo(() => {
    const out = [];
    for (const [team_id, list] of grouped.entries()) {
      const byYear = groupBy(list, (r) => r.year);
      const last = list.slice().sort((a, b) => (a.year || 0) - (b.year || 0)).at(-1) || {};
      const current_name = last.team_name || "(unknown)";
      const current_owner = last.owner || "(unknown)";
      let firsts = 0,
        seconds = 0,
        thirds = 0,
        lasts = 0;
      const yearMap = {};
      for (const y of years) {
        const r = (byYear.get(y) || [])[0];
        const val = r?.final_standing;
        if (Number.isFinite(val)) {
          if (val === 1) firsts++;
          else if (val === 2) seconds++;
          else if (val === 3) thirds++;
          const seasonMax = seasonMaxByYear.get(y);
          if (seasonMax && val === seasonMax) lasts++;
        }
        yearMap[y] = Number.isFinite(val) ? val : null;
      }
      out.push({ team_id, current_name, current_owner, firsts, seconds, thirds, lasts, yearMap });
    }
    out.sort((a, b) => String(a.team_id).localeCompare(String(b.team_id), undefined, { numeric: true }));
    return out;
  }, [grouped, years, seasonMaxByYear]);

  const teamOptions = useMemo(
    () => summaryRows.map((r) => ({ id: r.team_id, label: `${r.current_name} (${r.team_id})`, name: r.current_name })),
    [summaryRows]
  );

  const chartData = useMemo(() => {
    if (!selectedTeamIds.length) return [];
    const idToLabel = new Map(teamOptions.map((o) => [o.id, o.label]));
    return years.map((y) => {
      const row = { year: y };
      for (const id of selectedTeamIds) {
        const team = summaryRows.find((t) => t.team_id === id);
        const label = idToLabel.get(id) || id;
        const val = team?.yearMap?.[y] ?? null;
        row[label] = Number.isFinite(val) ? val : null;
      }
      return row;
    });
  }, [years, selectedTeamIds, summaryRows, teamOptions]);

  const yMeta = useMemo(() => {
    const allVals = [];
    for (const r of chartData) {
      for (const [k, v] of Object.entries(r)) {
        if (k !== "year" && Number.isFinite(v)) allVals.push(v);
      }
    }
    const maxSel = allVals.length ? Math.max(...allVals) : leagueMaxStandingEver || 12;
    const domainMax = Math.max(1, maxSel);
    const ticks = [];
    for (let i = 1; i <= domainMax; i += 2) ticks.push(i);
    if (domainMax % 2 === 0 && ticks[ticks.length - 1] !== domainMax) ticks.push(domainMax);
    return { domainMax, ticks };
  }, [chartData, leagueMaxStandingEver]);

  const toggleSelected = (id) => {
    setSelectedTeamIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const ownerColHeaderClass = showHistory
    ? "bg-slate-900 border-b border-slate-800 p-2 text-left w-72 min-w-[288px] whitespace-nowrap"
    : "bg-slate-900 border-b border-slate-800 p-2 text-left w-40 min-w-[160px]";
  const ownerColCellClass = showHistory
    ? "p-2 border-b border-slate-800 w-72 min-w-[288px] whitespace-nowrap"
    : "p-2 border-b border-slate-800 w-40 min-w-[160px] truncate";

  const lastRender = (v, y, podiumOnlyMode) => {
    const isLast = seasonMaxByYear.get(y) === v;
    if (isLast && podiumOnlyMode) {
      if (lastStyle === "cry") return "😭";
      if (lastStyle === "skull") return "💀";
      return "LAST";
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative">
                {headerImgUrl ? (
                  <img src={headerImgUrl} alt="HFL header art" className="h-16 w-auto rounded-md border border-slate-800 shadow shrink-0" />
                ) : (
                  <div className="h-16 w-28 rounded-md border border-slate-800 bg-slate-800/40" />
                )}
                <input id="artfile" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onHeaderArtUpload(e.target.files[0])} className="sr-only" />
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
                  <input type="checkbox" className="peer sr-only" checked={podiumOnly} onChange={(e) => setPodiumOnly(e.target.checked)} />
                  <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 peer-checked:bg-amber-500/20 peer-checked:border-amber-400 text-sm">Podium-Only Goggles</span>
                </label>
                <label className="inline-flex items-center gap-2 select-none cursor-pointer justify-end">
                  <input type="checkbox" className="peer sr-only" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} />
                  <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 text-sm">History Nerd Mode</span>
                </label>
              </div>
              <div className="flex gap-3 items-center">
                <div className="inline-flex items-center gap-2 select-none">
                  <input id="csvfile" type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onCSVUpload(e.target.files[0])} className="sr-only" />
                  <label htmlFor="csvfile" className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm cursor-pointer">CSV:</label>
                  <span className="text-xs text-slate-300 truncate max-w-[260px]">{csvFileName || "No file chosen"}</span>
                </div>
                <div className="select-none">
                  <select value={lastStyle} onChange={(e) => setLastStyle(e.target.value)} className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm cursor-pointer">
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

      <main className="max-w-7xl mx-auto px-4 pb-24 pt-6">
        {!rows.length && (
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-200 font-medium">Loading default CSV from <code className="px-1 rounded bg-slate-800 border border-slate-700">public/records_raw_with_owner_names.csv</code>… or upload your own.</p>
            {parseError && <p className="text-rose-300 mt-2">{parseError}</p>}
          </div>
        )}

        {!!rows.length && (
          <>
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-3">League Timeline (rolled-up by franchise)</h2>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-auto">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="sticky left-0 z-30 bg-slate-900 border-b border-slate-800 p-2 text-center w-12 min-w-[48px]">Franchise</th>
                        <th className="sticky left-12 z-20 bg-slate-900 border-b border-slate-800 p-2 text-left w-40 min-w-[160px]">Name</th>
                        <th className={"bg-slate-900 border-b border-slate-800 p-2 text-left " + (showHistory ? "w-72 min-w-[288px] whitespace-nowrap" : "w-40 min-w-[160px]")}>Owner</th>
                        <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">1st</th>
                        <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">2nd</th>
                        <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">3rd</th>
                        <th className="bg-slate-900 border-b border-slate-800 p-2 text-center border-r-2 border-slate-700">Last</th>
                        {years.map((y) => (
                          <th key={y} className="bg-slate-900 border-b border-slate-800 p-2 text-center font-semibold">{y}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const groupedMap = new Map(grouped);
                        return Array.from(groupedMap.keys()).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).map((teamId, idx) => {
                          const list = groupedMap.get(teamId) || [];
                          const listSorted = list.slice().sort((a, b) => a.year - b.year);
                          const segments = [];
                          let cur = null;
                          for (const it of listSorted) {
                            const key = `${it.team_name}||${it.owner}`;
                            if (!cur || cur.key !== key) {
                              if (cur) segments.push(cur);
                              cur = { key, team_name: it.team_name, owner: it.owner, start: it.year, end: it.year, yearVals: {} };
                            } else {
                              cur.end = it.year;
                            }
                            if (Number.isFinite(it.final_standing)) cur.yearVals[it.year] = it.final_standing;
                          }
                          if (cur) segments.push(cur);
                          const byYear = groupBy(listSorted, (r) => r.year);
                          const last = listSorted.at(-1) || {};
                          const current_name = last.team_name || "(unknown)";
                          const current_owner = last.owner || "(unknown)";
                          let firsts = 0, seconds = 0, thirds = 0, lasts = 0;
                          const yearMap = {};
                          for (const y of years) {
                            const r = (byYear.get(y) || [])[0];
                            const val = r?.final_standing;
                            if (Number.isFinite(val)) {
                              if (val === 1) firsts++;
                              else if (val === 2) seconds++;
                              else if (val === 3) thirds++;
                              const seasonMax = seasonMaxByYear.get(y);
                              if (seasonMax && val === seasonMax) lasts++;
                            }
                            yearMap[y] = Number.isFinite(val) ? val : null;
                          }
                          return (
                            <React.Fragment key={teamId}>
                              <tr className={cn(idx % 2 ? "bg-slate-950" : "bg-slate-900/50")}>
                                <td className="sticky left-0 z-10 bg-slate-950 p-2 border-b border-slate-800 font-mono text-center w-12 min-w-[48px]">{teamId}</td>
                                <td className="sticky left-12 z-10 bg-slate-950 p-2 border-b border-slate-800 w-40 min-w-[160px] truncate" title={current_name}>{current_name}</td>
                                <td className={(showHistory ? "p-2 border-b border-slate-800 w-72 min-w-[288px] whitespace-nowrap" : "p-2 border-b border-slate-800 w-40 min-w-[160px] truncate")} title={current_owner}>{current_owner}</td>
                                <td className="p-2 border-b border-slate-800 text-center font-semibold text-amber-300 bg-slate-900/60">{firsts}</td>
                                <td className="p-2 border-b border-slate-800 text-center font-semibold text-slate-200 bg-slate-900/60">{seconds}</td>
                                <td className="p-2 border-b border-slate-800 text-center font-semibold text-amber-700 bg-slate-900/60">{thirds}</td>
                                <td className="p-2 border-b border-slate-800 text-center font-semibold text-rose-300 bg-slate-900/60 border-r-2 border-slate-700">{lasts}</td>
                                {years.map((y) => {
                                  const v = yearMap[y];
                                  const podium = v === 1 || v === 2 || v === 3;
                                  const isLast = seasonMaxByYear.get(y) === v;
                                  const faded = podiumOnly && !podium && !isLast;
                                  const podiumColor = v === 1 ? "text-yellow-300" : v === 2 ? "text-slate-200" : v === 3 ? "text-amber-600" : "";
                                  const color = podium ? podiumColor : isLast ? "text-rose-400" : "text-slate-400";
                                  const display = Number.isFinite(v) ? (isLast && podiumOnly ? (lastStyle === "cry" ? "😭" : lastStyle === "skull" ? "💀" : "LAST") : v) : "";
                                  return (
                                    <td key={y} className={cn("p-2 border-b border-slate-800 text-center font-bold", faded ? "text-slate-500/20" : color)}>{display}</td>
                                  );
                                })}
                              </tr>
                              {showHistory && segments.map((seg, sidx) => (
                                <tr key={`${teamId}_seg_${sidx}`} className={cn(idx % 2 ? "bg-slate-950" : "bg-slate-900/50")}>
                                  <td className="sticky left-0 z-10 bg-slate-950 p-2 border-b border-slate-800 text-center w-12 min-w-[48px]" />
                                  <td className="sticky left-12 z-10 bg-slate-950 p-2 border-b border-slate-800 text-slate-300 w-40 min-w-[160px] truncate" title={seg.team_name}>↳ {seg.team_name}</td>
                                  <td className={(showHistory ? "p-2 border-b border-slate-800 w-72 min-w-[288px] whitespace-nowrap" : "p-2 border-b border-slate-800 w-40 min-w-[160px] truncate") + " text-slate-300"}>{seg.owner} <span className="text-slate-500">({seg.start}-{seg.end})</span></td>
                                  <td className="p-2 border-b border-slate-800 text-center bg-slate-900/60" colSpan={4}></td>
                                  {years.map((y) => {
                                    const v = seg.yearVals[y];
                                    const active = Number.isFinite(v);
                                    const podium = v === 1 || v === 2 || v === 3;
                                    const isLast = seasonMaxByYear.get(y) === v;
                                    const faded = podiumOnly && !podium && !isLast;
                                    const podiumColor = v === 1 ? "text-yellow-300" : v === 2 ? "text-slate-200" : v === 3 ? "text-amber-600" : "";
                                    const color = podium ? podiumColor : isLast ? "text-rose-400" : "text-slate-400";
                                    const display = active ? (isLast && podiumOnly ? (lastStyle === "cry" ? "😭" : lastStyle === "skull" ? "💀" : "LAST") : v) : "";
                                    return (
                                      <td key={y} className={cn("p-2 border-b border-slate-800 text-center font-bold", active && "bg-slate-800/40", faded ? "text-slate-500/20" : color)}>{display}</td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Toggle Podium-Only Goggles to show 1st/2nd/3rd and last-place finishes; other finishes fade.</p>
            </section>

            <section className="mb-3">
              <h2 className="text-xl font-bold">Wiggly Lines of Triumph (and Despair)</h2>
              <p className="text-slate-400 text-sm mb-2">Pick teams to plot their final standing over time. Lower is better; axis is flipped so #1 sits at the top.</p>
              <div className="grid md:grid-cols-5 gap-3 items-start">
                <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 max-h-[560px] overflow-auto md:col-span-1">
                  <div className="grid grid-cols-1 gap-2">
                    {teamOptions.map((t) => (
                      <label key={t.id} className={cn("flex items-center gap-2 px-2 py-1 rounded cursor-pointer border", selectedTeamIds.includes(t.id) ? "border-emerald-500/60 bg-emerald-900/20" : "border-slate-800 hover:border-slate-700")}> 
                        <input type="checkbox" checked={selectedTeamIds.includes(t.id)} onChange={() => toggleSelected(t.id)} />
                        <span className="text-sm leading-tight">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 md:col-span-4">
                  <div className="h-[560px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                        <XAxis dataKey="year" tick={{ fill: "#cbd5e1" }} stroke="#64748b" />
                        <YAxis tick={{ fill: "#cbd5e1" }} stroke="#64748b" allowDecimals={false} domain={[yMeta.domainMax, 1]} ticks={yMeta.ticks} reversed />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1f2937", color: "#e2e8f0" }} />
                        <Legend wrapperStyle={{ color: "#e2e8f0" }} />
                        {selectedTeamIds.map((id, idx) => {
                          const label = teamOptions.find((t) => t.id === id)?.label || id;
                          const stroke = lineColors[idx % lineColors.length];
                          const dash = lineDashes[Math.floor(idx / lineColors.length) % lineDashes.length];
                          return (
                            <Line key={id} type="monotone" dataKey={label} stroke={stroke} strokeOpacity={0.95} strokeWidth={2} dot={{ r: 2 }} strokeDasharray={dash} connectNulls />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="mt-12 text-center text-xs text-slate-500">Built with Tailwind, Recharts, and a healthy dose of friendly trash-talk.</footer>
      </main>
    </div>
  );
}
