import { describe, expect, it } from 'vitest';

import { compareAppVersions } from './app-update-version.js';

describe('compareAppVersions', () => {
  it('compares numeric segments instead of string values', () => {
    expect(compareAppVersions('0.1.10', '0.1.9')).toBe(1);
  });

  it('treats equal versions as the same release', () => {
    expect(compareAppVersions('0.1.5', '0.1.5')).toBe(0);
  });

  it('recognizes a release below the minimum supported version', () => {
    expect(compareAppVersions('0.1.3', '0.1.4')).toBe(-1);
  });

  it('rejects malformed release versions', () => {
    expect(() => compareAppVersions('latest', '0.1.4')).toThrow(RangeError);
  });
});
