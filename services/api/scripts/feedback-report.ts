import { config as loadDotenv } from 'dotenv';

import {
  pruneFeedback,
  readFeedback,
} from '../src/feedback/feedback-store.js';
import { formatFeedbackSummary } from '../src/feedback/feedback-summary.js';

loadDotenv({ path: new URL('../../../.env', import.meta.url) });

const dataDirectory = process.env.FEEDBACK_DATA_DIR || '.feedback';
const argument = (name: string) =>
  process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
const date = argument('date');
const format = argument('format') ?? 'summary';
const pruneBefore = argument('prune-before');

if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  throw new Error('--date must use YYYY-MM-DD');
}
if (pruneBefore && !/^\d{4}-\d{2}-\d{2}$/.test(pruneBefore)) {
  throw new Error('--prune-before must use YYYY-MM-DD');
}
if (format !== 'summary' && format !== 'jsonl') {
  throw new Error('--format must be summary or jsonl');
}

if (pruneBefore) {
  const removed = await pruneFeedback(dataDirectory, pruneBefore);
  if (format === 'summary') console.log(`已清理 ${removed} 个过期反馈目录`);
}

const records = await readFeedback(dataDirectory, date ? { date } : {});
if (format === 'jsonl') {
  for (const record of records) console.log(JSON.stringify(record));
} else {
  console.log(
    formatFeedbackSummary(records, {
      date: date ?? '全部日期',
      directory: dataDirectory,
    }),
  );
}
