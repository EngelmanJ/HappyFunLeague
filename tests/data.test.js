import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeRow, normalizeH2HGameRow, parseCSV, buildH2HIndex, loadDashboard } from '../src/lib/data';
import { normalizeStats, validateIndex, sanitizeSummary } from '../src/lib/digest';

const file = path => readFileSync(resolve('public', path), 'utf8');
describe('public data contract', () => {
  it('validates the shipped dashboard and reconciles every all-time pair', async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal('fetch', async url => ({ ok: true, text: async () => file(url) }));
    const data = await loadDashboard();
    const index = buildH2HIndex(data.games.filter(g=>g.season < data.currentSeason.season));
    expect(data.games.filter(g=>g.season===2026)).toHaveLength(18);
    const sums = parseCSV(file('data/h2h_summary.csv'));
    for (const r of sums) {
      const totals = { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 };
      for (const [key, rec] of index) {
        const [, team, opp] = key.split('__');
        if (team === r.team_id && opp === r.opp_id) for (const k of Object.keys(totals)) totals[k] += rec[k];
      }
      for (const k of Object.keys(totals)) expect(totals[k]).toBeCloseTo(Number(r[k]));
    }
    expect(data.rows.length).toBeGreaterThan(0);
    expect(data.rows).toHaveLength(170);
    expect(Math.max(...data.rows.map(r => r.year))).toBe(2025);
    expect(data.games.filter(r => r.season === 2025)).toHaveLength(96);
    expect(data.teamDivisions.filter(r => r.season === 2025)).toHaveLength(12);
    expect(data.currentTeams).toHaveLength(12);
    expect(data.currentTeams.find(r => r.team_id === '10')).toMatchObject({ season: 2026, team_name: 'Big Dog D', owner: 'Davis P.' });
    expect(data.rows.find(r => r.team_id === '10' && r.year === 2025)).toMatchObject({ team_name: 'SB Holy Warriors', owner: 'Joshua S.' });
    for (const list of [data.currentTeams, data.rows.filter(r => r.year === 2025)]) {
      expect(list.find(r => r.team_id === '4').owner).toBe('William E.');
      expect(list.find(r => r.team_id === '12').owner).toBe('Finley P.');
    }
  });
  it('preserves zero scores, rejects missing scores and duplicate games', () => {
    const raw = { season: 2025, week: 1, team_a_id: 1, team_b_id: 2, team_a_points: 0, team_b_points: 10 };
    const game = normalizeH2HGameRow(raw);
    expect(game.winsB).toBe(1);
    expect(() => normalizeH2HGameRow({ ...raw, team_a_points: '' })).toThrow();
    expect(() => buildH2HIndex([game, game])).toThrow(/Duplicate/);
    expect(normalizeH2HGameRow({ ...raw, team_b_points: 0 }).ties).toBe(1);
  });
  it('uses the populated standing alias and rejects absent standings', () => {
    expect(normalizeRow({ season: 2025, team_id: 1, final_standing: '', 'team.final_standing': 3 }).final_standing).toBe(3);
    expect(() => normalizeRow({ season: 2025, team_id: 1 })).toThrow();
  });
  it('validates every saved weekly statistic and linked file', () => {
    const index = validateIndex(JSON.parse(file('data/weekly/index.json')));
    for (const w of index.weeks) {
      expect(file(w.summary).length).toBeGreaterThan(0);
      expect(() => normalizeStats(JSON.parse(file(w.stats)))).not.toThrow();
    }
  });
  it('rejects nested cells and unsafe index paths', () => {
    expect(() => normalizeStats({ table: [{ x: {} }] })).toThrow();
    expect(() => validateIndex({ weeks: [{ year: 2025, week: 1, summary: 'https://other.test/a', stats: 'data/weekly/a.json' }] })).toThrow();
  });
  it('sanitizes active markup and resolves newsletter-relative images', () => {
    const html = sanitizeSummary('<p>Hello</p><img src="images/a.png" onerror="alert(1)"><a href="javascript:alert(1)">link</a><script>alert(1)</script>', 'data/weekly/2025/week_01/summary.html');
    expect(html).toContain('<p>Hello</p>');
    expect(html).not.toMatch(/onerror|javascript:|<script/);
    expect(html).toContain('/data/weekly/2025/week_01/images/a.png');
  });
});
