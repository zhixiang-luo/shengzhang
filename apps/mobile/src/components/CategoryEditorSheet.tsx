import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createCategory,
  moveCategory,
  renameCategory,
  setCategoryArchived,
  type CategoryRow,
} from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import { colors, spacing, typography } from '../theme/tokens';
import { Icon } from './Icon';

type CategoryEditorSheetProps = {
  type: 'expense' | 'income';
  category: CategoryRow | null;
  parent: CategoryRow | null;
  suggestedColor: string;
  onClose: () => void;
  onChanged: () => void;
};

export function CategoryEditorSheet({
  type,
  category,
  parent,
  suggestedColor,
  onClose,
  onChanged,
}: CategoryEditorSheetProps) {
  const db = useDatabase();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(category);

  const save = () => {
    try {
      if (category) {
        renameCategory(db, category.id, name);
      } else {
        createCategory(db, {
          name,
          type,
          parentId: parent?.id ?? null,
          color: suggestedColor,
        });
      }
      onChanged();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存分类失败');
    }
  };

  const toggleHidden = () => {
    if (!category) return;
    try {
      setCategoryArchived(db, category.id, !category.isArchived);
      onChanged();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '更新分类失败');
    }
  };

  const move = (direction: -1 | 1) => {
    if (!category) return;
    try {
      moveCategory(db, category.id, direction);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '调整顺序失败');
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="overFullScreen" transparent visible>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <Pressable accessibilityLabel="关闭分类编辑" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{editing ? '编辑分类' : parent ? '新建二级分类' : '新建一级分类'}</Text>
          <Text style={styles.caption}>
            {parent ? `归属：${parent.name}` : '一级分类会出现在记账页的横向分类栏。'}
          </Text>

          <TextInput
            accessibilityLabel="分类名称"
            autoFocus
            maxLength={12}
            onChangeText={(value) => {
              setName(value);
              setError(null);
            }}
            placeholder="分类名称，1–12 个字"
            placeholderTextColor={colors.inkTertiary}
            selectionColor={colors.blushDeep}
            style={styles.input}
            value={name}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {category ? (
            <>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>同级排序</Text>
                <Pressable onPress={() => move(-1)} style={styles.orderButton}>
                  <Icon name="chevron-left" size={14} color={colors.inkSecondary} />
                  <Text style={styles.orderText}>上移</Text>
                </Pressable>
                <Pressable onPress={() => move(1)} style={styles.orderButton}>
                  <Text style={styles.orderText}>下移</Text>
                  <Icon name="chevron-right" size={14} color={colors.inkSecondary} />
                </Pressable>
              </View>
              <Pressable onPress={toggleHidden} style={styles.hiddenButton}>
                <Text style={styles.hiddenText}>{category.isArchived ? '恢复显示分类' : '隐藏这个分类'}</Text>
                <Text style={styles.hiddenHint}>
                  {category.isArchived ? '恢复后会重新出现在新增账单中' : '历史账单会保留，只从新增选择中隐藏'}
                </Text>
              </Pressable>
            </>
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable onPress={save} style={styles.save}>
              <Text style={styles.saveText}>{editing ? '保存修改' : '创建分类'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
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
  sheet: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.canvas,
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  title: {
    marginTop: spacing.xl,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 25,
  },
  caption: {
    marginTop: 6,
    color: colors.inkSecondary,
    fontSize: 12,
  },
  input: {
    height: 52,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 15,
  },
  error: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 11,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  orderLabel: {
    flex: 1,
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  orderButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
  },
  orderText: {
    color: colors.inkSecondary,
    fontSize: 11,
  },
  hiddenButton: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: '#FFF4F2',
  },
  hiddenText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  hiddenHint: {
    marginTop: 4,
    color: colors.inkTertiary,
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancel: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.surfaceSunken,
  },
  cancelText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  save: {
    flex: 1.4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  saveText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
