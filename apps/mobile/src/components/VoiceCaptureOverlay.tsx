import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { VoiceCapturePhase } from '../features/voice/useVoiceCapture';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { Icon } from './Icon';

type VoiceCaptureOverlayProps = {
  phase: VoiceCapturePhase;
  transcript: string;
  error: string | null;
  cancelArmed: boolean;
  manualArmed: boolean;
  audioLevel: Animated.Value;
  onDismiss: () => void;
};

export function VoiceCaptureOverlay({
  phase,
  transcript,
  error,
  cancelArmed,
  manualArmed,
  audioLevel,
  onDismiss,
}: VoiceCaptureOverlayProps) {
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (phase !== 'recording') {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.09,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [phase, pulse]);

  if (phase === 'idle') return null;

  if (phase === 'permission-ready') {
    return (
      <View pointerEvents="box-none" style={styles.noticeRoot}>
        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Icon name="mic" size={18} color={colors.surface} strokeWidth={2} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>麦克风已经准备好</Text>
            <Text style={styles.noticeDescription}>再按住底部按钮说一句，就可以开始记账。</Text>
          </View>
          <Pressable
            accessibilityLabel="关闭麦克风提示"
            hitSlop={10}
            onPress={onDismiss}
            style={styles.noticeClose}
          >
            <Icon name="close" size={16} color={colors.inkTertiary} />
          </Pressable>
        </View>
      </View>
    );
  }

  const title =
    phase === 'requesting'
      ? '正在打开麦克风'
      : phase === 'processing'
        ? '正在整理账单'
        : phase === 'error'
          ? '这次没有听清'
          : cancelArmed
            ? '松手取消'
            : manualArmed
              ? '松手进入手动记账'
              : '正在听，请说';

  return (
    <View accessibilityViewIsModal style={styles.root}>
      <Pressable accessible={false} onPress={() => {}} style={styles.backdrop} />
      <View
        pointerEvents="none"
        style={[
          styles.card,
          cancelArmed && styles.cancelCard,
          manualArmed && styles.manualCard,
        ]}
      >
        <View style={styles.heading}>
          <Animated.View
            style={[
              styles.mic,
              cancelArmed && styles.cancelMic,
              manualArmed && styles.manualMic,
              {
                transform: [
                  { scale: Animated.add(pulse, Animated.multiply(audioLevel, 0.08)) },
                ],
              },
            ]}
          >
            <Icon
              name={phase === 'error' ? 'close' : 'mic'}
              size={19}
              color={colors.surface}
              strokeWidth={2}
            />
          </Animated.View>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>声账 · 按住说话</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          {phase === 'requesting' || phase === 'processing' ? (
            <ActivityIndicator color={colors.blushDeep} />
          ) : null}
        </View>

        {phase === 'error' ? (
          <Text style={styles.error}>{error ?? '请再按住说一句。'}</Text>
        ) : (
          <View style={styles.transcriptBox}>
            {phase === 'recording' && !transcript ? (
              <View style={[styles.caret, styles.caretLeading]} />
            ) : null}
            <Text style={[styles.transcript, !transcript && styles.placeholder]}>
              {transcript ||
                (phase === 'processing'
                  ? '完整录音已收到，正在生成账本草稿…'
                  : '比如：“午饭二十五，打车十八”')}
            </Text>
            {phase === 'recording' && transcript ? (
              <View style={[styles.caret, styles.caretTrailing]} />
            ) : null}
          </View>
        )}

        {phase === 'recording' ? (
          <>
            <View style={styles.waveform}>
              {[0.35, 0.55, 0.9, 0.7, 1.15, 0.82, 1, 0.62, 0.88, 0.48, 0.3].map((weight, index) => (
                <VoiceWaveBar key={index} level={audioLevel} weight={weight} />
              ))}
            </View>
            <View style={styles.guideRow}>
              <View style={[styles.guide, cancelArmed && styles.guideCancel]}>
                <View style={[styles.guideIcon, styles.guideIconUp]}>
                  <Icon name="chevron-left" size={13} color={colors.blush} />
                </View>
                <Text style={[styles.guideText, cancelArmed && styles.cancelHint]}>
                  {cancelArmed ? '松手取消' : '上滑取消'}
                </Text>
              </View>
              <View style={[styles.guide, manualArmed && styles.guideManual]}>
                <Text style={[styles.guideText, manualArmed && styles.manualHint]}>
                  {manualArmed ? '松手手动记账' : '右滑手动记账'}
                </Text>
                <View style={styles.guideIcon}>
                  <Icon name="chevron-right" size={13} color={colors.sand} />
                </View>
              </View>
            </View>
            <Text style={[styles.releaseHint, cancelArmed && styles.cancelHint]}>
              {cancelArmed
                ? '不会生成账单 · 下滑可继续说话'
                : manualArmed
                  ? '不会生成语音账单'
                  : '松手后整理账本'}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

function VoiceWaveBar({ level, weight }: { level: Animated.Value; weight: number }) {
  const scaleY = level.interpolate({
    inputRange: [0, 1],
    outputRange: [0.14, Math.min(1, weight)],
  });
  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          transform: [{ scaleY }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  noticeRoot: {
    position: 'absolute',
    right: 0,
    bottom: 108,
    left: 0,
    zIndex: 40,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  noticeCard: {
    width: '100%',
    maxWidth: 390,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 253, 248, 0.98)',
    shadowColor: '#3f3329',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.blushDeep,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  noticeDescription: {
    marginTop: 3,
    color: colors.inkSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  noticeClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surfaceSunken,
  },
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(30, 27, 25, 0.46)',
  },
  card: {
    width: '100%',
    maxWidth: 390,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 250, 245, 0.12)',
    borderRadius: radii.xl,
    backgroundColor: 'rgba(31, 28, 26, 0.98)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 18,
  },
  cancelCard: {
    borderColor: 'rgba(232, 154, 150, 0.5)',
  },
  manualCard: {
    borderColor: 'rgba(225, 189, 123, 0.58)',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mic: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.blushDeep,
  },
  cancelMic: {
    backgroundColor: colors.danger,
  },
  manualMic: {
    backgroundColor: colors.sand,
  },
  headingCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  eyebrow: {
    color: 'rgba(255, 250, 245, 0.42)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 3,
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  transcriptBox: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 250, 245, 0.07)',
  },
  transcript: {
    flexShrink: 1,
    color: colors.surface,
    fontSize: 17,
    lineHeight: 27,
  },
  placeholder: {
    color: 'rgba(255, 250, 245, 0.38)',
  },
  caret: {
    width: 2,
    height: 20,
    marginTop: 4,
    borderRadius: 1,
    backgroundColor: colors.blush,
  },
  caretLeading: {
    marginRight: 4,
  },
  caretTrailing: {
    marginLeft: 3,
  },
  error: {
    minHeight: 76,
    marginTop: spacing.xl,
    color: 'rgba(255, 250, 245, 0.72)',
    fontSize: 14,
    lineHeight: 23,
  },
  waveform: {
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.md,
  },
  waveBar: {
    height: 64,
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(232, 154, 150, 0.72)',
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  guide: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 250, 245, 0.1)',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 250, 245, 0.08)',
  },
  guideCancel: {
    borderColor: 'rgba(232, 154, 150, 0.38)',
    backgroundColor: 'rgba(232, 154, 150, 0.18)',
  },
  guideManual: {
    borderColor: 'rgba(225, 189, 123, 0.5)',
    backgroundColor: 'rgba(225, 189, 123, 0.16)',
  },
  guideIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideIconUp: {
    transform: [{ rotate: '90deg' }],
  },
  guideText: {
    color: 'rgba(255, 250, 245, 0.48)',
    fontSize: 11,
  },
  releaseHint: {
    marginTop: spacing.sm,
    color: 'rgba(255, 250, 245, 0.52)',
    fontSize: 11,
    textAlign: 'center',
  },
  cancelHint: {
    color: colors.blush,
    fontWeight: '700',
  },
  manualHint: {
    color: colors.sand,
    fontWeight: '700',
  },
});
