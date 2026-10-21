import { randomUUID } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';

import type { FastifyBaseLogger } from 'fastify';
import WebSocket, { WebSocketServer } from 'ws';

import { resolveClientIp } from './security/client-ip.js';
import type { VoiceAccessGuard } from './security/rate-limit.js';
import type { VoiceQuota } from './security/voice-quota.js';
import {
  isSilentVoiceStop,
  resolveVolcanoCloseAction,
} from './voiceStreamState.js';

const VOLCANO_WS_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
const AUDIO_CHUNK_BYTES = 6400;
const FINALIZE_DELAY_MS = 1500;
const FINAL_TIMEOUT_MS = 3000;

type StreamOptions = {
  apiKey: string;
  resourceId: string;
  quota: VoiceQuota;
  accessGuard: VoiceAccessGuard;
  maxStreamBytes: number;
  maxStreamMs: number;
  maxConcurrentPerIp: number;
  maxConcurrentGlobal: number;
  logger: FastifyBaseLogger;
};

type ClientMessage =
  | { type: 'ready' }
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; code: string; message: string };

function buildFrame(messageType: number, flags: number, payload: Buffer): Buffer {
  const header = Buffer.from([
    0x11,
    (messageType << 4) | flags,
    messageType === 0x01 ? 0x10 : 0x00,
    0x00,
  ]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  return Buffer.concat([header, length, payload]);
}

function parseFrame(buffer: Buffer) {
  if (buffer.length < 4) return null;
  const headerSize = (buffer.readUInt8(0) & 0x0f) * 4;
  const messageType = buffer.readUInt8(1) >> 4;
  const flags = buffer.readUInt8(1) & 0x0f;
  let offset = headerSize;
  if (flags & 0x01) offset += 4;
  if (offset + 4 > buffer.length) return null;
  const payloadSize = buffer.readUInt32BE(offset);
  offset += 4;
  if (offset + payloadSize > buffer.length) return null;
  return {
    messageType,
    payload: buffer.subarray(offset, offset + payloadSize),
  };
}

class VolcanoVoiceSession {
  private readonly upstream: WebSocket;
  private readonly audioQueue: Buffer[] = [];
  private audioBuffer = Buffer.alloc(0);
  private ready = false;
  private stopping = false;
  private finished = false;
  private latestText = '';
  private receivedAudioBytes = 0;
  private finalizeTimer: ReturnType<typeof setTimeout> | null = null;
  private finalTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly maxSessionTimer: ReturnType<typeof setTimeout>;

  constructor(
    private readonly client: WebSocket,
    installationId: string,
    private readonly options: StreamOptions,
  ) {
    this.upstream = new WebSocket(VOLCANO_WS_URL, {
      headers: {
        'X-Api-Key': options.apiKey,
        'X-Api-Resource-Id': options.resourceId,
        'X-Api-Connect-Id': randomUUID(),
      },
    });
    this.maxSessionTimer = setTimeout(
      () => this.abort('VOICE_STREAM_TOO_LONG', '单次语音时间过长，请缩短后重试。'),
      options.maxStreamMs,
    );
    this.maxSessionTimer.unref();
    this.upstream.on('open', () => this.handleUpstreamOpen(installationId));
    this.upstream.on('message', (data) => this.handleUpstreamMessage(Buffer.from(data as Buffer)));
    this.upstream.on('error', (error) => {
      if (isSilentVoiceStop({ stopping: this.stopping, text: this.latestText })) {
        this.finish();
        return;
      }
      this.send({ type: 'error', code: 'VOLCANO_CONNECTION_FAILED', message: error.message });
      this.close();
    });
    this.upstream.on('close', () => {
      const action = resolveVolcanoCloseAction({
        finished: this.finished,
        stopping: this.stopping,
      });
      if (action === 'finish') {
        this.finish();
        return;
      }
      if (action === 'error') {
        this.send({
          type: 'error',
          code: 'VOLCANO_CLOSED',
          message: '火山语音连接意外断开，请重试。',
        });
      }
      this.closeClient();
    });
  }

  private handleUpstreamOpen(installationId: string) {
    this.ready = true;
    this.upstream.send(
      buildFrame(
        0x01,
        0x00,
        Buffer.from(
          JSON.stringify({
            user: { uid: installationId.slice(0, 64) },
            audio: {
              format: 'pcm',
              codec: 'raw',
              rate: 16_000,
              bits: 16,
              channel: 1,
            },
            request: {
              model_name: 'bigmodel',
              enable_itn: true,
              enable_ddc: true,
              enable_punc: true,
              show_utterances: true,
            },
          }),
        ),
      ),
    );
    this.send({ type: 'ready' });
    for (const chunk of this.audioQueue.splice(0)) this.appendAudio(chunk);
  }

  pushAudio(chunk: Buffer) {
    this.receivedAudioBytes += chunk.byteLength;
    if (this.receivedAudioBytes > this.options.maxStreamBytes) {
      this.abort('VOICE_AUDIO_TOO_LARGE', '单次语音时间过长，请缩短后重试。');
      return;
    }
    if (!this.ready) {
      this.audioQueue.push(chunk);
      return;
    }
    this.appendAudio(chunk);
  }

  private appendAudio(chunk: Buffer) {
    if (this.stopping || this.finished) return;
    this.audioBuffer = Buffer.concat([this.audioBuffer, chunk]);
    while (this.audioBuffer.length >= AUDIO_CHUNK_BYTES) {
      const packet = this.audioBuffer.subarray(0, AUDIO_CHUNK_BYTES);
      this.audioBuffer = this.audioBuffer.subarray(AUDIO_CHUNK_BYTES);
      this.upstream.send(buildFrame(0x02, 0x00, packet));
    }
  }

  stop() {
    if (this.stopping || this.finished) return;
    this.stopping = true;
    const finalPayload = Buffer.concat([
      this.audioBuffer,
      Buffer.alloc(AUDIO_CHUNK_BYTES),
    ]);
    this.audioBuffer = Buffer.alloc(0);
    this.upstream.send(buildFrame(0x02, 0x02, finalPayload));
    this.finalTimeout = setTimeout(() => this.finish(), FINAL_TIMEOUT_MS);
  }

  private handleUpstreamMessage(buffer: Buffer) {
    const frame = parseFrame(buffer);
    if (!frame) return;
    if (frame.messageType === 0x0f) {
      if (isSilentVoiceStop({ stopping: this.stopping, text: this.latestText })) {
        this.finish();
        return;
      }
      let message = '火山语音识别失败。';
      try {
        const detail = JSON.parse(frame.payload.toString()) as {
          message?: string;
          error?: string;
        };
        message = detail.message ?? detail.error ?? message;
      } catch {
        // Keep the default user-facing message.
      }
      this.send({ type: 'error', code: 'VOLCANO_ASR_ERROR', message });
      this.close();
      return;
    }
    if (frame.messageType !== 0x09) return;
    try {
      const payload = JSON.parse(frame.payload.toString()) as {
        result?: { text?: string; utterances?: Array<{ definite?: boolean }> };
      };
      const text = payload.result?.text?.trim() ?? '';
      if (text && text !== this.latestText) {
        this.latestText = text;
        this.send({ type: 'partial', text });
      }
      if (this.stopping) {
        if (this.finalizeTimer) clearTimeout(this.finalizeTimer);
        const definite = payload.result?.utterances?.some((utterance) => utterance.definite);
        if (definite) {
          this.finish();
        } else {
          this.finalizeTimer = setTimeout(() => this.finish(), FINALIZE_DELAY_MS);
        }
      }
    } catch {
      // Ignore malformed upstream packets; the final timeout still closes cleanly.
    }
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this.maxSessionTimer);
    if (this.finalizeTimer) clearTimeout(this.finalizeTimer);
    if (this.finalTimeout) clearTimeout(this.finalTimeout);
    this.send({ type: 'final', text: this.latestText });
    this.close();
  }

  private send(message: ClientMessage) {
    if (this.client.readyState === WebSocket.OPEN) {
      this.client.send(JSON.stringify(message));
    }
  }

  private close() {
    this.finished = true;
    clearTimeout(this.maxSessionTimer);
    if (this.finalizeTimer) clearTimeout(this.finalizeTimer);
    if (this.finalTimeout) clearTimeout(this.finalTimeout);
    if (
      this.upstream.readyState === WebSocket.OPEN ||
      this.upstream.readyState === WebSocket.CONNECTING
    ) {
      this.upstream.close();
    }
    this.closeClient();
  }

  private closeClient() {
    if (this.client.readyState === WebSocket.OPEN) this.client.close();
  }

  private abort(code: string, message: string) {
    if (this.finished) return;
    this.send({ type: 'error', code, message });
    this.close();
  }
}

