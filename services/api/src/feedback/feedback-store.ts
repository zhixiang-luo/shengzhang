import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  FeedbackSubmission,
  FeedbackSubmissionResponse,
  FeedbackType,
} from '@shengzhang/contracts';

import { shanghaiDateKey } from '../security/voice-quota.js';

type FeedbackDiagnostics = NonNullable<FeedbackSubmission['diagnostics']>;

export type StoredFeedback = {
  schemaVersion: 1;
  feedbackId: string;
  referenceCode: string;
  type: FeedbackType;
  message: string;
  contact: string | null;
  diagnostics: FeedbackDiagnostics | null;
  installationHash: string;
  receivedAt: string;
};

type FeedbackStoreOptions = {
  directory: string;
  hashSalt: string;
  now?: () => Date;
};

function hash(value: string, salt: string): string {
  return createHash('sha256').update(salt).update('\0').update(value).digest('hex');
}

export class FeedbackStore {
  private readonly now: () => Date;

  constructor(private readonly options: FeedbackStoreOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async record(input: FeedbackSubmission): Promise<StoredFeedback> {
    const receivedAt = this.now();
    const dateKey = shanghaiDateKey(receivedAt);
    const dayDirectory = path.join(this.options.directory, dateKey);
    const fileName = `${hash(input.clientFeedbackId, this.options.hashSalt)}.json`;
    const filePath = path.join(dayDirectory, fileName);
    await mkdir(dayDirectory, { recursive: true, mode: 0o700 });

    try {
      return JSON.parse(await readFile(filePath, 'utf8')) as StoredFeedback;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    let dateDirectories: string[] = [];
    try {
      dateDirectories = await readdir(this.options.directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    for (const existingDateKey of dateDirectories.filter(isDateKey).sort().reverse()) {
      try {
        return JSON.parse(
          await readFile(path.join(this.options.directory, existingDateKey, fileName), 'utf8'),
        ) as StoredFeedback;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }

    const feedbackId = randomUUID();
    const record: StoredFeedback = {
      schemaVersion: 1,
      feedbackId,
      referenceCode: `FB-${dateKey.replaceAll('-', '')}-${feedbackId.slice(0, 6).toUpperCase()}`,
      type: input.type,
      message: input.message,
      contact: input.contact ?? null,
      diagnostics: input.diagnostics ?? null,
      installationHash: hash(input.installationId, this.options.hashSalt),
      receivedAt: receivedAt.toISOString(),
    };

    try {
      await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
      return record;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        return JSON.parse(await readFile(filePath, 'utf8')) as StoredFeedback;
      }
      throw error;
    }
  }
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function readFeedback(
  directory: string,
  options: { date?: string } = {},
): Promise<StoredFeedback[]> {
  let dateDirectories: string[];
  try {
    dateDirectories = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const feedback: StoredFeedback[] = [];
  for (const dateKey of dateDirectories.filter(isDateKey).sort()) {
    if (options.date && dateKey !== options.date) continue;
    const dayDirectory = path.join(directory, dateKey);
    for (const fileName of (await readdir(dayDirectory)).filter((name) => name.endsWith('.json')).sort()) {
      try {
        const record = JSON.parse(
          await readFile(path.join(dayDirectory, fileName), 'utf8'),
        ) as StoredFeedback;
        if (record.schemaVersion === 1 && record.referenceCode) feedback.push(record);
      } catch {
        // A malformed private feedback file must not prevent the inbox command from working.
      }
    }
  }
  return feedback;
}

export async function pruneFeedback(directory: string, beforeDate: string): Promise<number> {
  if (!isDateKey(beforeDate)) throw new Error('beforeDate must use YYYY-MM-DD');
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw error;
  }

  const expired = entries.filter((entry) => isDateKey(entry) && entry < beforeDate);
  await Promise.all(
    expired.map((entry) =>
      rm(path.join(directory, entry), { recursive: true, force: true }),
    ),
  );
  return expired.length;
}

export function toFeedbackResponse(record: StoredFeedback): FeedbackSubmissionResponse {
  return {
    referenceCode: record.referenceCode,
    createdAt: record.receivedAt,
  };
}
