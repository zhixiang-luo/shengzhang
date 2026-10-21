import { moveItem } from '@shengzhang/domain';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  NestedReorderableList,
  ScrollViewContainer,
  useIsActive,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryEditorSheet } from '../components/CategoryEditorSheet';
import { Icon } from '../components/Icon';
import {
  listCategories,
  reorderCategorySiblings,
  type CategoryRow,
} from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import { trackAnalyticsEvent } from '../services/analytics';
import { colors, radii, spacing, typography } from '../theme/tokens';

const CATEGORY_COLORS = ['#E89A96', '#D7A66F', '#9EAD98', '#91A6B5', '#9B9BB6', '#A39A91'];

interface EditorState {
  type: 'expense' | 'income';
  category: CategoryRow | null;
  parent: CategoryRow | null;
}

interface CategoryChildItemProps {
  child: CategoryRow;
  parentColor: string;
  onEdit: (child: CategoryRow) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function CategoryChildItem({
  child,
  parentColor,
  onEdit,
  onMoveUp,
  onMoveDown,
}: CategoryChildItemProps) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <View style={[styles.childRow, isActive && styles.childRowDragging]}>
      <Pressable
        accessibilityActions={[
          { name: 'moveUp', label: '上移' },
          { name: 'moveDown', label: '下移' },
        ]}
        accessibilityHint="单击编辑，长按后上下拖动排序"
        accessibilityLabel={`编辑或拖动${child.name}排序`}
        delayLongPress={400}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'moveUp') onMoveUp();
          if (event.nativeEvent.actionName === 'moveDown') onMoveDown();
        }}
        onLongPress={() => {
          void Haptics.selectionAsync();
          drag();
        }}
        onPress={() => onEdit(child)}
        style={styles.childMain}
      >
        <View style={styles.childDragAffordance}>
          <Icon name="drag" size={15} color={colors.inkTertiary} />
        </View>
        <View style={[styles.childLine, { backgroundColor: parentColor }]} />
        <Text style={styles.childName}>{child.name}</Text>
        <Text style={styles.childEdit}>编辑</Text>
      </Pressable>
    </View>
  );
}

interface CategoryChildListProps {
  items: CategoryRow[];
  parentColor: string;
  onEdit: (child: CategoryRow) => void;
  onAdd: () => void;
  onReorder: (ordered: CategoryRow[]) => void;
}

function CategoryChildList({
  items,
  parentColor,
  onEdit,
  onAdd,
  onReorder,
}: CategoryChildListProps) {
  return (
    <View style={styles.children}>
      <NestedReorderableList
        data={items}
        keyExtractor={(child) => child.id}
        onReorder={({ from, to }) => onReorder(moveItem(items, from, to))}
        panActivateAfterLongPress={450}
        renderItem={({ item: child, index }) => (
          <CategoryChildItem
            child={child}
            onEdit={onEdit}
            onMoveDown={() => {
              if (index < items.length - 1) onReorder(moveItem(items, index, index + 1));
            }}
            onMoveUp={() => {
              if (index > 0) onReorder(moveItem(items, index, index - 1));
            }}
            parentColor={parentColor}
          />
        )}
        scrollEnabled={false}
        scrollable={false}
        shouldUpdateActiveItem
      />
      <Pressable onPress={onAdd} style={styles.addChildRow}>
        <Icon name="plus" size={15} color={colors.blushDeep} />
        <Text style={styles.addChildText}>新建二级分类</Text>
      </Pressable>
    </View>
  );
}

