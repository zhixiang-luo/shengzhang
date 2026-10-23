import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  useAudioStream,
  type AudioStreamBuffer,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { listCategories } from '../../db/categoryRepository';
import { useDatabase } from '../../db/DatabaseProvider';
import { trackAnalyticsEvent } from '../../services/analytics';
import { getVoiceStreamUrl, parseVoiceTranscript } from '../../services/voiceApi';
import { useVoiceResultStore } from '../../stores/voiceResultStore';
import { pcm16Level } from './audioChunks';
import type { VoiceGestureMode } from './gesture';
import { resolveVoicePermissionAction } from './permissionFlow';
import { resolveVoiceEntries } from './voiceMapping';

export type VoiceCapturePhase =
  | 'idle'
  | 'requesting'
  | 'permission-ready'
  | 'recording'
  | 'processing'
  | 'error';

const MIN_RECORDING_MS = 300;
const MAX_RECORDING_MS = 30_000;
const READY_TIMEOUT_MS = 6_000;
const FINAL_TIMEOUT_MS = 6_000;
const LEVEL_UPDATE_MS = 70;

type StreamEvent =
  | { type: 'ready' }
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; code?: string; message?: string };

type FinalWaiter = {
  promise: Promise<string>;
  resolve: (text: string) => void;
  reject: (error: Error) => void;
};

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) {
  return Promise.race([
    promise,
    wait(milliseconds).then(() => {
      throw new Error(message);
    }),
  ]);
}

function voiceFailureReason(message: string) {
  if (message.includes('允许声账使用麦克风')) return 'permission' as const;
  if (message.includes('超时')) return 'timeout' as const;
  if (message.includes('连接') || message.includes('火山')) return 'connection' as const;
  if (message.includes('再按住')) return 'too_short' as const;
  return 'unknown' as const;
}

