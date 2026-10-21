import type { ReactNode } from 'react';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/tokens';
import { Icon } from './Icon';

export function SwipeableDeleteRow({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  return (
    <ReanimatedSwipeable
      childrenContainerStyle={styles.children}
      containerStyle={styles.container}
      // Require a deliberate horizontal swipe so shallow diagonal scroll gestures stay with the list.
      dragOffsetFromLeft={24}
      dragOffsetFromRight={-24}
      friction={2}
      overshootRight={false}
      overshootFriction={8}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="删除账单"
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteAction, pressed && styles.deleteActionPressed]}
        >
          <Icon name="trash" size={19} color={colors.surface} strokeWidth={2} />
          <Text style={styles.deleteText}>删除</Text>
        </Pressable>
      )}
      rightThreshold={52}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  children: {
    backgroundColor: colors.surface,
  },
  deleteAction: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.danger,
  },
  deleteActionPressed: {
    opacity: 0.78,
  },
  deleteText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
});
