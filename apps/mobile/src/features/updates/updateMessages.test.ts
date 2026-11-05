import { describe, expect, it } from 'vitest';

import { toUpdateFailureMessage } from './updateMessages';

describe('toUpdateFailureMessage', () => {
  it('tells the user what to do after a network timeout', () => {
    expect(toUpdateFailureMessage(new Error('The request timed out'))).toBe(
      '网络连接超时。请稍后重试；如果持续失败，请从官网覆盖安装最新版。',
    );
  });

  it('explains when the installed runtime cannot use the current OTA channel', () => {
    expect(
      toUpdateFailureMessage(new Error('No compatible update for runtimeVersion')),
    ).toBe('当前安装包与更新通道不兼容，请从官网覆盖安装最新版。账本会保留。');
  });

  it('hides technical exception text from the user', () => {
    expect(toUpdateFailureMessage(new Error('java.net.UnknownHostException'))).toBe(
      '检查更新失败。请确认网络正常后重试；如果仍失败，请从官网覆盖安装最新版。',
    );
  });
});