export function useVoiceCapture() {
  const db = useDatabase();
  const [phase, setPhase] = useState<VoiceCapturePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [manualArmed, setManualArmed] = useState(false);
  const [audioLevel] = useState(() => new Animated.Value(0));

  const phaseRef = useRef<VoiceCapturePhase>('idle');
  const mountedRef = useRef(true);
  const recordingRef = useRef(false);
  const finishingRef = useRef(false);
  const releaseRef = useRef<{ cancelled: boolean } | null>(null);
  const transcriptRef = useRef('');
  const socketRef = useRef<WebSocket | null>(null);
  const readyWaiterRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  const finalWaiterRef = useRef<FinalWaiter | null>(null);
  const recordingStartedAtRef = useRef(0);
  const lastLevelUpdateAtRef = useRef(0);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePhase = useCallback((next: VoiceCapturePhase) => {
    phaseRef.current = next;
    if (mountedRef.current) setPhase(next);
  }, []);

  const closeSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    readyWaiterRef.current = null;
    finalWaiterRef.current = null;
    if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  }, []);

  const resetCaptureState = useCallback(() => {
    recordingRef.current = false;
    finishingRef.current = false;
    transcriptRef.current = '';
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    if (mountedRef.current) {
      setTranscript('');
      setCancelArmed(false);
      setManualArmed(false);
      audioLevel.setValue(0);
    }
  }, [audioLevel]);

  const showError = useCallback(
    (message: string) => {
      trackAnalyticsEvent('voice_failed', { reason: voiceFailureReason(message) });
      updatePhase('error');
      setError(message);
      audioLevel.setValue(0);
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'error') updatePhase('idle');
      }, 3200);
    },
    [audioLevel, updatePhase],
  );

  const createReadyWaiter = useCallback(() => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    readyWaiterRef.current = { resolve, reject };
    return promise;
  }, []);

  const createFinalWaiter = useCallback(() => {
    let resolve!: (text: string) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<string>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    finalWaiterRef.current = { promise, resolve, reject };
    return promise;
  }, []);

  const onBuffer = useCallback(
    (buffer: AudioStreamBuffer) => {
      if (!recordingRef.current) return;
      const samples = new Int16Array(buffer.data);
      const now = Date.now();
      if (now - lastLevelUpdateAtRef.current >= LEVEL_UPDATE_MS) {
        lastLevelUpdateAtRef.current = now;
        audioLevel.setValue(pcm16Level(samples));
      }
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(buffer.data);
      }
    },
    [audioLevel],
  );

  const { stream } = useAudioStream({
    sampleRate: 16_000,
    channels: 1,
    encoding: 'int16',
    onBuffer,
  });

  const stopRecorder = useCallback(() => {
    recordingRef.current = false;
    stream.stop();
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, [stream]);

  const finishRecording = useCallback(
    async (cancelled: boolean) => {
      if (finishingRef.current || !recordingRef.current) return;
      finishingRef.current = true;
      const duration = Date.now() - recordingStartedAtRef.current;
      stopRecorder();

      if (cancelled) {
        closeSocket();
        resetCaptureState();
        updatePhase('idle');
        trackAnalyticsEvent('voice_cancelled', { reason: 'cancelled' });
        return;
      }

      if (duration < MIN_RECORDING_MS) {
        closeSocket();
        resetCaptureState();
        showError('再按住说一句。');
        return;
      }

      updatePhase('processing');
      const finalPromise = createFinalWaiter();
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        closeSocket();
        resetCaptureState();
        if (transcriptRef.current.trim()) showError('语音连接已断开，请重试。');
        else {
          trackAnalyticsEvent('voice_failed', { reason: 'connection' });
          updatePhase('idle');
        }
        return;
      }
      await wait(150);
      socket.send(JSON.stringify({ type: 'stop' }));

      try {
        const finalTranscript = (
          await withTimeout(finalPromise, FINAL_TIMEOUT_MS, '火山语音识别超时，请重试。')
        ).trim();
        closeSocket();
        if (!finalTranscript) {
          resetCaptureState();
          updatePhase('idle');
          trackAnalyticsEvent('voice_cancelled', { reason: 'empty' });
          return;
        }

        transcriptRef.current = finalTranscript;
        if (mountedRef.current) setTranscript(finalTranscript);
        const categories = listCategories(db);
        const response = await parseVoiceTranscript(finalTranscript, categories);
        const entries = resolveVoiceEntries(response, categories);
        useVoiceResultStore.getState().setResult({
          requestId: response.requestId,
          transcript: response.transcript,
          entries,
        });
        trackAnalyticsEvent('voice_completed', {
          entryCount: entries.length,
          durationMs: response.latencyMs,
        });
        resetCaptureState();
        updatePhase('idle');
      } catch (caught) {
        closeSocket();
        resetCaptureState();
        if (transcriptRef.current.trim()) {
          showError(caught instanceof Error ? caught.message : '语音识别失败');
        } else {
          updatePhase('idle');
        }
      }
    },
    [
      closeSocket,
      createFinalWaiter,
      db,
      resetCaptureState,
      showError,
      stopRecorder,
      updatePhase,
    ],
  );

  const startHold = useCallback(async () => {
    if (phaseRef.current === 'requesting' || phaseRef.current === 'recording') return;
    if (phaseRef.current === 'processing') return;
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    releaseRef.current = null;
    finishingRef.current = false;
    transcriptRef.current = '';
    setTranscript('');
    setError(null);
    setCancelArmed(false);
    setManualArmed(false);
    audioLevel.setValue(0);
    updatePhase('requesting');

    try {
      const existing = await getRecordingPermissionsAsync();
      const permission = existing.granted ? existing : await requestRecordingPermissionsAsync();
      const permissionAction = resolveVoicePermissionAction({
        hadPermissionBeforeRequest: existing.granted,
        permissionGranted: permission.granted,
      });
      if (permissionAction === 'permission-denied') {
        showError('请允许声账使用麦克风，或改用手动记账。');
        return;
      }
      if (permissionAction === 'show-ready-notice') {
        updatePhase('permission-ready');
        noticeTimerRef.current = setTimeout(() => {
          if (phaseRef.current === 'permission-ready') updatePhase('idle');
        }, 3200);
        return;
      }

      const socket = new WebSocket(await getVoiceStreamUrl());
      socketRef.current = socket;
      const readyPromise = createReadyWaiter();
      socket.onmessage = (event) => {
        let message: StreamEvent;
        try {
          message = JSON.parse(String(event.data)) as StreamEvent;
        } catch {
          return;
        }
        if (message.type === 'ready') {
          readyWaiterRef.current?.resolve();
          readyWaiterRef.current = null;
          return;
        }
        if (message.type === 'partial') {
          transcriptRef.current = message.text;
          if (mountedRef.current) setTranscript(message.text);
          return;
        }
        if (message.type === 'final') {
          transcriptRef.current = message.text;
          if (mountedRef.current) setTranscript(message.text);
          finalWaiterRef.current?.resolve(message.text);
          finalWaiterRef.current = null;
          return;
        }
        if (message.type === 'error') {
          if (phaseRef.current === 'processing' && !transcriptRef.current.trim()) {
            finalWaiterRef.current?.resolve('');
            finalWaiterRef.current = null;
            return;
          }
          const streamError = new Error(message.message || '火山语音识别失败。');
          readyWaiterRef.current?.reject(streamError);
          readyWaiterRef.current = null;
          finalWaiterRef.current?.reject(streamError);
          finalWaiterRef.current = null;
        }
      };
      socket.onerror = () => {
        const streamError = new Error('无法连接火山语音服务。');
        readyWaiterRef.current?.reject(streamError);
        readyWaiterRef.current = null;
        finalWaiterRef.current?.reject(streamError);
        finalWaiterRef.current = null;
      };
      socket.onclose = () => {
        if (phaseRef.current === 'processing' && !transcriptRef.current.trim()) {
          finalWaiterRef.current?.resolve('');
          finalWaiterRef.current = null;
          socketRef.current = null;
          return;
        }
        const streamError = new Error('火山语音连接提前关闭。');
        readyWaiterRef.current?.reject(streamError);
        readyWaiterRef.current = null;
        finalWaiterRef.current?.reject(streamError);
        finalWaiterRef.current = null;
        socketRef.current = null;
      };

      await withTimeout(readyPromise, READY_TIMEOUT_MS, '火山语音连接超时，请重试。');
      const released = releaseRef.current as { cancelled: boolean } | null;
      if (released) {
        closeSocket();
        resetCaptureState();
        if (released.cancelled) {
          trackAnalyticsEvent('voice_cancelled', { reason: 'cancelled' });
        } else {
          showError('再按住说一句。');
        }
        return;
      }

      recordingRef.current = true;
      await stream.start();
      recordingStartedAtRef.current = Date.now();
      updatePhase('recording');
      trackAnalyticsEvent('voice_started');
      maxDurationTimerRef.current = setTimeout(() => {
        void finishRecording(false);
      }, MAX_RECORDING_MS);
    } catch (caught) {
      closeSocket();
      resetCaptureState();
      showError(caught instanceof Error ? caught.message : '录音没有启动');
    }
  }, [
    audioLevel,
    closeSocket,
    createReadyWaiter,
    finishRecording,
    resetCaptureState,
    showError,
    stream,
    updatePhase,
  ]);

  const setGestureMode = useCallback((mode: VoiceGestureMode) => {
    setCancelArmed(mode === 'cancel');
    setManualArmed(mode === 'manual');
  }, []);

  const endHold = useCallback(
    (cancelled: boolean) => {
      if (phaseRef.current === 'requesting') {
        releaseRef.current = { cancelled };
        return;
      }
      if (phaseRef.current !== 'recording') return;
      setGestureMode('idle');
      void finishRecording(cancelled);
    },
    [finishRecording, setGestureMode],
  );

  const dismissOverlay = useCallback(() => {
    closeSocket();
    resetCaptureState();
    updatePhase('idle');
  }, [closeSocket, resetCaptureState, updatePhase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stream.stop();
      closeSocket();
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [closeSocket, stream]);

  return {
    phase,
    transcript,
    error,
    cancelArmed,
    manualArmed,
    audioLevel,
    startHold,
    setGestureMode,
    endHold,
    dismissOverlay,
  };
}
