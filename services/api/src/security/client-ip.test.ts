import { describe, expect, it } from 'vitest';

import { resolveClientIp } from './client-ip.js';

describe('resolveClientIp', () => {
  it('uses the Nginx-overwritten real IP for loopback requests', () => {
    expect(
      resolveClientIp({
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'x-real-ip': '203.0.113.9' },
      }),
    ).toBe('203.0.113.9');
  });

  it('ignores an invalid real IP header', () => {
    expect(
      resolveClientIp({
        socket: { remoteAddress: '::ffff:127.0.0.1' },
        headers: { 'x-real-ip': 'not-an-ip' },
      }),
    ).toBe('::ffff:127.0.0.1');
  });

  it('always uses the socket address for direct remote requests', () => {
    expect(
      resolveClientIp({
        socket: { remoteAddress: '198.51.100.7' },
        headers: { 'x-real-ip': '203.0.113.9' },
      }),
    ).toBe('198.51.100.7');
  });
});
