import { describe, expect, it } from 'vitest';

import {
  appendAmountKey,
  deleteAmountKey,
  evaluateAmountExpressionToCents,
  formatAmountExpression,
} from './amount-expression';

describe('amount expression input', () => {
  it('appends numbers, decimals and operators', () => {
    expect(appendAmountKey('', '1')).toBe('1');
    expect(appendAmountKey('1', '6')).toBe('16');
    expect(appendAmountKey('16', '.')).toBe('16.');
    expect(appendAmountKey('16.', '5')).toBe('16.5');
    expect(appendAmountKey('16.5', '+')).toBe('16.5+');
    expect(appendAmountKey('16.5+', '2')).toBe('16.5+2');
  });

  it('guards decimals and operators', () => {
    expect(appendAmountKey('0', '5')).toBe('5');
    expect(appendAmountKey('1.23', '4')).toBe('1.23');
    expect(appendAmountKey('1.2', '.')).toBe('1.2');
    expect(appendAmountKey('12+', '*')).toBe('12*');
    expect(appendAmountKey('12.', '+')).toBe('12.0+');
  });

  it('deletes and formats operators', () => {
    expect(deleteAmountKey('12+3')).toBe('12+');
    expect(formatAmountExpression('12*3/4')).toBe('12×3÷4');
  });
});

describe('amount expression evaluation', () => {
  it('evaluates precedence without floating point arithmetic', () => {
    expect(evaluateAmountExpressionToCents('12+3*4')).toBe(2400);
    expect(evaluateAmountExpressionToCents('0.1+0.2')).toBe(30);
    expect(evaluateAmountExpressionToCents('10/4')).toBe(250);
    expect(evaluateAmountExpressionToCents('12×3÷4')).toBe(900);
  });

  it('rounds fractional cents and rejects invalid amounts', () => {
    expect(evaluateAmountExpressionToCents('1/3')).toBe(33);
    expect(evaluateAmountExpressionToCents('10-12')).toBeNull();
    expect(evaluateAmountExpressionToCents('10/0')).toBeNull();
    expect(evaluateAmountExpressionToCents('12+')).toBeNull();
    expect(evaluateAmountExpressionToCents('1.234')).toBeNull();
  });
});
