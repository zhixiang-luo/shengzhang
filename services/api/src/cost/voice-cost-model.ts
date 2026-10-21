export interface VoiceRequestCostInput {
  audioSeconds: number;
  asrCnyPerHour: number;
  nonAsrCnyPerRequest?: number;
}

export interface MonthlyVoiceCostInput extends VoiceRequestCostInput {
  requestsPerDay: number;
  daysPerMonth?: number;
}

function assertNonNegative(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
}

export function estimateVoiceRequestCostYuan(input: VoiceRequestCostInput): number {
  assertNonNegative('audioSeconds', input.audioSeconds);
  assertNonNegative('asrCnyPerHour', input.asrCnyPerHour);
  const nonAsrCnyPerRequest = input.nonAsrCnyPerRequest ?? 0;
  assertNonNegative('nonAsrCnyPerRequest', nonAsrCnyPerRequest);

  return (input.audioSeconds / 3600) * input.asrCnyPerHour + nonAsrCnyPerRequest;
}

export function estimateMonthlyVoiceCostYuan(input: MonthlyVoiceCostInput): number {
  assertNonNegative('requestsPerDay', input.requestsPerDay);
  const daysPerMonth = input.daysPerMonth ?? 30;
  assertNonNegative('daysPerMonth', daysPerMonth);
  return estimateVoiceRequestCostYuan(input) * input.requestsPerDay * daysPerMonth;
}
