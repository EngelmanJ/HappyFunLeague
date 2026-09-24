import { expect, it } from 'vitest';
import { formatPercent, winLossDomain } from '../src/lib/charts';

it('keeps win-loss bars anchored to zero for positive, negative, and empty records', () => {
  expect(winLossDomain([2, 9])).toEqual([0, 9]);
  expect(winLossDomain([-9, -2])).toEqual([-9, 0]);
  expect(winLossDomain([-5, 3])).toEqual([-5, 3]);
  expect(winLossDomain([0, 0])).toEqual([-1, 1]);
  expect(winLossDomain([])).toEqual([-1, 1]);
});

it('uses the same percentage units for axes and tooltips', () => {
  expect(formatPercent(0.5)).toBe('50%');
  expect(formatPercent(0)).toBe('0%');
  expect(formatPercent(null)).toBe('—');
});
