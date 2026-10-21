export type AmountKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | '+'
  | '-'
  | '*'
  | '/';

const OPERATORS = new Set(['+', '-', '*', '/']);
const MAX_EXPRESSION_LENGTH = 24;

function currentNumber(expression: string): string {
  const match = expression.match(/[0-9.]*$/);
  return match?.[0] ?? '';
}

export function appendAmountKey(expression: string, key: AmountKey): string {
  if (expression.length >= MAX_EXPRESSION_LENGTH) return expression;
  const number = currentNumber(expression);
  const last = expression.at(-1);

  if (/^\d$/.test(key)) {
    const fractionLength = number.includes('.') ? number.split('.')[1]?.length ?? 0 : 0;
    if (fractionLength >= 2) return expression;
    if (number === '0') return `${expression.slice(0, -1)}${key}`;
    return `${expression}${key}`;
  }

  if (key === '.') {
    if (number.includes('.')) return expression;
    if (!number) return `${expression}0.`;
    return `${expression}.`;
  }

  if (OPERATORS.has(key)) {
    if (!expression) return expression;
    if (last && OPERATORS.has(last)) return `${expression.slice(0, -1)}${key}`;
    if (last === '.') return `${expression}0${key}`;
    return `${expression}${key}`;
  }

  return expression;
}

export function deleteAmountKey(expression: string): string {
  return expression.slice(0, -1);
}

export function formatAmountExpression(expression: string): string {
  return expression.replaceAll('*', '×').replaceAll('/', '÷');
}

type Rational = { numerator: bigint; denominator: bigint };

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function rational(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) throw new Error('Division by zero');
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (numerator / divisor) * sign,
    denominator: (denominator / divisor) * sign,
  };
}

function add(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function subtract(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function multiply(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.numerator, left.denominator * right.denominator);
}

function divide(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.denominator, left.denominator * right.numerator);
}

function rationalToCents(value: Rational): number | null {
  const scaled = value.numerator * 100n;
  const quotient = scaled / value.denominator;
  const remainder = scaled % value.denominator;
  const rounded = remainder * 2n >= value.denominator ? quotient + 1n : quotient;
  if (rounded <= 0n || rounded > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(rounded);
}

export function evaluateAmountExpressionToCents(input: string): number | null {
  const expression = input.trim().replaceAll('×', '*').replaceAll('÷', '/').replace(/\s/g, '');
  if (!expression) return null;

  let cursor = 0;

  const parseNumber = (): Rational | null => {
    const remaining = expression.slice(cursor);
    const match = remaining.match(/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})/);
    if (!match) return null;
    const raw = match[0];
    cursor += raw.length;
    const [whole = '0', fraction = ''] = raw.split('.');
    const scale = 10n ** BigInt(fraction.length);
    return rational(BigInt(whole || '0') * scale + BigInt(fraction || '0'), scale);
  };

  const parseTerm = (): Rational | null => {
    let value = parseNumber();
    if (!value) return null;
    while (expression[cursor] === '*' || expression[cursor] === '/') {
      const operator = expression[cursor];
      cursor += 1;
      const right = parseNumber();
      if (!right) return null;
      value = operator === '*' ? multiply(value, right) : divide(value, right);
    }
    return value;
  };

  const parseExpression = (): Rational | null => {
    let value = parseTerm();
    if (!value) return null;
    while (expression[cursor] === '+' || expression[cursor] === '-') {
      const operator = expression[cursor];
      cursor += 1;
      const right = parseTerm();
      if (!right) return null;
      value = operator === '+' ? add(value, right) : subtract(value, right);
    }
    return value;
  };

  try {
    const result = parseExpression();
    if (!result || cursor !== expression.length) return null;
    return rationalToCents(result);
  } catch {
    return null;
  }
}
