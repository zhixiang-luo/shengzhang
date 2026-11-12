const MAX_INPUT_LENGTH = 32;
const MAX_INTEGER_DIGITS = 9;

export type AmountInputIssue = 'empty' | 'format' | 'zero' | 'too_large';

export type AmountInputResult =
  | { ok: true; cents: number }
  | { ok: false; issue: AmountInputIssue };

// The whole amount, then at most two decimals; or a bare ".5".
const CORE_PATTERN = /^(?:(\d+)(?:\.(\d{0,2}))?|\.(\d{1,2}))$/;

function toHalfWidth(text: string): string {
  return text
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/．/g, '.');
}

/**
 * Strictly parses the yuan amount a user typed or pasted into integer cents.
 *
 * It rejects instead of repairing: anything outside the grammar (commas, "万",
 * "k", extra dots, a third decimal, letters, operators) is `format`, never a
 * silently reshaped number. That matters because "12,5" must not become 125.
 * Accepted: digits with an optional ".dd", an optional leading ¥/￥ and an
 * optional trailing 元/块, full-width digits, and surrounding spaces.
 */
export function parseAmountInput(text: string): AmountInputResult {
  const halfWidth = toHalfWidth(text).trim();
  if (halfWidth.length > MAX_INPUT_LENGTH) return { ok: false, issue: 'format' };

  const core = halfWidth.replace(/^[¥￥]\s*/, '').replace(/\s*(?:元|块)$/, '');
  if (core === '' || core === '.') return { ok: false, issue: 'empty' };

  const match = CORE_PATTERN.exec(core);
  if (!match) return { ok: false, issue: 'format' };

  const whole = (match[1] ?? '').replace(/^0+(?=\d)/, '');
  const fraction = match[2] ?? match[3] ?? '';
  if (whole.length > MAX_INTEGER_DIGITS) return { ok: false, issue: 'too_large' };

  const cents = Number(whole || '0') * 100 + Number(`${fraction}00`.slice(0, 2));
  if (cents === 0) return { ok: false, issue: 'zero' };
  return { ok: true, cents };
}

/** Convenience wrapper: integer cents, or `null` when the input is not a valid amount. */
export function parseAmountInputToCents(text: string): number | null {
  const result = parseAmountInput(text);
  return result.ok ? result.cents : null;
}
