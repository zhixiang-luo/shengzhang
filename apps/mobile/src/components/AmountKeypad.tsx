import type { AmountKey } from '@shengzhang/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';
import { Icon } from './Icon';

type AmountKeypadProps = {
  onKey: (key: AmountKey) => void;
  onDelete: () => void;
};

const ROWS: AmountKey[][] = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['.', '0', '+'],
];

const LABELS: Partial<Record<AmountKey, string>> = {
  '/': '÷',
  '*': '×',
  '-': '−',
  '+': '+',
};

export function AmountKeypad({ onKey, onDelete }: AmountKeypadProps) {
  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const operator = key === '+' || key === '-' || key === '*' || key === '/';
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={operator ? `运算${LABELS[key]}` : key}
                onPress={() => onKey(key)}
                style={({ pressed }) => [
                  styles.key,
                  operator && styles.operatorKey,
                  pressed && styles.pressedKey,
                ]}
              >
                <Text style={[styles.keyText, operator && styles.operatorText]}>
                  {LABELS[key] ?? key}
                </Text>
              </Pressable>
            );
          })}
          {rowIndex === 3 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="删除一位"
              onPress={onDelete}
              style={({ pressed }) => [
                styles.key,
                styles.deleteKey,
                pressed && styles.pressedKey,
              ]}
            >
              <Icon name="back" size={21} color={colors.inkSecondary} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.canvas,
  },
  row: {
    flexDirection: 'row',
    gap: 7,
  },
  key: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  operatorKey: {
    borderColor: 'transparent',
    backgroundColor: colors.blushSoft,
  },
  deleteKey: {
    borderColor: 'transparent',
    backgroundColor: colors.surfaceSunken,
  },
  pressedKey: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  keyText: {
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 20,
    fontWeight: '600',
  },
  operatorText: {
    color: colors.blushDeep,
    fontSize: 22,
  },
});
