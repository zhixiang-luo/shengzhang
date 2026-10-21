import { config as loadDotenv } from 'dotenv';

import { readAnalyticsEvents } from '../src/analytics/event-store.js';
import { summarizeAnalytics } from '../src/analytics/summary.js';

loadDotenv({ path: new URL('../../../.env', import.meta.url) });

const dataDirectory = process.env.ANALYTICS_DATA_DIR || '.analytics';
const dateArgument = process.argv.find((argument) => argument.startsWith('--date='))?.slice('--date='.length);
if (dateArgument && !/^\d{4}-\d{2}-\d{2}$/.test(dateArgument)) {
  throw new Error('--date must use YYYY-MM-DD');
}
const events = await readAnalyticsEvents(dataDirectory);
const summary = summarizeAnalytics(events, {
  fromDate: dateArgument,
  toDate: dateArgument,
});
const percent = (value: number | null) =>
  value === null ? '—' : `${(value * 100).toFixed(1)}%`;
const average = (value: number | null) => (value === null ? '—' : value.toFixed(2));
const milliseconds = (value: number | null) =>
  value === null ? '—' : `${Math.round(value)} ms`;

console.log(`声账匿名使用报告 · ${dateArgument ?? '全部日期'} · ${dataDirectory}`);
console.log('');
console.log(`官网访问 / 独立访客 ${summary.siteViews} / ${summary.siteVisitors}`);
console.log(`下载点击独立访客    ${summary.downloadVisitors}`);
console.log(`下载点击次数        ${summary.downloadStarts}`);
console.log(`官网下载转化率      ${percent(summary.downloadConversionRate)}`);
console.log(`下载后活跃比        ${percent(summary.downloadToActiveRate)}`);
console.log(`App 活跃安装        ${summary.activeUsers}`);
console.log(`完成首笔记账用户    ${summary.activatedUsers}`);
console.log(`激活率              ${percent(summary.activationRate)}`);
console.log(`App 启动次数        ${summary.appOpens}`);
console.log(`人均启动次数        ${average(summary.appOpensPerActiveUser)}`);
console.log(`人均累计活跃天数    ${average(summary.averageActiveDaysPerUser)}`);
console.log(`平均会话时长        ${average(summary.averageSessionSeconds)} 秒`);
console.log(
  `D1 / D7 留存        ${percent(summary.d1Retention.rate)} / ${percent(summary.d7Retention.rate)}`,
);
console.log(`语音开始 / 完成     ${summary.voiceStarted} / ${summary.voiceCompleted}`);
console.log(`语音保存 / 撤销     ${summary.voiceSaved} / ${summary.voiceUndone}`);
console.log(`语音取消 / 失败     ${summary.voiceCancelled} / ${summary.voiceFailed}`);
console.log(`语音完成 / 保存率   ${percent(summary.voiceCompletionRate)} / ${percent(summary.voiceSaveRate)}`);
console.log(`语音时延 P50/P95    ${milliseconds(summary.voiceLatencyP50Ms)} / ${milliseconds(summary.voiceLatencyP95Ms)}`);
console.log(`语音记账条数        ${summary.voiceEntriesRecorded}`);
console.log(`手动新增账单        ${summary.manualTransactionsCreated}`);
console.log(`累计新增账单        ${summary.totalEntriesCreated}`);
console.log(`人均新增账单        ${average(summary.averageEntriesPerActiveUser)}`);
console.log(
  `功能用户 语音/手动   ${summary.featureUsers.voice} / ${summary.featureUsers.manual}`,
);
console.log(
  `功能用户 统计/分类   ${summary.featureUsers.stats} / ${summary.featureUsers.categories}`,
);
console.log(`功能打开 统计/分类   ${summary.statsOpened} / ${summary.categoriesOpened}`);

if (summary.failureReasons.length > 0) {
  console.log(
    `语音失败原因        ${summary.failureReasons
      .map((item) => `${item.reason}:${item.count}`)
      .join(', ')}`,
  );
}
if (summary.platforms.length > 0) {
  console.log(
    `平台活跃用户        ${summary.platforms
      .map((item) => `${item.key}:${item.activeUsers}`)
      .join(', ')}`,
  );
}
if (summary.appVersions.length > 0) {
  console.log(
    `版本活跃用户        ${summary.appVersions
      .map((item) => `${item.key}:${item.activeUsers}`)
      .join(', ')}`,
  );
}

if (summary.daily.length > 0) {
  console.log('');
  console.log('日期         访客  活跃  启动  下载  语音开始  语音保存  失败  记账条数');
  for (const day of summary.daily) {
    console.log(
      `${day.date}  ${String(day.siteVisitors).padStart(4)}  ${String(day.activeUsers).padStart(4)}  ${String(day.appOpens).padStart(4)}  ${String(day.downloadVisitors).padStart(4)}  ${String(day.voiceStarted).padStart(8)}  ${String(day.voiceSaved).padStart(8)}  ${String(day.voiceFailed).padStart(4)}  ${String(day.recordedEntries).padStart(8)}`,
    );
  }
}
