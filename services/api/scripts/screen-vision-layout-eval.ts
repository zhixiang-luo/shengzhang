/** Generates its own fictitious layouts. Never accepts user screenshots or logs real bills. */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';
import { parseYuanToCents } from '@shengzhang/domain/money';
import { extractScreenBill, normalizeScreenText } from '@shengzhang/domain/screen-bill';
import { config } from 'dotenv';

import { loadEnvironment } from '../src/config.js';
import { resolveScreenVisionCredentials } from '../src/providers/screen-vision-config.js';
import { SCREEN_VISION_PROMPT, validateVisionBill } from '../src/providers/screen-vision.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const environment = loadEnvironment();
const { apiKey, disableThinking } = resolveScreenVisionCredentials(environment);
if (!apiKey) throw new Error('No vision key configured');
const directory = new URL('../testdata/screen-bill/layouts-033/', import.meta.url);
await mkdir(directory, { recursive: true });
const context = { capturedAt: '2026-11-13T05:00:00.000Z', timezone: 'Asia/Shanghai', categories: [
  { id: 'food', name: '餐饮', type: 'expense' as const },
  { id: 'other', name: '其他', type: 'expense' as const },
] };
const cases = [
  { name: 'alipay-signed', title: '账单详情', merchant: '示例咖啡店', amount: '−26.58', status: '交易成功', currency: '人民币', expected: 2658 },
  { name: 'alipay-plain', title: '账单详情', merchant: '示例便利店', amount: '-18.00', status: '交易成功', currency: '', expected: 1800 },
  { name: 'alipay-unsigned', title: '账单详情', merchant: '示例午餐店', amount: '26.58', status: '交易成功', currency: '人民币', expected: 2658 },
  { name: 'wechat-header', title: '微信支付 · 账单详情', merchant: '示例餐厅', amount: '¥ 42.80', status: '支付成功', currency: '', expected: 4280 },
  { name: 'alipay-failed', title: '账单详情', merchant: '示例商店', amount: '-26.58', status: '交易关闭', currency: '人民币', expected: null },
  { name: 'wechat-missing', title: '微信支付 · 账单详情', merchant: '示例商店', amount: '', status: '支付成功', currency: '', expected: null },
];
const text = (value: string, x: number, y: number, size: number, anchor = 'start', color = '#242424') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="PingFang SC" font-size="${size}" fill="${color}">${value}</text>`;
const results = [];
for (const sample of cases) {
  const rows = [['当前状态', sample.status], ['商品说明', sample.name.includes('missing') ? '示例商品' : '示例饮品'],
    ['付款方式', '示例银行储蓄卡（1234）'], ['支付时间', '2026-11-13 12:31:00'], ['商家订单号', '2026111300012345']];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1600"><rect width="720" height="1600" fill="#f7f7f7"/>
    ${text('12:35', 28, 36, 20)}${text(sample.title, 360, 105, 30, 'middle')}
    <rect x="0" y="150" width="720" height="1340" fill="white"/>
    <circle cx="360" cy="237" r="34" fill="#dfeaf6"/>${text('商', 360, 249, 28, 'middle')}
    ${text(sample.merchant, 360, 326, 30, 'middle')}${text(sample.amount, 360, 430, 62, 'middle')}
    ${text(sample.currency, 360, 470, 20, 'middle', '#777')}${text(sample.status, 360, 526, 24, 'middle', '#777')}
    ${rows.map(([label, value], index) => text(label!, 40, 650 + index * 95, 23, 'start', '#777') + text(value!, 680, 650 + index * 95, 23, 'end')).join('')}
    ${text('合成样本 · 非真实账单', 360, 1430, 24, 'middle', '#aaa')}</svg>`;
  const image = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
  await writeFile(new URL(`${sample.name}.png`, directory), image);
  const started = performance.now();
  try {
    const response = await fetch(`${environment.SCREEN_VISION_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: environment.SCREEN_VISION_MODEL, temperature: 0, max_tokens: 700,
        ...(disableThinking ? { enable_thinking: false } : {}), response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SCREEN_VISION_PROMPT }, { role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${image.toString('base64')}` } },
          { type: 'text', text: JSON.stringify(context) },
        ] }],
      }),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const completion = await response.json() as { choices: { message: { content: string } }[] };
    const raw = JSON.parse(completion.choices[0]!.message.content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim());
    const bill = validateVisionBill(raw, context);
    // Exact prior amount gate, applied to the SAME model answer for comparison.
    const oldText = normalizeScreenText(raw.amountText ?? '').trim();
    const oldParsed = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(oldText) ? parseYuanToCents(oldText) : null;
    const oldEvidence = extractScreenBill({ text: `交易成功\n${raw.amountEvidence ?? ''}`, now: context.capturedAt, sourceApp: 'unknown' });
    const previousAmountMinor = !bill.blockingReason && oldParsed && oldParsed === oldEvidence.amountMinor ? oldParsed : null;
    const row = { case: sample.name, expectedAmountMinor: sample.expected, raw, previousAmountMinor, actualAmountMinor: bill.amountMinor,
      exact: sample.expected === bill.amountMinor, amountIssue: bill.amountIssue, blockingReason: bill.blockingReason,
      latencyMs: Math.round(performance.now() - started) };
    results.push(row);
    console.log(JSON.stringify({ ...row, raw: undefined }));
  } catch (error) {
    const row = { case: sample.name, exact: false, error: error instanceof Error && /^HTTP_\d+$/.test(error.message) ? error.message : 'INVALID_OR_TIMEOUT', latencyMs: Math.round(performance.now() - started) };
    results.push(row); console.log(JSON.stringify(row));
  }
}
await writeFile(new URL('results.json', directory), JSON.stringify({ evaluatedAt: new Date().toISOString(), model: environment.SCREEN_VISION_MODEL,
  note: 'Fictitious template-shaped layouts only; cannot prove production accuracy. No user images. Raw output is retained ONLY for these generated fixtures.', results }, null, 2));
