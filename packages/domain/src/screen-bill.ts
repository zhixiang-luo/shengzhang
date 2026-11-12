import { parseYuanToCents } from './money';

export type ScreenBillSourceApp = 'wechat' | 'alipay' | 'unknown';
export type ScreenBillConfidence = 'high' | 'medium' | 'low';

export interface AmountCandidate {
  amountMinor: number;
  raw: string;
  line: string;
  score: number;
}

export interface ScreenBillTextInput {
  text: string;
  now: string;
  sourceApp: ScreenBillSourceApp;
}

export interface ScreenBillExtraction {
  type: 'expense' | 'income';
  amountMinor: number | null;
  occurredAt: string;
  note: string;
  confidence: ScreenBillConfidence;
  warnings: string[];
}

const NEGATIVE_AMOUNT_CONTEXT =
  /订单号|订单编号|交易号|流水号|余额|手机号|电话|尾号|卡号|原价|优惠|折扣|积分|券码|验证码|账号/;
const ACTUAL_PAYMENT_CONTEXT = /实付|实际支付|支付金额|付款金额|交易金额|消费金额/;
const PAYMENT_CONTEXT = /支付成功|付款成功|交易成功|付款详情|支付详情|合计|总计/;
const MONEY_PATTERN = /(?:[¥￥]\s*)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(?:元)?/g;

function normalizeWidth(value: string): string {
  return value
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10))
    .replace(/[，]/g, ',')
    .replace(/[。]/g, '.')
    .replace(/[：]/g, ':')
    .replace(/[￥]/g, '¥');
}

function amountFromMatch(amount: string, fraction: string | undefined): number | null {
  const normalized = `${amount.replaceAll(',', '')}${fraction ? `.${fraction}` : ''}`;
  return parseYuanToCents(normalized);
}

export function normalizeScreenAmount(text: string): number | null {
  const line = normalizeWidth(text).trim();
  if (!line || NEGATIVE_AMOUNT_CONTEXT.test(line)) return null;

  MONEY_PATTERN.lastIndex = 0;
  const matches = [...line.matchAll(MONEY_PATTERN)];
  if (matches.length !== 1) return null;
  const match = matches[0];
  if (!match?.[1]) return null;
  const raw = match[0];
  const hasMoneyMarker = /[¥元]/.test(raw) || raw.includes('.');
  const hasPositiveContext = ACTUAL_PAYMENT_CONTEXT.test(line) || PAYMENT_CONTEXT.test(line);
  if (!hasMoneyMarker && !hasPositiveContext) return null;
  return amountFromMatch(match[1], match[2]);
}

export function selectBestAmountCandidate(candidates: AmountCandidate[]): AmountCandidate | null {
  return (
    [...candidates]
      .filter((candidate) => Number.isSafeInteger(candidate.amountMinor) && candidate.amountMinor > 0)
      .sort((left, right) => right.score - left.score || right.amountMinor - left.amountMinor)[0] ??
    null
  );
}

function scoreAmountLine(line: string): number {
  let score = 0;
  if (ACTUAL_PAYMENT_CONTEXT.test(line)) score += 40;
  else if (/订单金额|付款总额|消费合计/.test(line)) score += 30;
  else if (PAYMENT_CONTEXT.test(line)) score += 18;
  if (/[¥￥]|元/.test(line)) score += 10;
  if (/\.\d{1,2}/.test(line)) score += 4;
  if (NEGATIVE_AMOUNT_CONTEXT.test(line)) score -= 100;
  return score;
}

