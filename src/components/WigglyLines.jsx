import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const lineColors = ["#ef4444","#eab308","#22c55e","#3b82f6"];
const lineDashes = ["","5 5"];

export default function WigglyLines({ years, summaryRows, selectedTeamIds, setSelectedTeamIds }){
  const teamOptions = useMemo(() => summaryRows.map((r) => ({ id: r.team_id, label: r.current_name })), [summaryRows]);

  const chartData = useMemo(() => {
    if (!selectedTeamIds.length) return [];
    const lab = new Map(teamOptions.map((o) => [o.id, o.label]));
    return years.map((y) => {
      const row = { year: y };
      for (const id of selectedTeamIds) {
        const t = summaryRows.find((tt) => tt.team_id === id);
        const val = t?.yearMap?.[y] ?? null;
        row[lab.get(id) || id] = Number.isFinite(val) ? val : null;
      }
      return row;
    });
  }, [years, selectedTeamIds, summaryRows, teamOptions]);

  const yMeta = useMemo(() => {
    const vals = [];
    for (const r of chartData) {
      for (const [k, v] of Object.entries(r)) if (k !== "year" && Number.isFinite(v)) vals.push(v);
    }
    const maxSel = vals.length ? Math.max(...vals) : 12;
    const domainMax = Math.max(1, maxSel);
    const ticks = [];
    for (let i = 1; i <= domainMax; i += 2) ticks.push(i);
    if (domainMax % 2 === 0 && ticks.at(-1) !== domainMax) ticks.push(domainMax);
    return { domainMax, ticks };
  }, [chartData]);

  const toggleSelected = (id) => setSelectedTeamIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <section className="mb-3">
      <h2 className="text-xl font-bold">Wiggly Lines of Triumph (and Despair)</h2>
      <p className="text-slate-400 text-sm mb-2">Pick teams to plot their final standing over time. Lower is better; axis is flipped so #1 sits at the top.</p>
      <div className="grid md:grid-cols-5 gap-3 items-start">
        <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60 max-h-[560px] overflow-auto md:col-span-1">
          <div className="grid grid-cols-1 gap-2">
            {teamOptions.map((t) => (
              <label key={t.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer border ${selectedTeamIds.includes(t.id) ? "border-emerald-500/60 bg-emerald-900/20" : "border-slate-800 hover:border-slate-700"}`}>
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
                {selectedTeamIds.map((id, idx) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={teamOptions.find((t) => t.id === id)?.label || id}
                    stroke={lineColors[idx % lineColors.length]}
                    strokeOpacity={0.95}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    strokeDasharray={lineDashes[Math.floor(idx / lineColors.length) % lineDashes.length]}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
