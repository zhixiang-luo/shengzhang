import { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme/tokens';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';

type VoiceActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onManualEntry: () => void;
};

type DragDirection = 'idle' | 'cancel' | 'manual';

export function VoiceActionSheet({ visible, onClose, onManualEntry }: VoiceActionSheetProps) {
  const [translateX] = useState(() => new Animated.Value(0));
  const [direction, setDirection] = useState<DragDirection>('idle');

  const closeSheet = useCallback(() => {
    translateX.setValue(0);
    setDirection('idle');
    onClose();
  }, [onClose, translateX]);

  const openManual = useCallback(() => {
    closeSheet();
    requestAnimationFrame(onManualEntry);
  }, [closeSheet, onManualEntry]);

  const finishGesture = useCallback(
    (nextDirection: DragDirection) => {
    if (nextDirection === 'cancel') {
      closeSheet();
      return;
    }
    if (nextDirection === 'manual') {
      openManual();
      return;
    }
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();
    setDirection('idle');
    },
    [closeSheet, openManual, translateX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          const limited = Math.max(-170, Math.min(170, gesture.dx));
          translateX.setValue(limited);
          setDirection(limited < -44 ? 'cancel' : limited > 44 ? 'manual' : 'idle');
        },
        onPanResponderRelease: (_, gesture) => {
          const nextDirection = gesture.dx < -80 ? 'cancel' : gesture.dx > 80 ? 'manual' : 'idle';
          finishGesture(nextDirection);
        },
        onPanResponderTerminate: () => finishGesture('idle'),
      }),
    [finishGesture, translateX],
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={closeSheet}
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
          <Pressable onPress={closeSheet} style={styles.closeButton} accessibilityLabel="关闭语音记账">
            <Icon name="close" size={20} color="rgba(255, 250, 245, 0.72)" />
          </Pressable>
        </View>

        <View style={styles.body} {...panResponder.panHandlers}>
          <Animated.View style={[styles.dragSurface, { transform: [{ translateX }] }]}>
            <Text style={styles.eyebrow}>VOICE TO LEDGER</Text>
            <Text style={styles.title}>
              {direction === 'cancel'
                ? '松手取消'
                : direction === 'manual'
                  ? '去手动记一笔'
                  : '按住，说一句'}
            </Text>
            <Text style={styles.subtitle}>例如：午饭 25，打车 18</Text>

            <View
              style={[
                styles.micOrb,
                direction === 'cancel' && styles.micOrbCancel,
                direction === 'manual' && styles.micOrbManual,
              ]}
            >
              <Icon
                name={direction === 'manual' ? 'plus' : 'mic'}
                size={50}
                color={colors.ink}
                strokeWidth={1.7}
              />
            </View>

            <View style={styles.waveform}>
              {[12, 22, 38, 56, 72, 90, 72, 54, 36, 24, 14].map((height, index) => (
                <View key={`${height}-${index}`} style={[styles.waveBar, { height }]} />
              ))}
            </View>

            <Text style={styles.hint}>
              {direction === 'cancel'
                ? '松手取消这句话'
                : direction === 'manual'
                  ? '松手进入手动记账'
                  : '向左滑取消 · 向右滑手动记账'}
            </Text>
          </Animated.View>

          <View style={styles.swipeGuide}>
            <Pressable onPress={closeSheet} style={styles.guideSide}>
              <Icon name="chevron-left" size={18} color="rgba(255, 250, 245, 0.54)" />
              <Text style={styles.guideText}>取消</Text>
            </Pressable>
            <Pressable onPress={openManual} style={styles.guideSide}>
              <Text style={styles.guideText}>手动记一笔</Text>
              <Icon name="chevron-right" size={18} color="rgba(255, 250, 245, 0.54)" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.serviceNote}>语音识别服务将在下一阶段接入，当前可先体验滑动入口。</Text>
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
    marginTop: spacing.sm,
    color: 'rgba(255, 250, 245, 0.48)',
    fontSize: 12,
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
  waveform: {
    height: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 33,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 250, 245, 0.36)',
  },
  hint: {
    marginTop: spacing.md,
    color: 'rgba(255, 250, 245, 0.58)',
    fontSize: 12,
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
