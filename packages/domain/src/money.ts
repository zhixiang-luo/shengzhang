const YUAN_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function parseYuanToCents(input: string): number | null {
  const normalized = input.trim().replace(/[￥¥,\s]/g, '');
  if (!YUAN_PATTERN.test(normalized)) return null;

  const [yuanPart = '0', fractionPart = ''] = normalized.split('.');
  const fraction = `${fractionPart}00`.slice(0, 2);
  const cents = Number(yuanPart) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error('Amount must be an integer number of cents');
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${(absolute / 100).toFixed(2)}`;
}
