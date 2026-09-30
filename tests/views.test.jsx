import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import WeeklyDigest from '../src/WeeklyDigest';

// Charts are exercised by the production browser smoke check; DOM tests focus on state.
vi.mock('recharts', () => {
  const Container = ({ children }) => <div>{children}</div>;
  const Empty = () => null;
  const Series = ({ name, stroke, strokeDasharray }) => <span data-testid="series" data-name={name} data-color={stroke} data-dash={strokeDasharray} />;
  return { ResponsiveContainer: Container, LineChart: Container, BarChart: Container, Line: Series, Bar: Empty, Cell: Empty, XAxis: Empty, YAxis: Empty, CartesianGrid: Empty, Tooltip: Empty, Legend: Empty, ReferenceLine: Empty };
});
const response = text => ({ ok: true, text: async () => text });
const fixture = path => readFileSync(resolve('public', path), 'utf8');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const weeks = [2, 1].map(week => ({ year: 2025, week, summary: `data/weekly/2025/week_0${week}/summary.html`, stats: `data/weekly/2025/week_0${week}/stats.json` }));

it('preserves chart selections when changing focal franchise without refetching', async () => {
  const fetch = vi.fn(async url => response(fixture(url)));
  vi.stubGlobal('fetch', fetch);
  render(<MemoryRouter><App /></MemoryRouter>);
  const select = await screen.findByRole('combobox', { name: 'Focal Franchise' });
  const chart = screen.getByText('Wiggly Lines of Triumph (and Despair)').closest('section');
  const boxes = within(chart).getAllByRole('checkbox');
  fireEvent.click(boxes.find(b => !b.checked));
  const before = boxes.map(b => b.checked);
  const value = [...select.options].find(o => o.value && o.value !== select.value).value;
  fireEvent.change(select, { target: { value } });
  await waitFor(() => expect(select.value).toBe(value));
  expect(boxes.map(b => b.checked)).toEqual(before);
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(fetch.mock.calls.some(([url]) => url.includes('h2h_summary'))).toBe(false);
});

it('ignores old newsletter responses and aligns heterogeneous statistic columns', async () => {
  const old = deferred();
  vi.stubGlobal('fetch', vi.fn(url => {
    if (url.endsWith('index.json')) return Promise.resolve(response(JSON.stringify({ weeks })));
    if (url === weeks[0].summary) return old.promise; // Deliberately ignores abort.
    if (url === weeks[1].summary) return Promise.resolve(response('<p>Week one newsletter</p>'));
    return Promise.resolve(response(JSON.stringify({ table: [{ Metric: 'Total', Value: 100 }, { Metric: 'Highest', Team: 'Wombats', Value: 70 }] })));
  }));
  render(<MemoryRouter><WeeklyDigest /></MemoryRouter>);
  fireEvent.change(await screen.findByRole('combobox', { name: 'Select Week' }), {target:{value:'2025-W01'}});
  await screen.findByText('Week one newsletter');
  await act(async () => old.resolve(response('<p>Old week two newsletter</p>')));
  expect(screen.queryByText('Old week two newsletter')).not.toBeInTheDocument();
  const table = screen.getByRole('table');
  const rows = within(table).getAllByRole('row');
  expect(within(rows[0]).getAllByRole('columnheader').map(c => c.textContent)).toEqual(['Metric', 'Value', 'Team']);
  expect(within(rows[2]).getAllByRole('cell').map(c => c.textContent)).toEqual(['Highest', '70', 'Wombats']);
  expect(within(rows[1]).getAllByRole('cell')).toHaveLength(3);
});

