import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { cn } from "../lib/core";
import { divisionBandStyle } from "../lib/colors";

const lineColors = ["#ef4444","#eab308","#22c55e","#3b82f6"];
const lineDashes = ["","5 5"];

export default function H2H({ h2hSummary, h2hGames, summaryRows, getDivisionName, focalTeamId, setFocalTeamId, selectedOppIds, setSelectedOppIds }){
  const getTeamName = (id) => summaryRows.find((r) => r.team_id === id)?.current_name || `Team ${id}`;

  const h2hSeasons = useMemo(() => {
    const ys = new Set([
      ...h2hSummary.map((r) => r.season).filter(Boolean),
      ...h2hGames.map((g) => g.season).filter(Boolean)
    ]);
    return [...ys].sort((a, b) => a - b);
  }, [h2hSummary, h2hGames]);

  const h2hIndex = useMemo(() => {
    const key = (s, t, o) => `${s}__${t}__${o}`;
    const idx = new Map();
    for (const r of h2hSummary) {
      const k = key(r.season, r.team_id, r.opp_id);
      const cur = idx.get(k) || { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 };
      cur.wins += r.wins || 0;
      cur.losses += r.losses || 0;
      cur.ties += r.ties || 0;
      cur.pf += r.pf || 0;
      cur.pa += r.pa || 0;
      idx.set(k, cur);
    }
    for (const g of h2hGames) {
      const kAB = key(g.season, g.a, g.b);
      const ab = idx.get(kAB) || { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 };
      ab.wins += g.winsA || 0;
      ab.losses += g.winsB || 0;
      ab.ties += g.ties || 0;
      ab.pf += g.as || 0;
      ab.pa += g.bs || 0;
      idx.set(kAB, ab);
      const kBA = key(g.season, g.b, g.a);
      const ba = idx.get(kBA) || { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 };
      ba.wins += g.winsB || 0;
      ba.losses += g.winsA || 0;
      ba.ties += g.ties || 0;
      ba.pf += g.bs || 0;
      ba.pa += g.as || 0;
      idx.set(kBA, ba);
    }
    return idx;
  }, [h2hSummary, h2hGames]);

  const oppListForFocal = useMemo(() => {
    if (!focalTeamId) return [];
    const opps = new Set();
    for (const k of h2hIndex.keys()) {
      const [, t, o] = k.split("__");
      if (t === String(focalTeamId)) opps.add(o);
    }
    return [...opps].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [focalTeamId, h2hIndex]);

  const defaultOppSelection = useMemo(() => {
    const arr = oppListForFocal.map((opp) => {
      let games = 0;
      for (const s of h2hSeasons) {
        const r = h2hIndex.get(`${s}__${focalTeamId}__${opp}`);
        if (r) games += (r.wins || 0) + (r.losses || 0) + (r.ties || 0);
      }
      return { opp, games };
    });
    arr.sort((a, b) => b.games - a.games);
    return arr.slice(0, 4).map((x) => x.opp);
  }, [oppListForFocal, h2hSeasons, h2hIndex, focalTeamId]);

  const oppSelection = selectedOppIds.length ? selectedOppIds : defaultOppSelection;

  const h2hMatrix = useMemo(() => {
    return oppListForFocal.map((opp) => {
      const cells = {};
      for (const s of h2hSeasons) {
        const rec = h2hIndex.get(`${s}__${focalTeamId}__${opp}`);
        if (!rec) {
          cells[s] = { txt: "", pct: undefined, div: getDivisionName(opp, s) };
          continue;
        }
        const g = (rec.wins || 0) + (rec.losses || 0) + (rec.ties || 0);
        const pct = g ? (rec.wins + 0.5 * (rec.ties || 0)) / g : undefined;
        const txt = g ? `${rec.wins}-${rec.losses}${rec.ties ? `-${rec.ties}` : ``}` : "";
        cells[s] = { txt, pct, div: getDivisionName(opp, s) };
      }
      return { opp, cells };
    });
  }, [oppListForFocal, h2hSeasons, h2hIndex, focalTeamId, getDivisionName]);

  const h2hTrendData = useMemo(() => {
    if (!focalTeamId) return [];
    return h2hSeasons.map((s) => {
      const row = { season: s };
      for (const o of oppSelection) {
        const rec = h2hIndex.get(`${s}__${focalTeamId}__${o}`);
        if (!rec) {
          row[o] = null;
          continue;
        }
        const g = (rec.wins || 0) + (rec.losses || 0) + (rec.ties || 0);
        row[o] = g ? (rec.wins + 0.5 * (rec.ties || 0)) / g : null;
      }
      return row;
    });
  }, [focalTeamId, h2hSeasons, h2hIndex, oppSelection]);

  const h2hAllTimeBars = useMemo(() => {
    if (!focalTeamId) return [];
    const out = oppListForFocal.map((o) => {
      let w = 0, l = 0, t = 0;
      for (const s of h2hSeasons) {
        const r = h2hIndex.get(`${s}__${focalTeamId}__${o}`);
        if (!r) continue;
        w += r.wins || 0;
        l += r.losses || 0;
        t += r.ties || 0;
      }
      return { opp: o, label: getTeamName(o), wins: w, losses: l, ties: t, diff: w - l };
    });
    out.sort((a, b) => (b.wins + b.losses + b.ties) - (a.wins + a.losses + a.ties));
    return out;
  }, [focalTeamId, oppListForFocal, h2hSeasons, h2hIndex]);

  const diffExtent = useMemo(() => {
    if (!h2hAllTimeBars.length) return [-1, 1];
    let min = Math.min(...h2hAllTimeBars.map((d) => d.diff));
    let max = Math.max(...h2hAllTimeBars.map((d) => d.diff));
    if (min === max) {
      if (min === 0) { min = -1; max = 1; }
      else { min = Math.min(0, min - 1); max = Math.max(0, max + 1); }
    }
    return [min, max];
  }, [h2hAllTimeBars]);

  const yAxisWidth = useMemo(() => {
    const m = h2hAllTimeBars.reduce((M, d) => Math.max(M, (d.label || "").length), 0);
    return Math.min(260, Math.max(140, m * 7));
  }, [h2hAllTimeBars]);

  const focalTeams = useMemo(() => {
    const ids = new Set([
      focalTeamId,
      ...summaryRows.map((r) => r.team_id),
      ...h2hSummary.map((r) => r.team_id)
    ]);
    return [...ids].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [summaryRows, h2hSummary, focalTeamId]);

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold">Head-to-Head Arena</h2>
      <p className="text-slate-400 text-sm mb-2">Upload <code className="px-1 rounded bg-slate-800 border border-slate-700">h2h_summary.csv</code> (and optionally <code className="px-1 rounded bg-slate-800 border border-slate-700">h2h_games.csv</code>) to explore one franchise vs everyone else, season by season.</p>

      <div className="grid md:grid-cols-3 gap-4 items-start">
        <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 w-56 shrink-0">
          <label className="text-xs uppercase tracking-wide text-slate-400">Focal Franchise</label>
          <select value={focalTeamId} onChange={(e) => setFocalTeamId(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm">
            <option value="" disabled>Select franchise</option>
            {focalTeams.map((id) => <option key={id} value={id}>{getTeamName(id)}</option>)}
          </select>
          <div className="mt-3 max-h-64 overflow-auto space-y-1">
            {oppListForFocal.map((o) => (
              <label key={o} className={cn("flex items-center gap-2 px-2 py-1 rounded cursor-pointer border", (selectedOppIds.includes(o) || (!selectedOppIds.length && defaultOppSelection.includes(o))) ? "border-emerald-500/60 bg-emerald-900/20" : "border-slate-800 hover:border-slate-700")}>
                <input type="checkbox" checked={selectedOppIds.length ? selectedOppIds.includes(o) : defaultOppSelection.includes(o)} onChange={() => setSelectedOppIds((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o])} />
                <span className="text-sm leading-tight">vs {getTeamName(o)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 rounded-xl border border-slate-800 p-3 bg-slate-900/60 overflow-auto">
          <h3 className="font-semibold mb-2">Season Matrix</h3>
          {(!focalTeamId || !h2hSeasons.length) ? <p className="text-slate-400 text-sm">Load H2H data and choose a franchise.</p> : (
            <table className="text-sm min-w-[720px] w-full">
              <thead><tr><th className="sticky left-0 bg-slate-900 z-30 p-2 text-left border-b border-slate-800">Opponent</th>{h2hSeasons.map((s) => <th key={s} className="p-2 text-center border-b border-slate-800 min-w-[72px] w-20">{s}</th>)}</tr></thead>
              <tbody>
                {oppListForFocal.map((opp, idx) => (
                  <tr key={opp} className={idx % 2 ? "bg-slate-950" : "bg-slate-900/40"}>
                    <td className="sticky left-0 bg-inherit z-10 p-2 border-b border-slate-800 whitespace-nowrap">{getTeamName(opp)}</td>
                    {h2hSeasons.map((s) => {
                      const c = (h2hMatrix.find((r) => r.opp === opp)?.cells?.[s]) || { txt: "", pct: undefined, div: undefined };
                      let cls = "text-slate-300";
                      const p = c.pct;
                      if (p === undefined) cls = "text-slate-500/40";
                      else if (p > 0.66) cls = "bg-emerald-700/40 text-emerald-100";
                      else if (p > 0.5) cls = "bg-emerald-600/30 text-emerald-100";
                      else if (p === 0.5) cls = "bg-slate-600/30";
                      else if (p >= 0.33) cls = "bg-rose-700/30 text-rose-100";
                      else cls = "bg-rose-800/40 text-rose-100";
                      return (
                        <td key={s} className={cn("p-2 text-center border-b border-slate-800 min-w-[72px] w-20", cls)} style={divisionBandStyle(c.div)} title={c.div || undefined}>{c.txt}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 items-start mt-4">
        <div className="md:col-span-2 rounded-xl border border-slate-800 p-3 bg-slate-900/60">
          <h3 className="font-semibold mb-2">Trend vs Selected Opponents</h3>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={h2hTrendData} margin={{left:12,right:12,top:12,bottom:12}}>
                <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                <XAxis dataKey="season" tick={{fill:"#cbd5e1"}} stroke="#64748b" />
                <YAxis tick={{fill:"#cbd5e1"}} stroke="#64748b" domain={[0,1]} ticks={[0,0.25,0.5,0.75,1]} />
                <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1f2937",color:"#e2e8f0"}} formatter={v=> v==null?"—":(v*100).toFixed(0)+"%"} />
                <Legend wrapperStyle={{color:"#e2e8f0"}} />
                {oppSelection.map((o, idx) => (
                  <Line key={o} type="monotone" dataKey={o} name={`vs ${getTeamName(o)}`} stroke={lineColors[idx%lineColors.length]} strokeOpacity={0.95} strokeWidth={2} dot={{r:2}} strokeDasharray={lineDashes[Math.floor(idx/lineColors.length)%lineDashes.length]} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60">
          <h3 className="font-semibold mb-2">All-Time vs Opponents</h3>
          <div className="w-full" style={{height:Math.max(280,h2hAllTimeBars.length*28)}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={h2hAllTimeBars} layout="vertical" margin={{left:40,right:12,top:12,bottom:12}}>
                <CartesianGrid strokeDasharray="2 3" strokeOpacity={0.3} />
                <XAxis type="number" domain={diffExtent} tick={{fill:"#cbd5e1"}} stroke="#64748b" />
                <YAxis type="category" dataKey="label" width={Math.min(260, Math.max(140, Math.max(...h2hAllTimeBars.map(d => (d.label||'').length))*7 || 140))} interval={0} tickMargin={6} tick={{fill:"#cbd5e1"}} stroke="#64748b" />
                <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1f2937",color:"#e2e8f0"}} formatter={(v,n,p)=>[v,p&&p.payload?`vs ${p.payload.label}`:""]} />
                <Legend wrapperStyle={{color:"#e2e8f0"}} />
                <Bar dataKey="diff" name="Win-Loss Diff" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
