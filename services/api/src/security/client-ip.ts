import type { IncomingHttpHeaders } from 'node:http';
import { isIP } from 'node:net';

type ClientAddressRequest = {
  socket: {
    remoteAddress: string | undefined;
  };
  headers: IncomingHttpHeaders;
};

function isLoopback(address: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

export function resolveClientIp(request: ClientAddressRequest): string {
  const remoteAddress = request.socket.remoteAddress ?? 'unknown';
  if (!isLoopback(remoteAddress)) return remoteAddress;

  const header = request.headers['x-real-ip'];
  const realIp = Array.isArray(header) ? header[0] : header;
  return realIp && isIP(realIp) ? realIp : remoteAddress;
}