function collectAmountCandidates(text: string): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = normalizeWidth(rawLine).trim();
    if (!line) continue;
    MONEY_PATTERN.lastIndex = 0;
    for (const match of line.matchAll(MONEY_PATTERN)) {
      if (!match[1]) continue;
      const raw = match[0].trim();
      const hasMoneyMarker = /[¥元]/.test(raw) || raw.includes('.');
      const hasPositiveContext = ACTUAL_PAYMENT_CONTEXT.test(line) || PAYMENT_CONTEXT.test(line);
      if (!hasMoneyMarker && !hasPositiveContext) continue;
      const amountMinor = amountFromMatch(match[1], match[2]);
      if (!amountMinor || amountMinor > 99_999_999) continue;
      candidates.push({ amountMinor, raw, line, score: scoreAmountLine(line) });
    }
  }
  return candidates;
}

function extractMerchant(text: string): string {
  const normalized = normalizeWidth(text);
  const match = normalized.match(
    /(?:收款方|收款人|商户全称|商户名称|商户|付款给|商品名称|付款说明)\s*:?\s*([^\n]+)/,
  );
  if (!match?.[1]) return '';
  return match[1]
    .replace(/(?:支付时间|付款时间|交易时间|订单号).*$/, '')
    .trim()
    .slice(0, 40);
}

function localDateWithTime(now: Date, hours: number, minutes: number): string | null {
  if (hours > 23 || minutes > 59) return null;
  const result = new Date(now);
  result.setHours(hours, minutes, 0, 0);
  return result.toISOString();
}

function extractOccurredAt(text: string, nowIso: string): string {
  const normalized = normalizeWidth(text);
  const now = new Date(nowIso);
  if (Number.isNaN(now.getTime())) return new Date().toISOString();

  const relative = normalized.match(/(今天|昨天|前天)\s*(\d{1,2}):(\d{2})/);
  if (relative) {
    const hours = Number(relative[2]);
    const minutes = Number(relative[3]);
    const relativeDate = new Date(now);
    const dayOffset = relative[1] === '昨天' ? -1 : relative[1] === '前天' ? -2 : 0;
    relativeDate.setDate(relativeDate.getDate() + dayOffset);
    const value = localDateWithTime(relativeDate, hours, minutes);
    if (value) return value;
  }

  const absolute = normalized.match(
    /(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?\s*(\d{1,2}):(\d{2})/,
  );
  if (absolute) {
    const value = new Date(
      Number(absolute[1]),
      Number(absolute[2]) - 1,
      Number(absolute[3]),
      Number(absolute[4]),
      Number(absolute[5]),
      0,
      0,
    );
    if (!Number.isNaN(value.getTime())) return value.toISOString();
  }

  const clockOnly = normalized.match(/(?:支付时间|付款时间|交易时间)\s*:?\s*(\d{1,2}):(\d{2})/);
  if (clockOnly) {
    const value = localDateWithTime(now, Number(clockOnly[1]), Number(clockOnly[2]));
    if (value) return value;
  }

  return now.toISOString();
}

export function extractScreenBill(input: ScreenBillTextInput): ScreenBillExtraction {
  const text = normalizeWidth(input.text).trim();
  const candidates = collectAmountCandidates(text);
  const best = selectBestAmountCandidate(candidates);
  const positiveCandidates = candidates.filter((candidate) => candidate.score > 0);
  const hasPaymentCue = PAYMENT_CONTEXT.test(text) || ACTUAL_PAYMENT_CONTEXT.test(text);
  const note = extractMerchant(text);
  const occurredAt = extractOccurredAt(text, input.now);
  const warnings: string[] = [];

  if (!best) warnings.push('没有识别到明确的实付金额，请手动填写');
  if (positiveCandidates.length > 1) warnings.push('识别到多个金额，请核对实付金额');

  const confidence: ScreenBillConfidence =
    !best
      ? 'low'
      : hasPaymentCue && (ACTUAL_PAYMENT_CONTEXT.test(text) || /支付成功|付款成功/.test(text))
        ? positiveCandidates.length > 1
          ? 'medium'
          : 'high'
        : 'medium';

  return {
    type: 'expense',
    amountMinor: best?.amountMinor ?? null,
    occurredAt,
    note,
    confidence,
    warnings,
  };
}