it('clears a failed issue error when another week succeeds', async () => {
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url.endsWith('index.json')) return response(JSON.stringify({ weeks }));
    if (url === weeks[0].summary) return { ok: false, status: 404 };
    if (url.endsWith('.html')) return response('<p>Recovered newsletter</p>');
    return response('{"table":[],"trend":[]}');
  }));
  render(<MemoryRouter><WeeklyDigest /></MemoryRouter>);
  await screen.findByRole('alert');
  fireEvent.change(screen.getByRole('combobox', { name: 'Select Week' }), {target:{value:'2025-W01'}});
  await screen.findByText('Recovered newsletter');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('shows a retryable dashboard failure instead of partial statistics', async () => {
  let fail = true;
  vi.stubGlobal('fetch', vi.fn(async url => fail ? { ok: false, status: 503 } : response(fixture(url))));
  render(<MemoryRouter><App /></MemoryRouter>);
  const retry = await screen.findByRole('button', { name: 'Retry' });
  expect(screen.queryByRole('combobox', { name: 'Focal Franchise' })).not.toBeInTheDocument();
  fail = false;
  fireEvent.click(retry);
  await screen.findByRole('combobox', { name: 'Focal Franchise' });
});

it('keeps team styling consistent across charts and handles empty selections', async () => {
  vi.stubGlobal('fetch', vi.fn(async url => response(fixture(url))));
  render(<MemoryRouter><App /></MemoryRouter>);
  const focal = await screen.findByRole('combobox', { name: 'Focal Franchise' });
  fireEvent.change(focal, { target: { value: '2' } });
  const standings = screen.getByText('Wiggly Lines of Triumph (and Despair)').closest('section');
  const h2h = screen.getByText('Head-to-Head Arena').closest('section');
  for (const box of within(standings).getAllByRole('checkbox')) if (box.checked) fireEvent.click(box);
  expect(within(standings).getByRole('status')).toHaveTextContent('Select a team');
  fireEvent.click(within(standings).getByRole('checkbox', { name: 'Arizona Wombats', exact: true }));
  const opponent = within(h2h).getByRole('checkbox', { name: 'vs Arizona Wombats' });
  if (!opponent.checked) fireEvent.click(opponent);
  const appearance = section => within(section).getAllByTestId('series').find(el => el.dataset.name?.includes('Arizona Wombats')).dataset;
  const color = appearance(standings).color;
  expect(appearance(h2h).color).toBe(color);
  expect(appearance(h2h).dash).toBe(appearance(standings).dash);
  fireEvent.click(within(standings).getByRole('checkbox', { name: 'Tempe Trout', exact: true }));
  expect(appearance(standings).color).toBe(color);
  for (const box of within(h2h).getAllByRole('checkbox')) if (box.checked) fireEvent.click(box);
  expect(within(h2h).getByRole('status')).toHaveTextContent('Select an opponent');
});

it('makes both timeline and arena tables keyboard-scrollable with named row headers', async () => {
  vi.stubGlobal('fetch', vi.fn(async url => response(fixture(url))));
  render(<MemoryRouter><App /></MemoryRouter>);
  await screen.findByRole('combobox', { name: 'Focal Franchise' });
  for (const name of ['League Timeline', 'Head-to-Head Arena']) {
    const region = screen.getByRole('region', { name });
    expect(region).toHaveAttribute('tabindex', '0');
    const table = within(region).getByRole('table', { name });
    expect(within(table).getAllByRole('rowheader').length).toBeGreaterThan(0);
    for (const header of within(table).getAllByRole('rowheader')) expect(header).toHaveAttribute('scope', 'row');
  }
});
it('opens a linked issue and navigates between published weeks', async () => {
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url.endsWith('index.json')) return response(JSON.stringify({ weeks }));
    if (url.endsWith('.html')) return response('<p>'+url+'</p>');
    return response('{"table":[]}');
  }));
  render(<MemoryRouter initialEntries={['/weekly?issue=2025-W01']}><WeeklyDigest /></MemoryRouter>);
  await screen.findByRole('heading', {name:'Week 1 · 2025'});
  expect(screen.getByRole('button', {name:'← Previous'})).toBeDisabled();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText}});
  fireEvent.click(screen.getByRole('button', {name:'Copy link to this issue'}));
  await screen.findByText('Link copied!');
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#/weekly?issue=2025-W01'));
  fireEvent.click(screen.getByRole('button', {name:'Next →'}));
  await screen.findByRole('heading', {name:'Week 2 · 2025'});
  expect(screen.getByRole('button', {name:'Next →'})).toBeDisabled();
});
