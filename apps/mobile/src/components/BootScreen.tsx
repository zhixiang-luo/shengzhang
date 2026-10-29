import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BOOT_FULL_INTRO_MS } from '../features/boot/bootPolicy';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { BrandMark } from './BrandMark';

export type BootScreenMode = 'full' | 'bridge';

type BootScreenProps = {
  mode: BootScreenMode;
  onFinish?: () => void;
};

const WAVE_WEIGHTS = [0.36, 0.62, 1, 0.7, 0.9, 0.52, 0.34];

export function BootScreen({ mode, onFinish }: BootScreenProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [halo] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));
  const [identity] = useState(() => new Animated.Value(0));
  const [status] = useState(() => new Animated.Value(0));
  const [footer] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));
  const [statusPulse] = useState(() => new Animated.Value(0));
  const [waves] = useState(() => WAVE_WEIGHTS.map(() => new Animated.Value(0)));
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

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
    halo.setValue(0);
    ring.setValue(0);
    identity.setValue(0);
    status.setValue(0);
    footer.setValue(0);
    waves.forEach((value) => value.setValue(0));

    if (reduceMotion) {
      halo.setValue(1);
      ring.setValue(1);
      identity.setValue(1);
      status.setValue(1);
      footer.setValue(1);
      waves.forEach((value) => value.setValue(1));
      const timer = setTimeout(() => onFinishRef.current?.(), mode === 'full' ? 700 : 300);
      return () => clearTimeout(timer);
    }

    const introAnimations = [
      Animated.timing(ring, {
        toValue: 1,
        duration: mode === 'full' ? 720 : 360,
        delay: mode === 'full' ? 110 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(halo, {
        toValue: 1,
        duration: mode === 'full' ? 900 : 480,
        delay: mode === 'full' ? 300 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      ...waves.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: mode === 'full' ? 480 : 360,
          delay: mode === 'full' ? 560 + index * 42 : index * 24,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
      Animated.timing(identity, {
        toValue: 1,
        duration: mode === 'full' ? 620 : 420,
        delay: mode === 'full' ? 780 : 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(status, {
        toValue: 1,
        duration: mode === 'full' ? 540 : 340,
        delay: mode === 'full' ? 1180 : 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(footer, {
        toValue: 1,
        duration: 500,
        delay: mode === 'full' ? 1400 : 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ];
    const introAnimation = Animated.parallel(introAnimations);
    introAnimation.start();

    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    breathAnimation.start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(statusPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();

    const timer =
      mode === 'full'
        ? setTimeout(() => onFinishRef.current?.(), BOOT_FULL_INTRO_MS)
        : null;

    return () => {
      if (timer) clearTimeout(timer);
      introAnimation.stop();
      breathAnimation.stop();
      pulseAnimation.stop();
    };
  }, [breath, footer, halo, identity, mode, reduceMotion, ring, status, statusPulse, waves]);

  const plateScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.012],
  });
  const plateTranslateY = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });
  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });
  const haloScale = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1.04],
  });
  const haloOpacity = halo.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.5, 0.22],
  });
  const identityTranslate = identity.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const statusTranslate = status.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const pulseScale = statusPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1.55],
  });
  const pulseOpacity = statusPulse.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.5, 0.14, 0],
  });

  return (
    <View
      accessibilityLabel={
        mode === 'full' ? '声账正在启动' : '声账正在准备本地账本'
      }
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
      <View pointerEvents="none" style={styles.ambientOne} />
      <View pointerEvents="none" style={styles.ambientTwo} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientRing,
          {
            opacity: ring,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      <View style={styles.brandStage}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              opacity: ring,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.plate,
            {
              transform: [{ translateY: plateTranslateY }, { scale: plateScale }],
            },
          ]}
        >
          <BrandMark size={140} />
          <View pointerEvents="none" style={styles.wave}>
            {WAVE_WEIGHTS.map((weight, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height: 7 + weight * 19,
                    opacity: waves[index],
                    transform: [{ scaleY: waves[index] }],
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.identity,
          {
            opacity: identity,
            transform: [{ translateY: identityTranslate }],
          },
        ]}
      >
        <Text style={styles.wordmark}>声账</Text>
        <Text style={styles.tagline}>说一句，就记好。</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.status,
          {
            opacity: status,
            transform: [{ translateY: statusTranslate }],
          },
        ]}
      >
        <View style={styles.statusDotWrap}>
          <Animated.View
            style={[
              styles.statusPulse,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
          <View style={styles.statusDot} />
        </View>
        <Text style={styles.statusText}>正在准备你的本地账本</Text>
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity: footer }]}>
        本地优先 · 无账号也能记
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  ambientOne: {
    position: 'absolute',
    top: -118,
    right: -135,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: colors.blushSoft,
    opacity: 0.4,
  },
  ambientTwo: {
    position: 'absolute',
    bottom: -145,
    left: -165,
    width: 410,
    height: 410,
    borderRadius: 205,
    backgroundColor: colors.sageSoft,
    opacity: 0.62,
  },
  ambientRing: {
    position: 'absolute',
    top: '22%',
    width: 284,
    height: 284,
    borderWidth: 1,
    borderColor: 'rgba(157, 86, 87, 0.08)',
    borderRadius: 142,
  },
  brandStage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -44,
  },
  halo: {
    position: 'absolute',
    width: 198,
    height: 198,
    borderWidth: 1,
    borderColor: 'rgba(157, 86, 87, 0.2)',
    borderRadius: 99,
    backgroundColor: 'rgba(247, 221, 216, 0.24)',
  },
  ring: {
    position: 'absolute',
    width: 194,
    height: 194,
    borderWidth: 1,
    borderColor: 'rgba(232, 154, 150, 0.42)',
    borderRadius: 97,
  },
  plate: {
    width: 164,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(157, 86, 87, 0.13)',
    borderRadius: 82,
    backgroundColor: colors.surface,
    shadowColor: colors.blushDeep,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    elevation: 8,
  },
  wave: {
    position: 'absolute',
    bottom: 10,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.blush,
  },
  identity: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  wordmark: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 42,
    fontWeight: '600',
    letterSpacing: 7,
  },
  tagline: {
    marginTop: 5,
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 2,
  },
  status: {
    position: 'absolute',
    bottom: 122,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 253, 248, 0.78)',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 25,
    elevation: 4,
  },
  statusDotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.blushDeep,
  },
  statusPulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: colors.blushDeep,
    borderRadius: 4,
  },
  statusText: {
    color: colors.inkSecondary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 72,
    color: colors.inkTertiary,
    fontSize: 9,
    letterSpacing: 1.4,
  },
});
