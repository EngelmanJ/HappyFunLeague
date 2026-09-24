const colors = ['#ef4444', '#eab308', '#22c55e', '#3b82f6'];
const dashes = ['', '5 5', '2 4'];

// Franchise identity determines appearance, never selection order.
export function seriesStyle(id) {
  const value = String(id);
  const index = /^\d+$/.test(value) ? Math.max(0, Number(value) - 1)
    : [...value].reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) >>> 0, 0);
  return { stroke: colors[index % colors.length], strokeDasharray: dashes[Math.floor(index / colors.length) % dashes.length] };
}

export const formatPercent = value => value == null ? '—' : `${Math.round(Number(value) * 100)}%`;
export function winLossDomain(values) {
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  return low === high ? [-1, 1] : [low, high];
}
export const chartTooltipProps = {
  position: { x: 0, y: 0 },
  allowEscapeViewBox: { x: false, y: false },
  contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#e2e8f0' },
};
