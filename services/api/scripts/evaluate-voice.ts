import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CATEGORY_SEEDS } from '@shengzhang/domain';
import WebSocket from 'ws';

type ExpectedEntry = {
  type: 'expense' | 'income';
  amountMinor?: number;
  categoryPath: string[];
  dateRule?: 'today' | 'yesterday' | 'dayBefore' | 'oct5' | null;
  missingAmount?: boolean;
};

type EvalCase = {
  id: string;
  utterance: string;
  expected: ExpectedEntry[];
  tags: string[];
};

type ActualEntry = {
  type?: 'expense' | 'income';
  amountMinor?: number;
  categoryPath?: string[];
  occurredAt?: string;
};

type ParseResponse = {
  transcript: string;
  entries: ActualEntry[];
  unresolvedFields: string[];
  latencyMs: number;
};

type CaseResult = {
  id: string;
  utterance: string;
  transcript: string;
  expected: ExpectedEntry[];
  actual: ParseResponse['entries'];
  entryCount: boolean;
  amount: boolean;
  type: boolean;
  primaryCategory: boolean;
  secondaryCategory: boolean;
  date: boolean;
  unresolved: boolean;
  exact: boolean;
  firstPartialMs: number | null;
  finalTextMs: number;
  releaseToFinalMs: number;
  parseMs: number;
  totalMs: number;
  releaseToTotalMs: number;
  error?: string;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const datasetPath = resolve(scriptDir, '../testdata/voice/cases.json');
const reportPath = resolve(scriptDir, '../testdata/voice/last-report.json');
const audioDir = '/tmp/shengzhang-voice-eval';
const apiBase = process.env.VOICE_EVAL_API_URL || 'http://127.0.0.1:8787';
const runId = Date.now().toString(36);
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const idsArg = process.argv.find((arg) => arg.startsWith('--ids='));
const requestedLimit = limitArg ? Number(limitArg.slice('--limit='.length)) : 20;

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8')) as {
  version: number;
  cases: EvalCase[];
};
const selectedIds = idsArg
  ? new Set(idsArg.slice('--ids='.length).split(',').filter(Boolean))
  : null;
const cases = selectedIds
  ? dataset.cases.filter((testCase) => selectedIds.has(testCase.id))
  : dataset.cases.slice(0, Number.isFinite(requestedLimit) ? requestedLimit : 20);
const categoryTree = DEFAULT_CATEGORY_SEEDS.filter((category) => category.parentId === null).map(
  (root) => ({
    name: root.name,
    type: root.type,
    children: DEFAULT_CATEGORY_SEEDS.filter(
      (category) => category.parentId === root.id,
    ).map((category) => category.name),
  }),
);

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function expectedDateKey(rule: EvalCase['expected'][number]['dateRule']) {
  if (!rule) return null;
  const now = new Date();
  if (rule === 'today') return dateKey(now);
  if (rule === 'yesterday') return dateKey(new Date(now.getTime() - 86_400_000));
  if (rule === 'dayBefore') return dateKey(new Date(now.getTime() - 2 * 86_400_000));
  const currentYear = Number(dateKey(now).slice(0, 4));
  let candidate = new Date(`${currentYear}-10-05T12:00:00+08:00`);
  if (candidate.getTime() > now.getTime()) {
    candidate = new Date(`${currentYear - 1}-10-05T12:00:00+08:00`);
  }
  return dateKey(candidate);
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return Math.round(sorted[index]);
}

function ensureAudio(testCase: EvalCase) {
  mkdirSync(audioDir, { recursive: true });
  const suffix = createHash('sha1').update(testCase.utterance).digest('hex').slice(0, 8);
  const aiffPath = resolve(audioDir, `${testCase.id}-${suffix}.aiff`);
  const wavPath = resolve(audioDir, `${testCase.id}-${suffix}.wav`);
  if (existsSync(wavPath)) return wavPath;
  const say = spawnSync(
    'say',
    ['-v', 'Tingting', '-o', aiffPath, testCase.utterance],
    { encoding: 'utf8' },
  );
  if (say.status !== 0) throw new Error(`say failed for ${testCase.id}: ${say.stderr}`);
  const convert = spawnSync(
    'afconvert',
    [aiffPath, wavPath, '-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1'],
    { encoding: 'utf8' },
  );
  if (convert.status !== 0) throw new Error(`afconvert failed for ${testCase.id}: ${convert.stderr}`);
  return wavPath;
}

