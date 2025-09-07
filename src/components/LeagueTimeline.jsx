import React from "react";
import { divisionPillStyle, divisionBandStyle } from "../lib/colors";
import { cn } from "../lib/core";

export default function LeagueTimeline({ years, summaryRows, grouped, maxByYear, getDivisionName, podiumOnly, showHistory, lastStyle }){
  const lastRenderer = (v, y) => {
    const isLast = maxByYear.get(y) === v;
    if (isLast && podiumOnly) {
      if (lastStyle === "cry") return "😭";
      if (lastStyle === "skull") return "💀";
      return "LAST";
    }
    return v;
  };

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-3">League Timeline</h2>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-900">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-900 border-b border-slate-800 p-2 text-left w-40 min-w-[160px]">Name</th>
                <th className="sticky left-40 z-20 bg-slate-900 border-b border-slate-800 p-2 text-left w-44 min-w-[176px]">Owner</th>
                <th className="bg-slate-900 border-b border-slate-800 p-2 text-center w-24">Div</th>
                <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">1st</th>
                <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">2nd</th>
                <th className="bg-slate-900 border-b border-slate-800 p-2 text-center">3rd</th>
                <th className="bg-slate-900 border-b border-slate-800 p-2 text-center border-r-2 border-slate-700">Last</th>
                {years.map((y) => (
                  <th key={y} className="bg-slate-900 border-b border-slate-800 p-2 text-center font-semibold min-w-[72px] w-20">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((r, idx) => {
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

                return (
                  <React.Fragment key={r.team_id}>
                    <tr className={cn(idx % 2 ? "bg-slate-950" : "bg-slate-900/50")}>
                      <td className="sticky left-0 z-10 bg-slate-950 p-2 border-b border-slate-800 w-40 min-w-[160px] truncate" title={r.current_name}>{r.current_name}</td>
                      <td className="sticky left-40 z-10 bg-slate-950 p-2 border-b border-slate-800 w-44 min-w-[176px] truncate" title={r.current_owner}>{r.current_owner}</td>
                      <td className="p-2 border-b border-slate-800 text-center">
                        {r.current_division ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold border" style={divisionPillStyle(r.current_division)} title={r.current_division}>{r.current_division}</span>
                        ) : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="p-2 border-b border-slate-800 text-center font-semibold text-amber-300 bg-slate-900/60">{r.firsts}</td>
                      <td className="p-2 border-b border-slate-800 text-center font-semibold text-slate-200 bg-slate-900/60">{r.seconds}</td>
                      <td className="p-2 border-b border-slate-800 text-center font-semibold text-amber-700 bg-slate-900/60">{r.thirds}</td>
                      <td className="p-2 border-b border-slate-800 text-center font-semibold text-rose-300 bg-slate-900/60 border-r-2 border-slate-700">{r.lasts}</td>
                      {years.map((y) => {
                        const v = r.yearMap[y];
                        const podium = v === 1 || v === 2 || v === 3;
                        const isLast = maxByYear.get(y) === v;
                        const faded = podiumOnly && !podium && !isLast;
                        const color = podium ? (v === 1 ? "text-yellow-300" : v === 2 ? "text-slate-200" : "text-amber-600") : isLast ? "text-rose-400" : "text-slate-400";
                        const divName = getDivisionName(r.team_id, y);
                        return (
                          <td key={y} className={cn("p-2 border-b border-slate-800 text-center font-bold min-w-[72px] w-20", faded ? "text-slate-500/20" : color)} style={divisionBandStyle(divName)} title={divName || undefined}>
                            {Number.isFinite(v) ? lastRenderer(v, y) : ""}
                          </td>
                        );
                      })}
                    </tr>
                    {showHistory && segs.map((seg, sidx) => (
                      <tr key={`${r.team_id}_seg_${sidx}`} className={cn(idx % 2 ? "bg-slate-950" : "bg-slate-900/50")}>
                        <td className="sticky left-0 z-10 bg-slate-950 p-2 border-b border-slate-800 text-slate-300 w-40 min-w-[160px] truncate" title={seg.team_name}>↳ {seg.team_name}</td>
                        <td className="sticky left-40 z-10 bg-slate-950 p-2 border-b border-slate-800 text-slate-300 w-44 min-w-[176px] truncate">{seg.owner} <span className="text-slate-500">({seg.start}-{seg.end})</span></td>
                        <td className="p-2 border-b border-slate-800 text-center" />
                        <td className="p-2 border-b border-slate-800 text-center bg-slate-900/60" colSpan={4} />
                        {years.map((y) => {
                          const v = seg.yearVals[y];
                          const active = Number.isFinite(v);
                          const podium = v === 1 || v === 2 || v === 3;
                          const isLast = maxByYear.get(y) === v;
                          const faded = podiumOnly && !podium && !isLast;
                          const color = podium ? (v === 1 ? "text-yellow-300" : v === 2 ? "text-slate-200" : "text-amber-600") : isLast ? "text-rose-400" : "text-slate-400";
                          const divName = getDivisionName(r.team_id, y);
                          return (
                            <td key={y} className={cn("p-2 border-b border-slate-800 text-center font-bold min-w-[72px] w-20", active && "bg-slate-800/40", faded ? "text-slate-500/20" : color)} style={divisionBandStyle(divName)} title={divName || undefined}>
                              {active ? lastRenderer(v, y) : ""}
                            </td>
                          );
                        })}
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
  );
}
