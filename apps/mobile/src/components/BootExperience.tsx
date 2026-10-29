import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { resolveBootPresentation } from '../features/boot/bootPolicy';
import {
  BOOT_INTRO_VERSION,
  BOOT_INTRO_VERSION_KEY,
  hasSeenCurrentBootIntro,
} from '../features/boot/bootState';
import { BootScreen, type BootScreenMode } from './BootScreen';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash may already be hidden in preview or test environments.
});

const BootContentReadyContext = createContext<(() => void) | null>(null);

export function BootContentReady() {
  const markReady = useContext(BootContentReadyContext);
  if (!markReady) throw new Error('BootContentReady must be used within BootExperience');

  useEffect(() => {
    const frame = requestAnimationFrame(markReady);
    return () => cancelAnimationFrame(frame);
  }, [markReady]);

  return null;
}

export function BootExperience({ children }: { children: ReactNode }) {
  const [startedAt] = useState(() => Date.now());
  const splashHiddenRef = useRef(false);
  const closingRef = useRef(false);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
  const [contentReady, setContentReady] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [fullFinished, setFullFinished] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));
  const [translateY] = useState(() => new Animated.Value(0));

  const hideNativeSplash = useCallback(() => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    void SplashScreen.hideAsync().catch(() => {
      // A hidden or unavailable splash must never block the app.
    });
  }, []);

  const markContentReady = useCallback(() => setContentReady(true), []);
  const finishFullIntro = useCallback(() => setFullFinished(true), []);

  useEffect(() => {
    let mounted = true;
    void SecureStore.getItemAsync(BOOT_INTRO_VERSION_KEY)
      .then((value) => {
        if (mounted) setHasSeenIntro(hasSeenCurrentBootIntro(value));
      })
      .catch(() => {
        if (mounted) setHasSeenIntro(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 50);
    return () => clearInterval(timer);
  }, [startedAt]);

  const presentation = useMemo(
    () =>
      hasSeenIntro === null
        ? 'waiting'
        : resolveBootPresentation({
            hasSeenIntro,
            contentReady,
            elapsedMs,
          }),
    [contentReady, elapsedMs, hasSeenIntro],
  );
  const overlayMode: BootScreenMode | null =
    presentation === 'full-intro' ? 'full' : presentation === 'bridge' ? 'bridge' : null;
  const overlayVisible = Boolean(overlayMode) && !overlayDismissed;

  useEffect(() => {
    if (hasSeenIntro !== false) return;
    void SecureStore.setItemAsync(BOOT_INTRO_VERSION_KEY, String(BOOT_INTRO_VERSION)).catch(
      () => {
        // If storage is unavailable, the animation may repeat but startup remains usable.
      },
    );
  }, [hasSeenIntro]);

  useEffect(() => {
    if (contentReady && !overlayMode) hideNativeSplash();
  }, [contentReady, hideNativeSplash, overlayMode]);

  useEffect(() => {
    const animationFinished = overlayMode === 'bridge' || fullFinished;
    if (!overlayMode || !contentReady || !animationFinished || closingRef.current) return;

    closingRef.current = true;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -24,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setOverlayDismissed(true));
  }, [contentReady, fullFinished, opacity, overlayMode, translateY]);

  return (
    <BootContentReadyContext.Provider value={markContentReady}>
      <View style={styles.root}>
        {children}
        {overlayVisible && overlayMode ? (
          <Animated.View
            onLayout={hideNativeSplash}
            style={[
              styles.overlay,
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <BootScreen
              mode={overlayMode}
              onFinish={overlayMode === 'full' ? finishFullIntro : undefined}
            />
          </Animated.View>
        ) : null}
      </View>
    </BootContentReadyContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
  },
});
