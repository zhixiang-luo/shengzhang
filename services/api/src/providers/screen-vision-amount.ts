import { parseYuanToCents } from '@shengzhang/domain/money';
import { normalizeScreenText } from '@shengzhang/domain/screen-bill';

type Kind = 'expense' | 'income';
const NUMBER = '(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d{1,2})?';
const MONEY = new RegExp(`^([+-])?\\s*(?:¥\\s*)?([+-])?\\s*(${NUMBER})\\s*(?:元)?$`);
const PAID = /实付|实际支付|实际付款|已支付|支付金额|付款金额|交易金额|消费金额|支出金额|收入金额|到账金额|收款金额|^金额\s*:?$/;
const UNRELATED = /余额|原价|优惠|折扣|积分|手续费|订单|交易号|流水号|手机号|电话|尾号|卡号|账号|时间|日期/;
const currencyNames = new Intl.DisplayNames(['zh-CN'], { type: 'currency' });
const foreignCodes = new Set(Intl.supportedValuesOf('currency').filter((code) => code !== 'CNY'));
const foreignNames = [...foreignCodes].map((code) => currencyNames.of(code)!).filter(Boolean);
const FOREIGN_ALIAS = /[$€£₩₹₽₱฿₪₫₺₦₴]|美金|港币|日圆|日币|澳元|加元|新加坡元|新币|台币/;
const FAILED = /支付失败|付款失败|交易失败|交易关闭|订单关闭|待付款|待支付|等待(?:买家)?付款|未支付|未付款|支付中|(?:支付|付款|交易|订单|当前)(?:状态)?\s*:?\s*(?:已)?(?:关闭|取消|撤销|失败)|(?:^|\n)\s*(?:已关闭|已取消|已撤销|已失败)\s*(?:$|\n)/;
const STATUS_SUCCESS = /^(?:支付成功|付款成功|交易成功|消费成功|收款成功|交易完成|交易已完成|成功|完成|已完成|已支付|已付款|已到账|已收款|已结算)$/;

function normalize(value: string): string {
  return normalizeScreenText(value).replace(/[−﹣－]/g, '-').replace(/[＋]/g, '+').trim();
}

function successfulLine(value: string): boolean {
  return STATUS_SUCCESS.test(value.replace(/^(?:交易|支付|付款|订单|当前)状态\s*:?\s*/, ''));
}

export function visionEvidenceBlockingReason(evidence: string | null): string | null {
  const value = normalize(evidence ?? '');
  if (FAILED.test(value)) return '未确认这笔交易已成功，请手动核对';
  // A model's success enum cannot override a labelled pending/unknown status.
  const statuses = [...value.matchAll(/(?:交易|支付|付款|订单|当前)状态[ \t]*:?[ \t]*(?:\r?\n[ \t]*)?([^\r\n]*)/g)];
  if (statuses.some((match) => !STATUS_SUCCESS.test(match[1]!.trim()))) return '未确认这笔交易已成功，请手动核对';
  if (/转账|退款|已退回|撤销交易/.test(value)) return '转账、退款或未知收支请通过手动记账确认';
  const codes = value.match(/[A-Za-z]+/g) ?? [];
  if (FOREIGN_ALIAS.test(value) || codes.some((code) => foreignCodes.has(code.toUpperCase())) || foreignNames.some((name) => value.includes(name))) return '当前仅支持人民币账单';
  return null;
}

function readMoney(value: string, type: Kind): number | null {
  const match = MONEY.exec(normalize(value));
  if (!match || (match[1] && match[2])) return null;
  const sign = match[1] || match[2];
  if ((sign === '+' && type !== 'income') || (sign === '-' && type !== 'expense')) return null;
  const minor = parseYuanToCents(match[3]!);
  return minor && minor <= 99_999_999 ? minor : null;
}

/** Validate the model's chosen figure against its quoted evidence, without running
 * the old OCR candidate scorer. A signed or decimal header is a normal bill layout.
 * The caller separately verifies a single successful CNY expense/income document.
 */
export function verifiedVisionAmount(amountText: string | null, evidence: string | null, type: Kind): number | null {
  if (!amountText || !evidence) return null;
  const expected = readMoney(amountText, type);
  if (expected === null) return null;
  const text = normalize(evidence);
  if (visionEvidenceBlockingReason(text)) return null;
  const values: number[] = [];
  let label = '';
  for (const line of text.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) {
    if (UNRELATED.test(line)) { label = line; continue; }
    if (successfulLine(line)) { if (!UNRELATED.test(label)) label = ''; continue; }
    if (/^(?:¥|人民币|CNY)$/.test(line)) continue;
    const explicit = PAID.test(line);
    const tokens = [...line.matchAll(/[+-]?\s*¥?\s*[+-]?\s*\d[\d,.]*\s*元?/g)].map((match) => match[0].trim());
    if (tokens.length === 0) { label = line; continue; }
    // Two candidates on a single line have no verifiable label/value relationship.
    if (tokens.length !== 1) return null;
    const token = tokens[0]!;
    const rest = line.replace(token, '').replace(/人民币|CNY|支付成功|付款成功|交易成功|消费成功|收款成功|交易已完成|交易完成/g, '').trim();
    const header = rest === '' && (!label || PAID.test(label) || successfulLine(label));
    if (!explicit && !header) continue;
    // A naked integer could be an identifier. Require an amount label, sign,
    // currency, or decimals before treating an unlabelled header as money.
    if (!explicit && !PAID.test(label) && !/[¥元.+-]/.test(token)) continue;
    const minor = readMoney(token, type);
    if (minor === null) return null;
    values.push(minor);
    label = '';
  }
  return values.length > 0 && values.every((minor) => minor === expected) ? expected : null;
}
