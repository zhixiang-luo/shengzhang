/** Synthetic images only. Never point this script at user screenshots. */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';
import { config } from 'dotenv';

import { OpenAiScreenVisionProvider } from '../src/providers/screen-vision.js';
import { loadEnvironment } from '../src/config.js';
import { resolveScreenVisionCredentials } from '../src/providers/screen-vision-config.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const environment = loadEnvironment();
const { apiKey: key, disableThinking } = resolveScreenVisionCredentials(environment);
if (!key) throw new Error('No vision key configured');
const directory = new URL('../testdata/screen-bill/', import.meta.url);
await mkdir(directory, { recursive: true });
const cases = [
  { name: 'decimal', lines: ['微信支付', '支付成功', '实付 ￥26.58', '商户：示例餐厅', '支付时间 2026-11-12 12:31'], amount: 2658 },
  { name: 'discount', lines: ['支付宝', '付款成功', '原价 ￥35.00', '优惠 ￥9.00', '实付 ￥26.00', '收款方：示例商店'], amount: 2600 },
  { name: 'bank-balance', lines: ['示例银行 · 交易详情', '消费成功', '余额', '￥9999.00', '交易金额', '￥26.58', '商户：示例商店'], amount: 2658 },
  { name: 'missing-amount', lines: ['微信支付', '支付成功', '商户：示例餐厅', '订单号 202611120001'], amount: null },
  { name: 'failed', lines: ['支付宝', '支付失败', '交易金额 ￥26.58', '收款方：示例商店'], amount: null },
  { name: 'merchant-only', lines: ['支付宝', '支付成功', '实付 ￥18.00', '收款方：示例餐厅'], amount: 1800 },
];
const models = (process.env.SCREEN_EVAL_MODELS || environment.SCREEN_VISION_MODEL).split(',');
const results: object[] = [];
for (const sample of cases) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1100"><rect width="700" height="1100" fill="#fff"/><text x="40" y="50" font-family="PingFang SC" font-size="20" fill="#777">声账合成评测样本 · 非真实账单</text>${sample.lines.map((line, index) => `<text x="45" y="${150 + index * 90}" font-family="PingFang SC" font-size="${line.includes('￥') ? 42 : 32}" fill="#222">${line}</text>`).join('')}</svg>`;
  const image = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
  await writeFile(new URL(`${sample.name}.png`, directory), image);
  for (const model of models) {
    const provider = new OpenAiScreenVisionProvider({ apiKey: key, baseUrl: environment.SCREEN_VISION_BASE_URL, model, timeoutMs: 30_000, disableThinking });
    const started = performance.now();
    try {
      const bill = await provider.parse({ image: { mimeType: 'image/png', base64: image.toString('base64') }, capturedAt: '2026-11-12T05:00:00.000Z', timezone: 'Asia/Shanghai', categories: [{ id: 'food', name: '餐饮', type: 'expense' }, { id: 'other', name: '其他', type: 'expense' }] });
      const row = { case: sample.name, model, expectedAmountMinor: sample.amount, actualAmountMinor: bill.amountMinor, exact: sample.amount === bill.amountMinor, inventedItem: bill.item !== null, time: bill.occurredAt, latencyMs: Math.round(performance.now() - started), error: null };
      results.push(row);
      console.log(JSON.stringify(row));
    } catch (error) {
      const row = { case: sample.name, model, exact: false, latencyMs: Math.round(performance.now() - started), error: error instanceof Error && error.message.startsWith('SCREEN_VISION_HTTP_') ? error.message : 'INVALID_OR_TIMEOUT' };
      results.push(row);
      console.log(JSON.stringify(row));
    }
  }
}
await writeFile(new URL('synthetic-eval.json', directory), JSON.stringify({ evaluatedAt: new Date().toISOString(), note: 'Synthetic sample only; not real payment layout or production accuracy evidence. No real user screenshots.', results }, null, 2));
