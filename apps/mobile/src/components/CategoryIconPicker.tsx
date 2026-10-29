import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CATEGORY_ICON_OPTIONS,
  normalizeCategoryIcon,
  type CategoryIconName,
} from '../features/categories/categoryIcons';
import { colors, spacing } from '../theme/tokens';
import { CategoryIcon } from './CategoryIcon';

type CategoryIconPickerProps = {
  value: string;
  color: string;
  onChange: (icon: CategoryIconName) => void;
};

export function CategoryIconPicker({ value, color, onChange }: CategoryIconPickerProps) {
  const selected = normalizeCategoryIcon(value);
  const selectedLabel =
    CATEGORY_ICON_OPTIONS.find((option) => option.value === selected)?.label ?? '其他';

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <Text style={styles.label}>图标</Text>
        <Text style={styles.selectedLabel}>{selectedLabel}</Text>
      </View>
      <View
        accessibilityRole="radiogroup"
        onTouchStart={Keyboard.dismiss}
        style={styles.grid}
      >
        {CATEGORY_ICON_OPTIONS.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              accessibilityLabel={`选择${option.label}图标`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.item,
                {
                  borderColor: isSelected ? color : colors.border,
                  backgroundColor: isSelected ? `${color}1C` : colors.surface,
                },
              ]}
            >
              <CategoryIcon
                color={isSelected ? color : colors.inkSecondary}
                icon={option.value}
                size={21}
                strokeWidth={isSelected ? 2 : 1.65}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.xl,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedLabel: {
    color: colors.inkTertiary,
    fontSize: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  item: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
  },
});
