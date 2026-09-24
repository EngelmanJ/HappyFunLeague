import DOMPurify from 'dompurify';
import { fetchText, parseCSV } from './data';

export const weekKey = w => `${w.year}-W${String(w.week).padStart(2, '0')}`;
export function validateIndex(index) {
  if (!Array.isArray(index?.weeks) || !index.weeks.length) throw new Error('No weekly summaries available.');
  const seen = new Set();
  for (const w of index.weeks) {
    if (!Number.isInteger(w.year) || !Number.isInteger(w.week) || w.week < 1 || typeof w.summary !== 'string' || typeof w.stats !== 'string' || seen.has(weekKey(w))) throw new Error('Invalid weekly index.');
    for (const url of [w.summary, w.stats]) if (!/^data\/weekly\/[\w/.-]+$/.test(url) || url.split('/').includes('..')) throw new Error('Invalid weekly file path.');
    seen.add(weekKey(w));
  }
  return { weeks: [...index.weeks].sort((a, b) => b.year - a.year || b.week - a.week) };
}
export function sanitizeSummary(html, path) {
  const fragment = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, RETURN_DOM_FRAGMENT: true });
  const base = new URL(path, document.baseURI);
  for (const image of fragment.querySelectorAll('img[src]')) {
    const src = image.getAttribute('src');
    if (src && !src.startsWith('data:')) image.setAttribute('src', new URL(src, base).href);
  }
  const container = document.createElement('div');
  container.append(fragment);
  return container.innerHTML;
}
export function normalizeStats(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid weekly statistics.');
  const table = raw.table ?? [];
  const trend = raw.trend ?? [];
  if (!Array.isArray(table) || !Array.isArray(trend) || table.some(row => !row || typeof row !== 'object' || Array.isArray(row) || Object.values(row).some(v => v !== null && typeof v === 'object'))) throw new Error('Invalid weekly statistics.');
  return { table, trend: trend.map(row => {
    if (!row || row.date == null || row.value == null || row.value === '' || !Number.isFinite(Number(row.value))) throw new Error('Invalid weekly trend.');
    return { date: String(row.date), value: Number(row.value) };
  }) };
}
export async function loadIssue(week, signal) {
  const [summary, stats] = await Promise.allSettled([
    fetchText(week.summary, signal).then(html => sanitizeSummary(html, week.summary)),
    fetchText(week.stats, signal).then(text => {
      if (week.stats.endsWith('.json')) return normalizeStats(JSON.parse(text));
      if (week.stats.endsWith('.csv')) {
        const table = parseCSV(text);
        const trend = table.every(r => r.date != null && r.value != null) ? table.map(r => ({ date: r.date, value: r.value })) : [];
        return normalizeStats({ table, trend });
      }
      throw new Error('Unsupported statistics format.');
    }),
  ]);
  return {
    summaryHTML: summary.status === 'fulfilled' ? summary.value : '',
    stats: stats.status === 'fulfilled' ? stats.value : null,
    error: [summary.status === 'rejected' && 'Could not load this newsletter.', stats.status === 'rejected' && 'Could not load statistics for this week.'].filter(Boolean).join(' '),
  };
}
