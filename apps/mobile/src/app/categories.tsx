import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryEditorSheet } from '../components/CategoryEditorSheet';
import { Icon } from '../components/Icon';
import { listCategories, type CategoryRow } from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import { colors, radii, spacing, typography } from '../theme/tokens';

const CATEGORY_COLORS = ['#E89A96', '#D7A66F', '#9EAD98', '#91A6B5', '#9B9BB6', '#A39A91'];

interface EditorState {
  type: 'expense' | 'income';
  category: CategoryRow | null;
  parent: CategoryRow | null;
}

export default function CategoriesScreen() {
  const db = useDatabase();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const load = useCallback(() => {
    setCategories(listCategories(db, true));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const roots = useMemo(
    () =>
      categories
        .filter((category) => category.type === type && category.parentId === null && !category.isArchived)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories, type],
  );

  const hidden = useMemo(
    () => categories.filter((category) => category.type === type && category.isArchived),
    [categories, type],
  );

  const childrenOf = (parentId: string) =>
    categories
      .filter((category) => category.parentId === parentId && !category.isArchived)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const suggestedColor =
    CATEGORY_COLORS[categories.filter((category) => category.type === type && category.parentId === null).length % CATEGORY_COLORS.length];

  const openCreate = (parent: CategoryRow | null) => {
    setEditor({ type, category: null, parent });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="返回">
          <Icon name="back" size={20} color={colors.inkSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>分类管理</Text>
        <Pressable onPress={() => openCreate(null)} style={styles.headerButton} accessibilityLabel="新建一级分类">
          <Icon name="plus" size={21} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.segment}>
          {(['expense', 'income'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setType(value)}
              style={[styles.segmentItem, type === value && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, type === value && styles.segmentTextActive]}>
                {value === 'expense' ? '支出分类' : '收入分类'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {roots.map((root) => {
            const expanded = expandedId === root.id;
            const children = childrenOf(root.id);
            return (
              <View key={root.id} style={styles.group}>
                <View style={styles.rootRow}>
                  <Pressable
                    onPress={() => setExpandedId(expanded ? null : root.id)}
                    style={styles.rootMain}
                  >
                    <View style={[styles.colorDot, { backgroundColor: root.color }]} />
                    <View style={styles.rootCopy}>
                      <Text style={styles.rootName}>{root.name}</Text>
                      <Text style={styles.rootMeta}>
                        {children.length > 0 ? `${children.length} 个二级分类` : '还没有二级分类'}
                      </Text>
                    </View>
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={colors.inkTertiary}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`编辑${root.name}`}
                    onPress={() => setEditor({ type, category: root, parent: null })}
                    style={styles.editButton}
                  >
                    <Icon name="settings" size={17} color={colors.inkTertiary} />
                  </Pressable>
                </View>

                {expanded ? (
                  <View style={styles.children}>
                    {children.map((child) => (
                      <Pressable
                        key={child.id}
                        onPress={() => setEditor({ type, category: child, parent: root })}
                        style={styles.childRow}
                      >
                        <View style={[styles.childLine, { backgroundColor: root.color }]} />
                        <Text style={styles.childName}>{child.name}</Text>
                        <Text style={styles.childEdit}>编辑</Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => openCreate(root)} style={styles.addChildRow}>
                      <Icon name="plus" size={15} color={colors.blushDeep} />
                      <Text style={styles.addChildText}>在「{root.name}」下新建二级分类</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}

          {hidden.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>已隐藏</Text>
              <View style={styles.hiddenGroup}>
                {hidden.map((category, index) => {
                  const parent = category.parentId
                    ? categories.find((item) => item.id === category.parentId) ?? null
                    : null;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setEditor({ type, category, parent })}
                      style={[styles.hiddenRow, index < hidden.length - 1 && styles.hiddenDivider]}
                    >
                      <Text style={styles.hiddenName}>{category.name}</Text>
                      <Text style={styles.hiddenMeta}>{parent ? `${parent.name} / 二级` : '一级分类'}</Text>
                      <Text style={styles.restoreText}>恢复</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>

      {editor ? (
        <CategoryEditorSheet
          category={editor.category}
          parent={editor.parent}
          suggestedColor={suggestedColor}
          type={editor.type}
          onChanged={load}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 21,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceSunken,
  },
  segmentItem: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.inkTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.ink,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
  },
  group: {
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  rootRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rootMain: {
    flex: 1,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rootCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  rootName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  rootMeta: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  editButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  children: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#FCF9F3',
  },
  childRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 38,
    paddingRight: spacing.lg,
  },
  childLine: {
    width: 14,
    height: 1,
    marginRight: 9,
  },
  childName: {
    flex: 1,
    color: colors.inkSecondary,
    fontSize: 12,
  },
  childEdit: {
    color: colors.inkTertiary,
    fontSize: 10,
  },
  addChildRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 38,
  },
  addChildText: {
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  hiddenGroup: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  hiddenRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  hiddenDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hiddenName: {
    flex: 1,
    color: colors.inkSecondary,
    fontSize: 12,
  },
  hiddenMeta: {
    marginRight: spacing.md,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  restoreText: {
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
  },
});
