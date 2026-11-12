import { describe, expect, it } from 'vitest';

import { parseAmountInput, parseAmountInputToCents } from './amount-input';

describe('parseAmountInput accepts plain amounts', () => {
  it.each([
    ['45', 4500],
    ['45.5', 4550],
    ['45.50', 4550],
    ['0.01', 1],
    ['45.', 4500],
    ['.5', 50],
    ['007', 700],
    [' 45 ', 4500],
    ['¥45', 4500],
    ['￥ 45.5', 4550],
    ['45元', 4500],
    ['45块', 4500],
    ['¥ 45.5 元', 4550],
    ['１２．５', 1250],
    ['999999999.99', 99999999999],
  ])('%s -> %d cents', (input, cents) => {
    expect(parseAmountInput(input)).toEqual({ ok: true, cents });
  });

  it('never goes through floating point', () => {
    expect(parseAmountInputToCents('0.29')).toBe(29);
    expect(parseAmountInputToCents('1.15')).toBe(115);
    expect(parseAmountInputToCents('4.35')).toBe(435);
  });
});

describe('parseAmountInput rejects instead of reshaping', () => {
  it.each([
    ['12,5', 'a comma decimal separator'],
    ['12。5', 'a full-width ideographic full stop'],
    ['1,200', 'a thousands separator'],
    ['1.2万', 'a magnitude word'],
    ['5k', 'a magnitude letter'],
    ['12+3', 'an operator'],
    ['1.2.3', 'two decimal points'],
    ['12.345', 'a third decimal'],
    ['0.005', 'a sub-cent amount'],
    ['abc', 'letters'],
    ['¥¥5', 'a doubled currency sign'],
    ['5元元', 'a doubled unit'],
    ['1e3', 'scientific notation'],
    ['-5', 'a negative sign'],
    ['+5', 'a plus sign'],
    ['12 5', 'a space inside the number'],
    ['5'.repeat(33), 'an oversized paste'],
  ])('%s is a format problem (%s)', (input) => {
    expect(parseAmountInput(input)).toEqual({ ok: false, issue: 'format' });
  });

  it('does not turn a comma-decimal amount into ten times the money', () => {
    expect(parseAmountInputToCents('12,5')).toBeNull();
    expect(parseAmountInputToCents('12,5')).not.toBe(12500);
  });
});

describe('parseAmountInput other outcomes', () => {
  it.each(['', '   ', '.', '¥', '¥ ', '元'])('treats %j as still empty', (input) => {
    expect(parseAmountInput(input)).toEqual({ ok: false, issue: 'empty' });
  });

  it.each(['0', '0.00', '00', '.0', '¥0', '0元'])('treats %s as zero', (input) => {
    expect(parseAmountInput(input)).toEqual({ ok: false, issue: 'zero' });
  });

  it('flags more than nine whole-yuan digits as too large', () => {
    expect(parseAmountInput('1234567890')).toEqual({ ok: false, issue: 'too_large' });
    expect(parseAmountInput('1234567890.5')).toEqual({ ok: false, issue: 'too_large' });
  });

  it('ignores leading zeros when counting digits', () => {
    expect(parseAmountInput('0000000012')).toEqual({ ok: true, cents: 1200 });
  });
});

describe('parseAmountInputToCents', () => {
  it('returns cents for valid input and null for every problem', () => {
    expect(parseAmountInputToCents('45.5')).toBe(4550);
    for (const bad of ['', '.', '0', 'abc', '12,5', '1234567890']) {
      expect(parseAmountInputToCents(bad)).toBeNull();
    }
  });
});
