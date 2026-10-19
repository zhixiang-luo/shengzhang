import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listCategories } from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import { createVoiceBatch } from '../db/transactionRepository';
import { resolveVoiceEntries } from '../features/voice/voiceMapping';
import { parseVoiceAudio } from '../services/voiceApi';
import { useVoiceResultStore } from '../stores/voiceResultStore';
import { colors, spacing, typography } from '../theme/tokens';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';

const VOICE_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
};

type VoiceActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onManualEntry: () => void;
  onSaved: () => void;
};

type DragDirection = 'idle' | 'cancel' | 'manual';
type Phase = 'preparing' | 'recording' | 'uploading' | 'error';

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function removeRecording(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup should never block the user flow.
  }
}

export function VoiceActionSheet({
  visible,
  onClose,
  onManualEntry,
  onSaved,
}: VoiceActionSheetProps) {
  const db = useDatabase();
  const recorder = useAudioRecorder(VOICE_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [translateX] = useState(() => new Animated.Value(0));
  const [direction, setDirection] = useState<DragDirection>('idle');
  const [phase, setPhase] = useState<Phase>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    let disposed = false;

    const begin = async () => {
      if (startingRef.current) return;
      startingRef.current = true;
      try {
        const existing = await getRecordingPermissionsAsync();
        const permission = existing.granted ? existing : await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          if (!disposed) {
            setError('请允许声账使用麦克风，或改用手动记账。');
            setPhase('error');
          }
          return;
        }

        await recorder.prepareToRecordAsync();
        if (disposed) return;
        recorder.record({ forDuration: 30 });
        setPhase('recording');
        setError(null);
      } catch (caught) {
        if (!disposed) {
          setError(caught instanceof Error ? caught.message : '录音没有启动');
          setPhase('error');
        }
      } finally {
        startingRef.current = false;
      }
    };

    void begin();
    return () => {
      disposed = true;
      if (recorder.isRecording) void recorder.stop();
      removeRecording(recorder.uri);
    };
  }, [attempt, recorder, visible]);

  const discardAndClose = useCallback(async () => {
    setDirection('idle');
    translateX.setValue(0);
    if (recorder.isRecording) {
      try {
        await recorder.stop();
      } catch {
        // The sheet still closes if the native recorder already stopped.
      }
    }
    removeRecording(recorder.uri);
    onClose();
  }, [onClose, recorder, translateX]);

  const openManual = useCallback(() => {
    void discardAndClose();
    requestAnimationFrame(onManualEntry);
  }, [discardAndClose, onManualEntry]);

  const finishAndParse = useCallback(async () => {
    if (phase !== 'recording') return;
    setPhase('uploading');
    setError(null);
    let audioUri: string | null = null;

    try {
      await recorder.stop();
      audioUri = recorder.uri;
      if (!audioUri) throw new Error('没有拿到录音文件');

      const categories = listCategories(db);
      const response = await parseVoiceAudio(audioUri, categories);
      const entries = resolveVoiceEntries(response, categories);
      createVoiceBatch(db, {
        requestId: response.requestId,
        transcript: response.transcript,
        entries,
      });
      useVoiceResultStore.getState().setResult({
        requestId: response.requestId,
        transcript: response.transcript,
        entries,
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '语音识别失败');
      setPhase('error');
    } finally {
      removeRecording(audioUri);
    }
  }, [db, onClose, onSaved, phase, recorder]);

  const retry = () => {
    setError(null);
    setPhase('preparing');
    setAttempt((value) => value + 1);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          phase === 'recording' &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          const limited = Math.max(-170, Math.min(170, gesture.dx));
          translateX.setValue(limited);
          setDirection(limited < -44 ? 'cancel' : limited > 44 ? 'manual' : 'idle');
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -80) return void discardAndClose();
          if (gesture.dx > 80) return openManual();
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 220,
          }).start();
          setDirection('idle');
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setDirection('idle');
        },
      }),
    [discardAndClose, openManual, phase, translateX],
  );

  const metering = recorderState.metering ?? -45;
  const level = Math.max(0.18, Math.min(1, (metering + 60) / 55));
  const title =
    phase === 'preparing'
      ? '正在准备麦克风'
      : phase === 'uploading'
        ? '正在整理账单'
        : phase === 'error'
          ? '这次没有记上'
          : direction === 'cancel'
            ? '松手取消'
            : direction === 'manual'
              ? '去手动记一笔'
              : '我在听，请说';

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => void discardAndClose()}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <BrandMark size={32} />
            <View>
              <Text style={styles.brandName}>声账</Text>
              <Text style={styles.brandCaption}>语音记账</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="关闭语音记账"
            onPress={() => void discardAndClose()}
            style={styles.closeButton}
          >
            <Icon name="close" size={20} color="rgba(255, 250, 245, 0.72)" />
          </Pressable>
        </View>

        <View style={styles.body} {...panResponder.panHandlers}>
          <Animated.View style={[styles.dragSurface, { transform: [{ translateX }] }]}>
            <Text style={styles.eyebrow}>VOICE TO LEDGER</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {phase === 'recording'
                ? '说完点一下圆钮；左滑取消，右滑手动记账'
                : phase === 'error'
                  ? error
                  : '金额、分类和日期会自动整理'}
            </Text>

            {phase === 'error' ? (
              <View style={styles.errorActions}>
                <Pressable onPress={retry} style={styles.retryButton}>
                  <Text style={styles.retryText}>重新录音</Text>
                </Pressable>
                <Pressable onPress={openManual} style={styles.manualButton}>
                  <Text style={styles.manualText}>手动记一笔</Text>
                </Pressable>
              </View>
            ) : phase === 'uploading' || phase === 'preparing' ? (
              <View style={styles.processing}>
                <ActivityIndicator color={colors.blush} size="large" />
                <Text style={styles.processingText}>
                  {phase === 'uploading' ? '正在识别并生成账单…' : '正在打开麦克风…'}
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  accessibilityLabel="完成录音并识别"
                  onPress={() => void finishAndParse()}
                  style={[
                    styles.micOrb,
                    direction === 'cancel' && styles.micOrbCancel,
                    direction === 'manual' && styles.micOrbManual,
                  ]}
                >
                  <View style={styles.stopSquare} />
                </Pressable>

                <View style={styles.waveform}>
                  {[12, 22, 38, 56, 72, 90, 72, 54, 36, 24, 14].map((height, index) => (
                    <View
                      key={`${height}-${index}`}
                      style={[
                        styles.waveBar,
                        { height: Math.max(6, height * (0.55 + level * 0.55)) },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.duration}>{formatDuration(recorderState.durationMillis)}</Text>
                <Text style={styles.hint}>
                  {direction === 'cancel'
                    ? '松手取消这句话'
                    : direction === 'manual'
                      ? '松手进入手动记账'
                      : '点击圆钮完成 · 向左滑取消 · 向右滑手动记账'}
                </Text>
              </>
            )}
          </Animated.View>

          {phase === 'recording' ? (
            <View style={styles.swipeGuide}>
              <Pressable onPress={() => void discardAndClose()} style={styles.guideSide}>
                <Icon name="chevron-left" size={18} color="rgba(255, 250, 245, 0.54)" />
                <Text style={styles.guideText}>取消</Text>
              </Pressable>
              <Pressable onPress={openManual} style={styles.guideSide}>
                <Text style={styles.guideText}>手动记一笔</Text>
                <Icon name="chevron-right" size={18} color="rgba(255, 250, 245, 0.54)" />
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={styles.serviceNote}>
          {error ? '录音仅用于本次识别，不会保存。' : '当前接入 mock 解析服务，用于验证完整语音入账流程。'}
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1B19',
  },
  topBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandName: {
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 16,
  },
  brandCaption: {
    marginTop: 1,
    color: 'rgba(255, 250, 245, 0.44)',
    fontSize: 9,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 250, 245, 0.08)',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  dragSurface: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  eyebrow: {
    color: 'rgba(232, 154, 150, 0.88)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    marginTop: spacing.md,
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 31,
    letterSpacing: -0.8,
  },
  subtitle: {
    maxWidth: 310,
    marginTop: spacing.sm,
    color: 'rgba(255, 250, 245, 0.48)',
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  micOrb: {
    width: 126,
    height: 126,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 34,
    borderRadius: 63,
    backgroundColor: colors.blush,
    borderWidth: 8,
    borderColor: 'rgba(232, 154, 150, 0.16)',
  },
  micOrbCancel: {
    backgroundColor: '#C8A39D',
    transform: [{ scale: 0.94 }],
  },
  micOrbManual: {
    backgroundColor: colors.sand,
  },
  stopSquare: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  waveform: {
    height: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 27,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 250, 245, 0.44)',
  },
  duration: {
    marginTop: 1,
    color: colors.surface,
    fontFamily: typography.number,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    marginTop: spacing.md,
    color: 'rgba(255, 250, 245, 0.58)',
    fontSize: 12,
  },
  processing: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  processingText: {
    color: 'rgba(255, 250, 245, 0.54)',
    fontSize: 12,
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxxl,
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: colors.blush,
  },
  retryText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  manualButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 250, 245, 0.16)',
    borderRadius: 999,
  },
  manualText: {
    color: 'rgba(255, 250, 245, 0.68)',
    fontSize: 13,
  },
  swipeGuide: {
    position: 'absolute',
    right: spacing.xxl,
    bottom: 40,
    left: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  guideSide: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
  },
  guideText: {
    color: 'rgba(255, 250, 245, 0.5)',
    fontSize: 11,
  },
  serviceNote: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    color: 'rgba(255, 250, 245, 0.28)',
    fontSize: 9,
    textAlign: 'center',
  },
});
