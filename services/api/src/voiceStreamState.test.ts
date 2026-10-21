import { describe, expect, it } from 'vitest';

import {
  isSilentVoiceStop,
  resolveVolcanoCloseAction,
} from './voiceStreamState.js';

describe('voice stream close state', () => {
  it('treats an upstream close after stop as a normal final result', () => {
    expect(
      resolveVolcanoCloseAction({
        finished: false,
        stopping: true,
      }),
    ).toBe('finish');
  });

  it('still reports an unexpected upstream close before stop', () => {
    expect(
      resolveVolcanoCloseAction({
        finished: false,
        stopping: false,
      }),
    ).toBe('error');
  });

  it('ignores a close after the session already finished', () => {
    expect(
      resolveVolcanoCloseAction({
        finished: true,
        stopping: false,
      }),
    ).toBe('ignore');
  });

  it('recognizes an empty stopped utterance', () => {
    expect(isSilentVoiceStop({ stopping: true, text: '' })).toBe(true);
    expect(isSilentVoiceStop({ stopping: true, text: '   ' })).toBe(true);
    expect(isSilentVoiceStop({ stopping: true, text: '午饭25' })).toBe(false);
    expect(isSilentVoiceStop({ stopping: false, text: '' })).toBe(false);
  });
});
