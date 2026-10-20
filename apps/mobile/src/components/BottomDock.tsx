import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveVoiceGestureMode, type VoiceGestureMode } from '../features/voice/gesture';
import { colors } from '../theme/tokens';
import { Icon } from './Icon';

type BottomDockProps = {
  active: 'ledger' | 'stats';
  voiceActive?: boolean;
  onVoiceStart: () => void;
  onVoiceModeChange: (mode: VoiceGestureMode) => void;
  onVoiceEnd: (cancelled: boolean) => void;
  onVoiceManual: () => void;
};

export function BottomDock({
  active,
  voiceActive = false,
  onVoiceStart,
  onVoiceModeChange,
  onVoiceEnd,
  onVoiceManual,
}: BottomDockProps) {
  const insets = useSafeAreaInsets();
  const [pressing, setPressing] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [manualArmed, setManualArmed] = useState(false);
  const modeRef = useRef<VoiceGestureMode>('idle');
  const callbacksRef = useRef({
    onVoiceStart,
    onVoiceModeChange,
    onVoiceEnd,
    onVoiceManual,
  });
  callbacksRef.current = {
    onVoiceStart,
    onVoiceModeChange,
    onVoiceEnd,
    onVoiceManual,
  };
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          modeRef.current = 'idle';
          setPressing(true);
          setCancelArmed(false);
          setManualArmed(false);
          callbacksRef.current.onVoiceModeChange('idle');
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          callbacksRef.current.onVoiceStart();
        },
        onPanResponderMove: (_, gesture) => {
          const nextMode = resolveVoiceGestureMode(modeRef.current, gesture.dx, gesture.dy);
          if (nextMode !== modeRef.current) {
            modeRef.current = nextMode;
            setCancelArmed(nextMode === 'cancel');
            setManualArmed(nextMode === 'manual');
            callbacksRef.current.onVoiceModeChange(nextMode);
            if (__DEV__) console.info('[voice] gesture mode', { mode: nextMode, dx: gesture.dx, dy: gesture.dy });
            void Haptics.selectionAsync();
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const finalMode = resolveVoiceGestureMode(modeRef.current, gesture.dx, gesture.dy);
          setPressing(false);
          setCancelArmed(false);
          setManualArmed(false);
          callbacksRef.current.onVoiceModeChange('idle');
          if (__DEV__) console.info('[voice] gesture released', { mode: finalMode, dx: gesture.dx, dy: gesture.dy });
          if (finalMode === 'manual') {
            callbacksRef.current.onVoiceEnd(true);
            requestAnimationFrame(callbacksRef.current.onVoiceManual);
            return;
          }
          callbacksRef.current.onVoiceEnd(finalMode === 'cancel');
        },
        onPanResponderTerminate: () => {
          setPressing(false);
          setCancelArmed(false);
          setManualArmed(false);
          callbacksRef.current.onVoiceModeChange('idle');
          callbacksRef.current.onVoiceEnd(true);
        },
      }),
    [],
  );

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: active === 'ledger' }}
          onPress={() => router.replace('/')}
          style={styles.item}
        >
          <Icon name="ledger" color={active === 'ledger' ? colors.blushDeep : colors.inkTertiary} size={21} />
          <Text style={[styles.label, active === 'ledger' && styles.activeLabel]}>账本</Text>
        </Pressable>

        <View style={styles.centerSpace} />

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: active === 'stats' }}
          onPress={() => router.replace('/stats')}
          style={styles.item}
        >
          <Icon name="chart" color={active === 'stats' ? colors.blushDeep : colors.inkTertiary} size={21} />
          <Text style={[styles.label, active === 'stats' && styles.activeLabel]}>统计</Text>
        </Pressable>
      </View>

      <View
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel="语音记账"
        accessibilityHint="按住说话，松手记账，上滑取消"
        style={[
          styles.voice,
          (pressing || voiceActive) && styles.voicePressed,
          cancelArmed && styles.voiceCancel,
          manualArmed && styles.voiceManual,
        ]}
      >
        <Icon name="mic" color={colors.surface} size={27} strokeWidth={2} />
        <View style={styles.voiceDot} />
      </View>
      <Text
        style={[
          styles.voiceLabel,
          cancelArmed && styles.voiceCancelLabel,
          manualArmed && styles.voiceManualLabel,
        ]}
      >
        {cancelArmed ? '松手取消' : manualArmed ? '松手手动记账' : '按住说'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(255, 253, 248, 0.96)',
    paddingHorizontal: 48,
    paddingTop: 9,
  },
  item: {
    width: 78,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.blushDeep,
  },
  centerSpace: {
    width: 92,
  },
  voice: {
    position: 'absolute',
    bottom: 34,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: colors.blushDeep,
    borderWidth: 5,
    borderColor: colors.canvas,
    shadowColor: colors.blushDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    elevation: 8,
  },
  voicePressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: colors.ink,
  },
  voiceCancel: {
    transform: [{ scale: 0.9 }],
    backgroundColor: colors.danger,
  },
  voiceManual: {
    backgroundColor: colors.sand,
  },
  voiceLabel: {
    position: 'absolute',
    bottom: 13,
    right: 0,
    left: 0,
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  voiceDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sand,
    borderWidth: 2,
    borderColor: colors.blushDeep,
  },
  voiceCancelLabel: {
    color: colors.danger,
  },
  voiceManualLabel: {
    color: colors.sand,
  },
});
