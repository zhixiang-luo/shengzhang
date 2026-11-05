import { describe, expect, it } from 'vitest';

import { hasSeenCurrentBootIntro, shouldPersistBootIntro } from './bootState';

describe('hasSeenCurrentBootIntro', () => {
  it('treats the current or a newer intro version as seen', () => {
    expect(hasSeenCurrentBootIntro('1')).toBe(true);
    expect(hasSeenCurrentBootIntro('2')).toBe(true);
  });

  it('treats missing, invalid, or older versions as unseen', () => {
    expect(hasSeenCurrentBootIntro(null)).toBe(false);
    expect(hasSeenCurrentBootIntro('')).toBe(false);
    expect(hasSeenCurrentBootIntro('0')).toBe(false);
    expect(hasSeenCurrentBootIntro('not-a-version')).toBe(false);
  });
});

describe('shouldPersistBootIntro', () => {
  it('waits for the full intro to finish before remembering it', () => {
    expect(shouldPersistBootIntro(false)).toBe(false);
    expect(shouldPersistBootIntro(true)).toBe(true);
  });
});
