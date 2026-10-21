import { config as loadDotenv } from 'dotenv';

import { readAnalyticsEvents } from '../src/analytics/event-store.js';
import { summarizeAnalytics } from '../src/analytics/summary.js';

loadDotenv({ path: new URL('../../../.env', import.meta.url) });

const dataDirectory = process.env.ANALYTICS_DATA_DIR || '.analytics';
const dateArgument = process.argv.find((argument) => argument.startsWith('--date='))?.slice('--date='.length);
if (dateArgument && !/^\d{4}-\d{2}-\d{2}$/.test(dateArgument)) {
  throw new Error('--date must use YYYY-MM-DD');
}
const events = await readAnalyticsEvents(dataDirectory, {
  fromDate: dateArgument,
  toDate: dateArgument,
});
const summary = summarizeAnalytics(events);
const percent = (value: number | null) =>
  value === null ? '—' : `${(value * 100).toFixed(1)}%`;
const average = (value: number | null) => (value === null ? '—' : value.toFixed(2));

console.log(`声账匿名使用报告 · ${dateArgument ?? '全部日期'} · ${dataDirectory}`);
console.log('');
console.log(`官网独立访客        ${summary.siteVisitors}`);
console.log(`下载点击独立访客    ${summary.downloadVisitors}`);
console.log(`下载点击次数        ${summary.downloadStarts}`);
console.log(`官网下载转化率      ${percent(summary.downloadConversionRate)}`);
console.log(`App 活跃安装        ${summary.activeUsers}`);
console.log(`App 启动次数        ${summary.appOpens}`);
console.log(`人均启动次数        ${average(summary.appOpensPerActiveUser)}`);
console.log(`语音开始 / 完成     ${summary.voiceStarted} / ${summary.voiceCompleted}`);
console.log(`语音保存 / 撤销     ${summary.voiceSaved} / ${summary.voiceUndone}`);
console.log(`语音取消 / 失败     ${summary.voiceCancelled} / ${summary.voiceFailed}`);
console.log(`语音记账条数        ${summary.voiceEntriesRecorded}`);
console.log(`手动新增账单        ${summary.manualTransactionsCreated}`);
console.log(`累计新增账单        ${summary.totalEntriesCreated}`);
console.log(`统计页打开          ${summary.statsOpened}`);
console.log(`分类管理打开        ${summary.categoriesOpened}`);

if (summary.daily.length > 0) {
  console.log('');
  console.log('日期         活跃用户  启动  下载访客  语音保存  记账条数');
  for (const day of summary.daily) {
    console.log(
      `${day.date}  ${String(day.activeUsers).padStart(8)}  ${String(day.appOpens).padStart(4)}  ${String(day.downloadVisitors).padStart(8)}  ${String(day.voiceSaved).padStart(8)}  ${String(day.recordedEntries).padStart(8)}`,
    );
  }
}
