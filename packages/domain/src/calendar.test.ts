import { describe, expect, it } from 'vitest';

import { buildMonthGrid, combineLocalDateTime } from './calendar';

describe('calendar helpers', () => {
  it('builds a Monday-first six-week grid', () => {
    const cells = buildMonthGrid(2026, 9, new Date(2026, 9, 19));
    expect(cells).toHaveLength(42);
    expect(cells[0]?.date.getMonth()).toBe(8);
    expect(cells[0]?.date.getDate()).toBe(28);
    expect(cells[3]?.date.getDate()).toBe(1);
    expect(cells.find((cell) => cell.isToday)?.date.getDate()).toBe(19);
  });

  it('marks current-month cells correctly', () => {
    const cells = buildMonthGrid(2024, 1, new Date(2024, 1, 14));
    expect(cells.filter((cell) => cell.inCurrentMonth)).toHaveLength(29);
  });

  it('combines local date and time', () => {
    const result = combineLocalDateTime(new Date(2026, 9, 19, 3, 4), 21, 37);
    expect([result.getFullYear(), result.getMonth(), result.getDate()]).toEqual([2026, 9, 19]);
    expect([result.getHours(), result.getMinutes(), result.getSeconds()]).toEqual([21, 37, 0]);
  });

  it('rejects invalid values', () => {
    expect(() => buildMonthGrid(2026, 12)).toThrow();
    expect(() => combineLocalDateTime(new Date(), 24, 0)).toThrow();
  });
});
