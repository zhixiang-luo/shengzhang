import { createHash } from 'node:crypto';

export interface VoiceQuota {
  consume(installationId: string): boolean;
}

export function shanghaiDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export class InMemoryDailyVoiceQuota implements VoiceQuota {
  private readonly usage = new Map<string, number>();

  constructor(private readonly limit: number) {}

  consume(installationId: string): boolean {
    const key = `${shanghaiDateKey()}:${createHash('sha256').update(installationId).digest('hex')}`;
    const next = (this.usage.get(key) ?? 0) + 1;
    if (next > this.limit) return false;
    this.usage.set(key, next);
    return true;
  }
}
