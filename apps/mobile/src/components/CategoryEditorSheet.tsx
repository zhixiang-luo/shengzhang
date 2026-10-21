import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type ScrollViewInstance,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createCategory,
  renameCategory,
  setCategoryArchived,
  type CategoryRow,
} from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import { colors, spacing, typography } from '../theme/tokens';
import { AnimatedSheetModal } from './AnimatedSheetModal';

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
  const [sheetVisible, setSheetVisible] = useState(true);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputOffsetRef = useRef(0);
  const inputFocusedRef = useRef(false);
  const editing = Boolean(category);
  const requestClose = useCallback(() => setSheetVisible(false), []);

  const revealInput = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, inputOffsetRef.current - 16),
        animated: true,
      });
    }, Platform.OS === 'ios' ? 60 : 120);
  }, []);

  useEffect(() => {
    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSubscription = Keyboard.addListener(eventName, () => {
      if (!inputFocusedRef.current) return;
      revealInput();
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      inputFocusedRef.current = false;
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [revealInput]);

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
      requestClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存分类失败');
    }
  };

  const toggleHidden = () => {
    if (!category) return;
    try {
      setCategoryArchived(db, category.id, !category.isArchived);
      onChanged();
      requestClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '更新分类失败');
    }
  };

  return (
    <AnimatedSheetModal
      closeAccessibilityLabel="关闭分类编辑"
      onClosed={onClose}
      onRequestClose={requestClose}
      sheetStyle={styles.sheet}
      visible={sheetVisible}
    >
          <View style={styles.handle} />
          <ScrollView
            ref={scrollRef}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.sheetScroll}
          >
            <Text style={styles.title}>{editing ? '编辑分类' : parent ? '新建二级分类' : '新建一级分类'}</Text>
            <Text style={styles.caption}>
              {parent ? `归属：${parent.name}` : '一级分类会出现在记账页的横向分类栏。'}
            </Text>

            <View
              onLayout={(event) => {
                inputOffsetRef.current = event.nativeEvent.layout.y;
              }}
            >
              <TextInput
                accessibilityLabel="分类名称"
                autoFocus
                maxLength={12}
                onBlur={() => {
                  inputFocusedRef.current = false;
                }}
                onChangeText={(value) => {
                  setName(value);
                  setError(null);
                }}
                onFocus={() => {
                  inputFocusedRef.current = true;
                  revealInput();
                }}
                placeholder="分类名称，1–12 个字"
                placeholderTextColor={colors.inkTertiary}
                selectionColor={colors.blushDeep}
                style={styles.input}
                value={name}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {category ? (
              <Pressable onPress={toggleHidden} style={styles.hiddenButton}>
                <Text style={styles.hiddenText}>{category.isArchived ? '恢复显示分类' : '隐藏这个分类'}</Text>
                <Text style={styles.hiddenHint}>
                  {category.isArchived ? '恢复后会重新出现在新增账单中' : '历史账单会保留，只从新增选择中隐藏'}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.actions}>
              <Pressable onPress={requestClose} style={styles.cancel}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable onPress={save} style={styles.save}>
                <Text style={styles.saveText}>{editing ? '保存修改' : '创建分类'}</Text>
              </Pressable>
            </View>
          </ScrollView>
    </AnimatedSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '92%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.canvas,
  },
  sheetContent: {
    flexGrow: 0,
  },
  sheetScroll: {
    flexShrink: 1,
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
