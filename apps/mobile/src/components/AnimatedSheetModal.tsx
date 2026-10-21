import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type AnimatedSheetModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  onClosed?: () => void;
  closeAccessibilityLabel: string;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
};

export function AnimatedSheetModal({
  visible,
  onRequestClose,
  onClosed,
  closeAccessibilityLabel,
  children,
  sheetStyle,
}: AnimatedSheetModalProps) {
  const { height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const mountedRef = useRef(false);
  const onClosedRef = useRef(onClosed);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    progress.stopAnimation();

    if (visible) {
      mountedRef.current = true;
      const animation = Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      const frame = requestAnimationFrame(() => {
        setMounted(true);
        animation.start();
      });
      return () => {
        cancelAnimationFrame(frame);
        animation.stop();
      };
    }

    if (!mountedRef.current) return;
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      mountedRef.current = false;
      setMounted(false);
      onClosedRef.current?.();
    });
    return () => animation.stop();
  }, [progress, visible]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  return (
    <Modal
      animationType="none"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={mounted || visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.root}
      >
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            accessibilityLabel={closeAccessibilityLabel}
            onPress={onRequestClose}
            style={styles.fill}
          />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle, { transform: [{ translateY }] }]}>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(29, 26, 24, 0.44)',
  },
  fill: {
    flex: 1,
  },
  sheet: {
    width: '100%',
  },
});
