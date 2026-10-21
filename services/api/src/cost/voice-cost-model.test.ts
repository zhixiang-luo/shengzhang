import { describe, expect, it } from 'vitest';

import {
  estimateMonthlyVoiceCostYuan,
  estimateVoiceRequestCostYuan,
} from './voice-cost-model.js';

describe('voice cost model', () => {
  it('estimates the ASR cost for a five-second request', () => {
    expect(
      estimateVoiceRequestCostYuan({
        audioSeconds: 5,
        asrCnyPerHour: 0.79,
      }),
    ).toBeCloseTo(0.001097222, 9);
  });

  it('includes non-ASR cost and monthly usage', () => {
    expect(
      estimateMonthlyVoiceCostYuan({
        audioSeconds: 5,
        asrCnyPerHour: 0.79,
        nonAsrCnyPerRequest: 0.01,
        requestsPerDay: 10,
        daysPerMonth: 30,
      }),
    ).toBeCloseTo(3.3291667, 7);
  });

  it('rejects invalid negative assumptions', () => {
    expect(() =>
      estimateVoiceRequestCostYuan({
        audioSeconds: -1,
        asrCnyPerHour: 0.79,
      }),
    ).toThrow('audioSeconds');
  });
});