interface CategoryRootItemProps {
  item: CategoryRow;
  childCategories: CategoryRow[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onEditChild: (child: CategoryRow) => void;
  onAddChild: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onReorderChildren: (ordered: CategoryRow[]) => void;
}

function CategoryRootItem({
  item,
  childCategories,
  expanded,
  onToggle,
  onEdit,
  onEditChild,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onReorderChildren,
}: CategoryRootItemProps) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <View style={[styles.group, isActive && styles.groupDragging]}>
      <View style={styles.rootRow}>
        <Pressable
          accessibilityActions={[
            { name: 'moveUp', label: '上移' },
            { name: 'moveDown', label: '下移' },
          ]}
          accessibilityHint="单击展开或收起，长按后上下拖动排序"
          accessibilityLabel={`展开或拖动${item.name}排序`}
          delayLongPress={400}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'moveUp') onMoveUp();
            if (event.nativeEvent.actionName === 'moveDown') onMoveDown();
          }}
          onLongPress={() => {
            void Haptics.selectionAsync();
            drag();
          }}
          onPress={onToggle}
          style={styles.rootMain}
        >
          <View style={styles.dragHandle}>
            <Icon name="drag" size={18} color={colors.inkTertiary} />
          </View>
          <View style={[styles.colorDot, { backgroundColor: item.color }]} />
          <View style={styles.rootCopy}>
            <Text style={styles.rootName}>{item.name}</Text>
            <Text style={styles.rootMeta}>
              {childCategories.length > 0 ? `${childCategories.length} 个二级分类` : '还没有二级分类'}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.inkTertiary} />
        </Pressable>
        <Pressable accessibilityLabel={`编辑${item.name}`} onPress={onEdit} style={styles.editButton}>
          <Icon name="settings" size={17} color={colors.inkTertiary} />
        </Pressable>
      </View>

      {expanded ? (
        <CategoryChildList
          items={childCategories}
          onAdd={onAddChild}
          onEdit={onEditChild}
          onReorder={onReorderChildren}
          parentColor={item.color}
        />
      ) : null}
    </View>
  );
}

export default function CategoriesScreen() {
  const db = useDatabase();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    trackAnalyticsEvent('categories_opened');
  }, []);

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

  const persistOrder = useCallback(
    (ordered: CategoryRow[]) => {
      const positions = new Map(ordered.map((category, index) => [category.id, index]));
      setCategories((current) =>
        current.map((category) =>
          positions.has(category.id)
            ? { ...category, sortOrder: positions.get(category.id) ?? category.sortOrder }
            : category,
        ),
      );
      setOrderError(null);
      try {
        if (reorderCategorySiblings(db, ordered.map((category) => category.id))) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (caught) {
        setOrderError(caught instanceof Error ? caught.message : '调整顺序失败');
        load();
      }
    },
    [db, load],
  );

  const reorderWithAccessibility = (
    category: CategoryRow,
    siblings: CategoryRow[],
    direction: -1 | 1,
  ) => {
    const index = siblings.findIndex((item) => item.id === category.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
    persistOrder(moveItem(siblings, index, targetIndex));
  };

  const renderRoot = ({ item }: { item: CategoryRow }) => (
    <CategoryRootItem
      childCategories={childrenOf(item.id)}
      expanded={expandedId === item.id}
      item={item}
      onAddChild={() => openCreate(item)}
      onEdit={() => setEditor({ type, category: item, parent: null })}
      onEditChild={(child) => setEditor({ type, category: child, parent: item })}
      onMoveDown={() => reorderWithAccessibility(item, roots, 1)}
      onMoveUp={() => reorderWithAccessibility(item, roots, -1)}
      onReorderChildren={persistOrder}
      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
    />
  );

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
        {roots.length > 1 ? (
          <Text style={styles.sortHint}>长按分类行约半秒后拖动，可调整同级顺序</Text>
        ) : null}

        <ScrollViewContainer
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {orderError ? <Text style={styles.orderError}>{orderError}</Text> : null}
          <NestedReorderableList
            data={roots}
            keyExtractor={(root) => root.id}
            onReorder={({ from, to }) => persistOrder(moveItem(roots, from, to))}
            panActivateAfterLongPress={450}
            renderItem={renderRoot}
            scrollEnabled={false}
            scrollable={false}
            shouldUpdateActiveItem
            showsVerticalScrollIndicator={false}
          />
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
        </ScrollViewContainer>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  sortHint: {
    marginTop: spacing.md,
    color: colors.inkTertiary,
    fontSize: 10,
  },
  scroll: {
    flex: 1,
  },
  orderError: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FFF4F2',
    color: colors.danger,
    fontSize: 11,
  },
  group: {
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  groupDragging: {
    zIndex: 10,
    borderColor: colors.blush,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  rootRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    width: 38,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootMain: {
    flex: 1,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingLeft: 4,
    paddingRight: spacing.lg,
  },
  childRowDragging: {
    zIndex: 10,
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  childDragAffordance: {
    width: 34,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childLine: {
    width: 14,
    height: 1,
    marginRight: 9,
  },
  childMain: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
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
