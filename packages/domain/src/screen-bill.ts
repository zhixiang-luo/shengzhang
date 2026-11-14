import { parseYuanToCents } from './money.ts';

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
  timeSource: 'page' | 'capture';
  note: string;
  confidence: ScreenBillConfidence;
  warnings: string[];
  blockingReason: string | null;
}

const EXCLUDED = /订单|交易号|流水号|余额|手机号|电话|尾号|卡号|原价|优惠|折扣|积分|券码|验证码|账号|手续费|时间|日期/;
const PAID = /实付|实际支付|已支付|支付金额|付款金额|交易金额|消费金额|支出金额|收入金额|到账金额/;
const PAYMENT = /支付成功|付款成功|交易成功|消费成功|付款详情|支付详情|账单详情|交易详情|合计|总计/;
const SUCCESS = /支付成功|付款成功|交易成功|消费成功|扣款成功|收款成功|收款到账|交易已完成|(?:交易状态|付款状态|支付状态|当前状态)\s*:?\s*(?:成功|已完成|已支付)|(?:^|\n)(?:已支付|已付款|已完成)(?=\s|$)/;
const FIELD_LABEL = /^(?:实付|实际支付|已支付|支付金额|付款金额|交易金额|消费金额|支出金额|收入金额|到账金额|订单金额|原价|优惠|余额|订单号|订单编号|交易号|流水号|手机号|卡号|手续费)\s*:?$/;
const AMOUNT_TOKEN = /[¥￥]?\s*[+−-]?\d[\d.,:/-]*\s*元?/g;
const TRANSFER_OR_REFUND = /(?:^|\n)(?:(?:交易类型|收支类型|交易状态|当前状态)\s*:?\s*)?(?:转账(?:成功|详情|记录|金额)?|转账给[^\n]*|微信转账|支付宝转账|退款(?:成功|中|处理中|金额|到账|详情)?|已退款|已退回|撤销交易)(?:\s|[:¥]|$)/;
const FOREIGN_CURRENCY = /\b(?:USD|HKD|EUR|GBP|JPY|AUD|CAD|SGD)\s*[+−-]?\d|[$€£]\s*\d|\d[\d.,]*\s*(?:美元|港元|港币|欧元|英镑|日元)|币种\s*:?\s*(?:USD|HKD|EUR|GBP|JPY|美元|港元|港币|欧元|英镑|日元)/i;

export function normalizeScreenText(value: string): string {
  return value
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10))
    .replace(/[，]/g, ',')
    .replace(/[．。]/g, '.')
    .replace(/[：]/g, ':')
    .replace(/[￥]/g, '¥');
}

function fieldLines(text: string): string[] {
  const lines = normalizeScreenText(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index]!;
    // Accessibility labels, currency marks and values can be separate nodes.
    if (FIELD_LABEL.test(line) || (EXCLUDED.test(line) && !/\d/.test(line) && line.length <= 40) || line === '¥') {
      for (let count = 0; count < 2; count += 1) {
        const next = lines[index + 1];
        if (!next || !/^[¥+−\d.,\s-]+(?:元)?$/.test(next)) break;
        line += ` ${next}`;
        index += 1;
      }
    }
    result.push(line);
  }
  return result;
}

function candidatesFromLine(line: string): AmountCandidate[] {
  if (EXCLUDED.test(line)) return [];
  const matches = [...line.matchAll(AMOUNT_TOKEN)];
  // Multiple numbers on one line have ambiguous roles; never choose the largest.
  if (matches.length !== 1) return [];
  const raw = matches[0]![0].trim();
  const value = raw.replace(/^[¥\s+−-]+/, '').replace(/元$/, '').trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) return [];
  const explicit = PAID.test(line);
  const payment = PAYMENT.test(line);
  if (!explicit && !payment && !/[¥元]/.test(raw) && !/^[+−-]/.test(raw)) return [];
  const amountMinor = parseYuanToCents(value);
  if (!amountMinor || amountMinor > 99_999_999) return [];
  return [{
    amountMinor, raw, line,
    score: explicit ? 100 : payment ? 50 : /[¥元]/.test(raw) ? 20 : 10,
  }];
}

export function normalizeScreenAmount(text: string): number | null {
  const candidates = candidatesFromLine(normalizeScreenText(text).trim());
  return candidates[0]?.amountMinor ?? null;
}