async function streamAudio(wavPath: string, installationId: string) {
  const wav = readFileSync(wavPath);
  const pcm = wav.subarray(44);
  const startedAt = performance.now();
  const socket = new WebSocket(
    `${apiBase.replace(/^http/, 'ws')}/v1/voice/stream?installationId=${encodeURIComponent(
      installationId,
    )}`,
  );
  let firstPartialMs: number | null = null;
  let releaseAtMs = 0;
  let finalText = '';
  let timer: ReturnType<typeof setInterval> | null = null;
  let offset = 0;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Voice stream timeout'));
    }, 20_000);
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      if (timer) clearInterval(timer);
      socket.close();
      if (error) reject(error);
      else resolve();
    };
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as {
        type: string;
        text?: string;
        message?: string;
      };
      if (message.type === 'ready') {
        timer = setInterval(() => {
          if (offset >= pcm.length) {
            if (timer) clearInterval(timer);
            timer = null;
            releaseAtMs = performance.now() - startedAt;
            socket.send(JSON.stringify({ type: 'stop' }));
            return;
          }
          const end = Math.min(offset + 6400, pcm.length);
          socket.send(pcm.subarray(offset, end));
          offset = end;
        }, 200);
      } else if (message.type === 'partial') {
        if (firstPartialMs == null) firstPartialMs = performance.now() - startedAt;
      } else if (message.type === 'final') {
        finalText = message.text ?? '';
        finish();
      } else if (message.type === 'error') {
        finish(new Error(message.message || 'Voice stream failed'));
      }
    });
    socket.on('error', (error) => finish(error));
    socket.on('close', () => {
      if (!finalText) finish(new Error('Voice stream closed before final'));
    });
  });

  const finalTextMs = Math.round(performance.now() - startedAt);
  return {
    transcript: finalText,
    firstPartialMs: firstPartialMs == null ? null : Math.round(firstPartialMs),
    finalTextMs,
    releaseToFinalMs: Math.max(0, finalTextMs - Math.round(releaseAtMs)),
  };
}