function rejectUpgrade(
  socket: NodeJS.WritableStream & { destroy(): void },
  status: string,
  retryAfterSeconds?: number,
) {
  const retryAfter = retryAfterSeconds
    ? `Retry-After: ${retryAfterSeconds}\r\n`
    : '';
  socket.write(
    `HTTP/1.1 ${status}\r\nConnection: close\r\n${retryAfter}Content-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}

export function attachVoiceStreamServer(server: Server, options: StreamOptions) {
  const wss = new WebSocketServer({ noServer: true });
  const activeByIp = new Map<string, number>();
  let activeGlobal = 0;

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== '/v1/voice/stream') return;
    const installationId = url.searchParams.get('installationId');
    if (!installationId) {
      rejectUpgrade(socket, '400 Bad Request');
      return;
    }
    const ip = resolveClientIp(request);
    const access = options.accessGuard.consume(ip);
    if (!access.allowed) {
      rejectUpgrade(socket, '429 Too Many Requests', access.retryAfterSeconds);
      return;
    }
    if (!options.quota.consume(installationId)) {
      rejectUpgrade(socket, '429 Too Many Requests', 60);
      return;
    }
    if (
      activeGlobal >= options.maxConcurrentGlobal ||
      (activeByIp.get(ip) ?? 0) >= options.maxConcurrentPerIp
    ) {
      rejectUpgrade(socket, '503 Service Unavailable', 5);
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => {
      activeGlobal += 1;
      activeByIp.set(ip, (activeByIp.get(ip) ?? 0) + 1);
      client.once('close', () => {
        activeGlobal = Math.max(0, activeGlobal - 1);
        const next = Math.max(0, (activeByIp.get(ip) ?? 1) - 1);
        if (next === 0) activeByIp.delete(ip);
        else activeByIp.set(ip, next);
      });
      wss.emit('connection', client, request);
    });
  });

  wss.on('connection', (client, request) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const installationId = url.searchParams.get('installationId') ?? 'unknown';
    const session = new VolcanoVoiceSession(client, installationId, options);
    client.on('message', (data, isBinary) => {
      if (isBinary) {
        session.pushAudio(Buffer.from(data as Buffer));
        return;
      }
      try {
        const message = JSON.parse(data.toString()) as { type?: string };
        if (message.type === 'stop') session.stop();
      } catch {
        // Ignore malformed client control messages.
      }
    });
    client.on('close', () => session.stop());
    client.on('error', (error) => {
      options.logger.error({ err: error }, 'Voice WebSocket client failed');
      session.stop();
    });
  });

  return wss;
}
