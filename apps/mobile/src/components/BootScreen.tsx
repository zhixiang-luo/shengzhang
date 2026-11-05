import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BOOT_FULL_INTRO_MS, BOOT_QUICK_INTRO_MS } from '../features/boot/bootPolicy';
import { colors, radii, spacing, typography } from '../theme/tokens';

export type BootScreenMode = 'full' | 'quick';

type BootScreenProps = {
  mode: BootScreenMode;
  onFinish?: () => void;
};

const WAVE_BARS = [
  { weight: 0.36, opacity: 0.42 },
  { weight: 0.62, opacity: 0.58 },
  { weight: 1, opacity: 0.88 },
  { weight: 0.7, opacity: 0.72 },
  { weight: 0.9, opacity: 0.82 },
  { weight: 0.52, opacity: 0.55 },
  { weight: 0.34, opacity: 0.4 },
];

export function BootScreen({ mode, onFinish }: BootScreenProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [halo] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));
  const [identity] = useState(() => new Animated.Value(0));
  const [status] = useState(() => new Animated.Value(0));
  const [footer] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));
  const [statusPulse] = useState(() => new Animated.Value(0));
  const [waves] = useState(() => WAVE_BARS.map(() => new Animated.Value(1)));
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
    waves.forEach((value) => value.setValue(1));

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

    waves.forEach((value) => value.setValue(mode === 'full' ? 0.84 : 0.92));

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

    const timer = setTimeout(
      () => onFinishRef.current?.(),
      mode === 'full' ? BOOT_FULL_INTRO_MS : BOOT_QUICK_INTRO_MS,
    );

    return () => {
      clearTimeout(timer);
      introAnimation.stop();
      breathAnimation.stop();
      pulseAnimation.stop();
    };
  }, [breath, footer, halo, identity, mode, reduceMotion, ring, status, statusPulse, waves]);

  const wordmarkScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });
  const wordmarkTranslateY = breath.interpolate({
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
      accessibilityLabel="声账正在启动"
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
            styles.wordmarkStage,
            {
              transform: [{ translateY: wordmarkTranslateY }, { scale: wordmarkScale }],
            },
          ]}
        >
          <Text style={styles.bootWordmark}>声账</Text>
          <View pointerEvents="none" style={styles.wave}>
            {WAVE_BARS.map(({ weight, opacity }, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height: 4 + weight * 8,
                    opacity: waves[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, opacity],
                    }),
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
    width: 280,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  halo: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderWidth: 1,
    borderColor: 'rgba(157, 86, 87, 0.2)',
    borderRadius: 112,
    backgroundColor: 'rgba(247, 221, 216, 0.24)',
  },
  ring: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderWidth: 1,
    borderColor: 'rgba(232, 154, 150, 0.42)',
    borderRadius: 107,
  },
  wordmarkStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.blush,
  },
  identity: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  bootWordmark: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 44,
    fontWeight: '600',
    letterSpacing: 8,
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