export function selectBestAmountCandidate(candidates: AmountCandidate[]): AmountCandidate | null {
  const valid = candidates
    .filter((candidate) => Number.isSafeInteger(candidate.amountMinor) && candidate.amountMinor > 0 && candidate.score > 0)
    .sort((left, right) => right.score - left.score);
  const best = valid[0];
  if (!best || valid.some((candidate) => candidate.score === best.score && candidate.amountMinor !== best.amountMinor)) return null;
  return best;
}

function extractContent(text: string): string {
  const product = text.match(/(?:商品名称|商品说明|商品|付款说明)\s*:?\s*([^\n]+)/)?.[1];
  const merchant = text.match(/(?:收款方|收款人|商户全称|商户名称|商户|付款给|交易对方)\s*:?\s*([^\n]+)/)?.[1];
  return (product ?? merchant ?? '').replace(/(?:支付时间|付款时间|交易时间|订单号).*$/, '').trim().slice(0, 40);
}

function extractTime(text: string, now: string): { occurredAt: string; timeSource: 'page' | 'capture' } {
  const fallback = { occurredAt: now, timeSource: 'capture' as const };
  const current = new Date(now);
  if (Number.isNaN(current.getTime())) return fallback;
  const labeled = text.match(/(?:支付时间|付款时间|交易时间|完成时间|到账时间)\s*:?\s*([^\n]+)/)?.[1];
  // Prefer a labeled transaction time. Unlabeled dates may be order creation dates.
  const source = labeled ?? text.match(/(?:今天|昨天|前天)\s*\d{1,2}:\d{2}/)?.[0];
  if (!source) return fallback;
  const absolute = source.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const relative = source.match(/(?:(今天|昨天|前天)\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  let result: Date;
  if (absolute) {
    const [, y, m, d, h, min, sec] = absolute;
    const parts = [Number(y), Number(m), Number(d), Number(h), Number(min), Number(sec ?? 0)];
    result = new Date(parts[0]!, parts[1]! - 1, parts[2], parts[3], parts[4], parts[5]);
    if (result.getFullYear() !== parts[0] || result.getMonth() + 1 !== parts[1] || result.getDate() !== parts[2] || result.getHours() !== parts[3] || result.getMinutes() !== parts[4] || result.getSeconds() !== parts[5]) return fallback;
  } else if (relative) {
    const [, day, h, min, sec] = relative;
    if (Number(h) > 23 || Number(min) > 59 || Number(sec ?? 0) > 59) return fallback;
    result = new Date(current);
    result.setDate(result.getDate() - (day === '昨天' ? 1 : day === '前天' ? 2 : 0));
    result.setHours(Number(h), Number(min), Number(sec ?? 0), 0);
  } else return fallback;
  return { occurredAt: result.toISOString(), timeSource: 'page' };
}

export function extractScreenBill(input: ScreenBillTextInput): ScreenBillExtraction {
  const text = normalizeScreenText(input.text).trim();
  const blockingReason = /支付失败|付款失败|交易失败|交易关闭|订单关闭|待付款|待支付|等待(?:买家)?付款|等待支付|未支付|未付款|支付中/.test(text)
    ? '这笔交易尚未支付成功，请确认后再记账'
    : TRANSFER_OR_REFUND.test(text)
      ? '这是转账或退款，请通过手动记账确认收支'
      : FOREIGN_CURRENCY.test(text) ? '当前仅支持人民币账单' : null;
  const candidates = fieldLines(text).flatMap(candidatesFromLine);
  const confirmed = SUCCESS.test(text);
  const best = !blockingReason && confirmed ? selectBestAmountCandidate(candidates) : null;
  const warnings: string[] = [];
  if (blockingReason) warnings.push(blockingReason);
  else if (!confirmed && candidates.length > 0) warnings.push('未确认这笔交易已成功，请手动核对或尝试云端识别');
  else if (!best) warnings.push(candidates.length > 1 ? '识别到多个金额，请手动核对实付金额' : '没有识别到明确的实付金额，请手动填写');
  return {
    type: /收入金额|到账金额|收款成功|收款到账|(?:收支类型|收支|交易类型)\s*:?\s*收入/.test(text) || /^[¥\s]*\+/.test(best?.raw ?? '') ? 'income' : 'expense',
    amountMinor: best?.amountMinor ?? null,
    ...extractTime(text, input.now),
    note: extractContent(text),
    confidence: !best ? 'low' : best.score >= 100 ? 'high' : 'medium',
    warnings,
    blockingReason,
  };
}
