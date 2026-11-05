import { describe, expect, it } from 'vitest';

import {
  formatPickerSelection,
  pickerConfirmation,
} from './dateTimePickerModel';

describe('date time picker model', () => {
  it('returns a date-only confirmation at local midnight', () => {
    const result = pickerConfirmation(
      'date',
      new Date(2026, 10, 5, 12, 30),
      18,
      45,
    );

    expect([
      result.getFullYear(),
      result.getMonth(),
      result.getDate(),
      result.getHours(),
      result.getMinutes(),
    ]).toEqual([2026, 10, 5, 0, 0]);
  });

  it('keeps the selected hour and minute in date-time mode', () => {
    const result = pickerConfirmation(
      'datetime',
      new Date(2026, 10, 5, 12, 30),
      18,
      45,
    );

    expect([
      result.getFullYear(),
      result.getMonth(),
      result.getDate(),
      result.getHours(),
      result.getMinutes(),
    ]).toEqual([2026, 10, 5, 18, 45]);
  });

  it('does not show a time in the date-only selection label', () => {
    const label = formatPickerSelection(
      'date',
      new Date(2026, 10, 5),
      18,
      45,
    );

    expect(label).toBe('11月5日 周四');
  });
});