async function parseTranscript(transcript: string, installationId: string) {
  const startedAt = performance.now();
  const response = await fetch(`${apiBase}/v1/voice/parse-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installationId,
      transcript,
      timezone: 'Asia/Shanghai',
      categories: categoryTree,
    }),
  });
  const body = (await response.json()) as
    | ParseResponse
    | { error?: { code?: string; message?: string } };
  if (!response.ok) {
    throw new Error(
      'error' in body
        ? `${body.error?.code ?? 'PARSE_FAILED'}: ${body.error?.message ?? ''}`
        : 'Parse failed',
    );
  }
  return {
    response: body as ParseResponse,
    elapsedMs: Math.round(performance.now() - startedAt),
  };
}

async function parseTranscriptWithRetry(transcript: string, installationId: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await parseTranscript(transcript, installationId);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

function evaluateCase(
  testCase: EvalCase,
  actual: ParseResponse,
  timings: {
    firstPartialMs: number | null;
    finalTextMs: number;
    releaseToFinalMs: number;
    parseMs: number;
  },
): CaseResult {
  const entryCount = actual.entries.length === testCase.expected.length;
  let amount = entryCount;
  let type = entryCount;
  let primaryCategory = entryCount;
  let secondaryCategory = entryCount;
  let date = entryCount;
  let unresolved = true;

  testCase.expected.forEach((expected, index) => {
    const entry = actual.entries[index];
    if (!entry) {
      amount = false;
      type = false;
      primaryCategory = false;
      secondaryCategory = false;
      date = false;
      unresolved = false;
      return;
    }
    if (expected.missingAmount) {
      if (entry.amountMinor != null) amount = false;
      if (actual.unresolvedFields.length === 0) unresolved = false;
    } else if (entry.amountMinor !== expected.amountMinor) {
      amount = false;
    }
    if (entry.type !== expected.type) type = false;
    if (entry.categoryPath?.[0] !== expected.categoryPath[0]) primaryCategory = false;
    if (expected.categoryPath[1] && entry.categoryPath?.[1] !== expected.categoryPath[1]) {
      secondaryCategory = false;
    }
    if (expected.dateRule) {
      if (!entry.occurredAt || dateKey(new Date(entry.occurredAt)) !== expectedDateKey(expected.dateRule)) {
        date = false;
      }
    }
  });

  return {
    id: testCase.id,
    utterance: testCase.utterance,
    transcript: actual.transcript,
    expected: testCase.expected,
    actual: actual.entries,
    entryCount,
    amount,
    type,
    primaryCategory,
    secondaryCategory,
    date,
    unresolved,
    exact: entryCount && amount && type && primaryCategory && secondaryCategory && date && unresolved,
    firstPartialMs: timings.firstPartialMs,
    finalTextMs: timings.finalTextMs,
    releaseToFinalMs: timings.releaseToFinalMs,
    parseMs: timings.parseMs,
    totalMs: timings.finalTextMs + timings.parseMs,
    releaseToTotalMs: timings.releaseToFinalMs + timings.parseMs,
  };
}

const results: CaseResult[] = [];
const rate = (predicate: (result: CaseResult) => boolean) =>
  Math.round((results.filter(predicate).length / results.length) * 1000) / 10;
for (const [index, testCase] of cases.entries()) {
  const installationId = `voice-eval-${runId}-${testCase.id}`;
  process.stdout.write(`[${index + 1}/${cases.length}] ${testCase.id} `);
  let result: CaseResult;
  try {
    const wavPath = ensureAudio(testCase);
    const stream = await streamAudio(wavPath, installationId);
    const parsed = await parseTranscriptWithRetry(stream.transcript, installationId);
    result = evaluateCase(testCase, parsed.response, {
      firstPartialMs: stream.firstPartialMs,
      finalTextMs: stream.finalTextMs,
      releaseToFinalMs: stream.releaseToFinalMs,
      parseMs: parsed.elapsedMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result = {
      id: testCase.id,
      utterance: testCase.utterance,
      transcript: '',
      expected: testCase.expected,
      actual: [],
      entryCount: false,
      amount: false,
      type: false,
      primaryCategory: false,
      secondaryCategory: false,
      date: false,
      unresolved: false,
      exact: false,
      firstPartialMs: null,
      finalTextMs: 0,
      releaseToFinalMs: 0,
      parseMs: 0,
      totalMs: 0,
      releaseToTotalMs: 0,
      error: message,
    };
  }
  results.push(result);
  writeReport();
  console.log(result.exact ? 'PASS' : 'FAIL');
}

function buildReport() {
  return {
    generatedAt: new Date().toISOString(),
    datasetVersion: dataset.version,
    totalCases: dataset.cases.length,
    executedCases: results.length,
    provider: 'volcano-websocket + deepseek',
    metrics: {
      entryCount: rate((result) => result.entryCount),
      amount: rate((result) => result.amount),
      type: rate((result) => result.type),
      primaryCategory: rate((result) => result.primaryCategory),
      secondaryCategory: rate((result) => result.secondaryCategory),
      date: rate((result) => result.date),
      unresolved: rate((result) => result.unresolved),
      exact: rate((result) => result.exact),
    },
    latency: {
      firstPartialP50: percentile(results.flatMap((r) => (r.firstPartialMs == null ? [] : [r.firstPartialMs])), 0.5),
      firstPartialP95: percentile(results.flatMap((r) => (r.firstPartialMs == null ? [] : [r.firstPartialMs])), 0.95),
      finalTextP50: percentile(results.map((r) => r.finalTextMs), 0.5),
      finalTextP95: percentile(results.map((r) => r.finalTextMs), 0.95),
      parseP50: percentile(results.map((r) => r.parseMs), 0.5),
      parseP95: percentile(results.map((r) => r.parseMs), 0.95),
      totalP50: percentile(results.map((r) => r.totalMs), 0.5),
      totalP95: percentile(results.map((r) => r.totalMs), 0.95),
      releaseToFinalP50: percentile(results.map((r) => r.releaseToFinalMs), 0.5),
      releaseToFinalP95: percentile(results.map((r) => r.releaseToFinalMs), 0.95),
      releaseToTotalP50: percentile(results.map((r) => r.releaseToTotalMs), 0.5),
      releaseToTotalP95: percentile(results.map((r) => r.releaseToTotalMs), 0.95),
    },
    failures: results.filter((result) => !result.exact),
    results,
  };
}

function writeReport() {
  mkdirSync(dirname(reportPath), { recursive: true });
  const reportContent = `${JSON.stringify(buildReport(), null, 2)}\n`;
  writeFileSync(reportPath, reportContent);
  if (results.length === dataset.cases.length) {
    writeFileSync(
      resolve(scriptDir, `../testdata/voice/report-${runId}.json`),
      reportContent,
    );
  }
}

const report = buildReport();
console.log(JSON.stringify({ metrics: report.metrics, latency: report.latency }, null, 2));
console.log(`Report: ${reportPath}`);
