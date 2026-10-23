import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';
import { BrandMark } from './BrandMark';

const WAVE_WEIGHTS = [0.42, 0.68, 1, 0.74, 0.9, 0.56, 0.36];

export function BootScreen() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1.08],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
  });

  return (
    <View
      accessibilityLabel="声账正在准备本地账本"
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
      <View style={[styles.ambient, styles.ambientTop]} />
      <View style={[styles.ambient, styles.ambientBottom]} />

      <View style={styles.brandStage}>
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
        <View style={styles.brandPlate}>
          <BrandMark size={92} />
        </View>
        <View style={styles.wave}>
          {WAVE_WEIGHTS.map((weight, index) => (
            <View
              key={index}
              style={[styles.waveBar, { height: 8 + weight * 18 }]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.wordmark}>声账</Text>
      <Text style={styles.tagline}>说一句，就记好。</Text>

      <View style={styles.statusCard}>
        <ActivityIndicator color={colors.blushDeep} size="small" />
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>正在准备你的本地账本</Text>
          <Text style={styles.statusBody}>账单、分类和设置都留在你的设备上。</Text>
        </View>
      </View>

      <Text style={styles.footer}>本地优先 · 无账号也能记</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  ambient: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.blushSoft,
    opacity: 0.4,
  },
  ambientTop: {
    top: -110,
    right: -90,
    width: 270,
    height: 270,
  },
  ambientBottom: {
    bottom: -140,
    left: -120,
    width: 320,
    height: 320,
    backgroundColor: colors.sageSoft,
    opacity: 0.58,
  },
  brandStage: {
    width: 184,
    height: 184,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 172,
    height: 172,
    borderRadius: 86,
    borderWidth: 1,
    borderColor: colors.blush,
    backgroundColor: colors.blushSoft,
  },
  brandPlate: {
    width: 142,
    height: 142,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(157, 86, 87, 0.12)',
    borderRadius: 71,
    backgroundColor: colors.surface,
    shadowColor: colors.blushDeep,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
  wave: {
    position: 'absolute',
    bottom: 1,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.blush,
  },
  wordmark: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: 5,
  },
  tagline: {
    marginTop: 4,
    color: colors.inkSecondary,
    fontSize: 13,
    letterSpacing: 1.4,
  },
  statusCard: {
    width: '100%',
    maxWidth: 330,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 253, 248, 0.86)',
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBody: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 54,
    color: colors.inkTertiary,
    fontSize: 10,
    letterSpacing: 1,
  },
});
