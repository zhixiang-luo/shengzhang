import { describe, expect, it } from 'vitest';

import {
  buildManualEntryRecoveryParams,
  resolveVoiceRecoveryAttempt,
} from './voiceRecovery';

describe('resolveVoiceRecoveryAttempt', () => {
  it('reparses the retained transcript when structuring failed', () => {
    expect(
      resolveVoiceRecoveryAttempt({
        stage: 'structuring',
        transcript: '  午饭二十五，打车十八  ',
      }),
    ).toEqual({
      kind: 'reparse',
      transcript: '午饭二十五，打车十八',
    });
  });

  it('asks the user to speak again when recognition failed', () => {
    expect(
      resolveVoiceRecoveryAttempt({
        stage: 'recognition',
        transcript: '',
      }),
    ).toEqual({
      kind: 'record',
      transcript: '',
    });
  });
});

describe('buildManualEntryRecoveryParams', () => {
  it('prefills the recovered transcript as the manual entry note', () => {
    expect(buildManualEntryRecoveryParams('  瑞幸咖啡 18  ')).toEqual({
      note: '瑞幸咖啡 18',
    });
  });

  it('does not add a blank note parameter', () => {
    expect(buildManualEntryRecoveryParams('   ')).toEqual({});
  });

  it('keeps the prefilled note within the manual entry length limit', () => {
    const transcript = `午饭二十五，打车十八，${'咖啡十六，'.repeat(10)}`;
    expect(buildManualEntryRecoveryParams(transcript).note).toHaveLength(40);
  });
});
