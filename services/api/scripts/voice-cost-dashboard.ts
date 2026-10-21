import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  estimateMonthlyVoiceCostYuan,
  estimateVoiceRequestCostYuan,
} from '../src/cost/voice-cost-model.js';

type VoiceReport = {
  generatedAt: string;
  totalCases: number;
  executedCases: number;
  metrics: Record<string, number>;
  latency: Record<string, number>;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const reportPath = resolve(scriptDir, '../testdata/voice/report-200-final.json');
const outputPath = resolve(scriptDir, '../testdata/voice/cost-report.json');

function positiveNumber(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw == null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
  return value;
}

const report = JSON.parse(readFileSync(reportPath, 'utf8')) as VoiceReport;
const assumptions = {
  averageAudioSeconds: positiveNumber('VOICE_COST_AVG_AUDIO_SECONDS', 5),
  asrCnyPerHour: positiveNumber('VOICE_COST_ASR_CNY_PER_HOUR', 0.79),
  nonAsrCnyPerRequest: positiveNumber('VOICE_COST_NON_ASR_CNY_PER_REQUEST', 0),
  daysPerMonth: positiveNumber('VOICE_COST_DAYS_PER_MONTH', 30),
};
const asrCostPerRequestYuan = estimateVoiceRequestCostYuan({
  audioSeconds: assumptions.averageAudioSeconds,
  asrCnyPerHour: assumptions.asrCnyPerHour,
  nonAsrCnyPerRequest: assumptions.nonAsrCnyPerRequest,
});

const scenarios = [3, 10, 20].flatMap((requestsPerDay) =>
  [1_000, 10_000].map((monthlyActiveUsers) => ({
    requestsPerDay,
    monthlyActiveUsers,
    monthlyCostYuan:
      estimateMonthlyVoiceCostYuan({
        audioSeconds: assumptions.averageAudioSeconds,
        asrCnyPerHour: assumptions.asrCnyPerHour,
        nonAsrCnyPerRequest: assumptions.nonAsrCnyPerRequest,
        daysPerMonth: assumptions.daysPerMonth,
        requestsPerDay,
      }) * monthlyActiveUsers,
  })),
);

const dashboard = {
  generatedAt: new Date().toISOString(),
  sourceReport: {
    generatedAt: report.generatedAt,
    totalCases: report.totalCases,
    executedCases: report.executedCases,
    metrics: report.metrics,
    latency: report.latency,
  },
  assumptions,
  disclaimer:
    'ASR scenario estimate only. DeepSeek tokens, gateway compute, storage, payment fees, tax and support are not complete until replaced by supplier invoices.',
  asrCostPerRequestYuan,
  scenarios,
};

writeFileSync(outputPath, `${JSON.stringify(dashboard, null, 2)}\n`);

console.log(
  [
    '声账语音成本看板',
    `基于评测：${report.generatedAt}`,
    `平均音频：${assumptions.averageAudioSeconds}s`,
    `ASR：¥${assumptions.asrCnyPerHour}/小时`,
    `单次估算：¥${asrCostPerRequestYuan.toFixed(6)}`,
    '',
    '| 日均语音 | 月活 | 月成本估算 |',
    '| ---: | ---: | ---: |',
    ...scenarios.map(
      (scenario) =>
        `| ${scenario.requestsPerDay} 次 | ${scenario.monthlyActiveUsers} | ¥${scenario.monthlyCostYuan.toFixed(2)} |`,
    ),
    '',
    '未包含：DeepSeek token、网关、存储、支付渠道、税费和客服。',
    `报告：${outputPath}`,
  ].join('\n'),
);
