import {
  appendAmountKey,
  deleteAmountKey,
  evaluateAmountExpressionToCents,
  formatAmountExpression,
  type AmountKey,
  type TransactionType,
} from '@shengzhang/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type ScrollViewInstance,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountKeypad } from '../components/AmountKeypad';
import { AnimatedSheetModal } from '../components/AnimatedSheetModal';
import { CategoryIcon } from '../components/CategoryIcon';
import { CategoryIconPicker } from '../components/CategoryIconPicker';
import { DateTimePickerSheet } from '../components/DateTimePickerSheet';
import { Icon } from '../components/Icon';
import { createCategory, listCategories, type CategoryRow } from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import {
  createTransaction,
  findTransaction,
  softDeleteTransaction,
  updateTransaction,
} from '../db/transactionRepository';
import {
  normalizeCategoryIcon,
  resolveCategoryIcon,
  type CategoryIconName,
} from '../features/categories/categoryIcons';
import { shouldAutoOpenAmountKeypad } from '../features/entry/entryInteraction';
import { trackAnalyticsEvent } from '../services/analytics';
import { useUndoDeleteStore } from '../stores/undoStore';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDayHeading, formatTime, localDateKey } from '../utils/date';

const NEW_CATEGORY_COLORS = ['#E89A96', '#D7A66F', '#9EAD98', '#91A6B5', '#9B9BB6', '#A39A91'];

function dateWithTime(date: Date, template: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    template.getHours(),
    template.getMinutes(),
    template.getSeconds(),
  );
}

interface EntryInitialState {
  categories: CategoryRow[];
  type: TransactionType;
  amount: string;
  note: string;
  occurredAt: Date;
  categoryId: string | null;
  subcategoryId: string | null;
  error: string | null;
  ready: boolean;
}

function loadEntryState(db: ReturnType<typeof useDatabase>, editingId: string | null): EntryInitialState {
  const now = new Date();
  try {
    const categories = listCategories(db);
    if (!editingId) {
      const root = categories.find((category) => category.type === 'expense' && category.parentId === null);
      const firstChild = root ? categories.find((category) => category.parentId === root.id) : null;
      return {
        categories,
        type: 'expense',
        amount: '',
        note: '',
        occurredAt: now,
        categoryId: root?.id ?? null,
        subcategoryId: firstChild?.id ?? null,
        error: null,
        ready: true,
      };
    }

    const transaction = findTransaction(db, editingId);
    if (!transaction) {
      return {
        categories,
        type: 'expense',
        amount: '',
        note: '',
        occurredAt: now,
        categoryId: null,
        subcategoryId: null,
        error: '这笔账单已经不存在',
        ready: false,
      };
    }
    const occurredAt = new Date(transaction.occurredAt);
    return {
      categories,
      type: transaction.type,
      amount: (transaction.amountMinor / 100).toFixed(2).replace(/\.00$/, ''),
      note: transaction.note,
      occurredAt,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      error: null,
      ready: true,
    };
  } catch (caught) {
    return {
      categories: [],
      type: 'expense',
      amount: '',
      note: '',
      occurredAt: now,
      categoryId: null,
      subcategoryId: null,
      error: caught instanceof Error ? caught.message : '分类读取失败',
      ready: false,
    };
  }
}

export default function EntryScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : null;
  const [initial] = useState(() => loadEntryState(db, editingId));

  const [allCategories, setAllCategories] = useState(initial.categories);
  const ready = initial.ready;
  const [type, setType] = useState<TransactionType>(initial.type);
  const [amount, setAmount] = useState(initial.amount);
  const [note, setNote] = useState(initial.note);
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt);
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(initial.subcategoryId);
  const [error, setError] = useState<string | null>(initial.error);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState<CategoryIconName>('other');
  const [newCategoryLevel, setNewCategoryLevel] = useState<'root' | 'sub'>('root');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [amountKeypadVisible, setAmountKeypadVisible] = useState(() =>
    shouldAutoOpenAmountKeypad(editingId),
  );
  const scrollRef = useRef<ScrollViewInstance>(null);
  const noteOffsetRef = useRef(0);
  const noteFocusedRef = useRef(false);
  const categorySheetScrollRef = useRef<ScrollViewInstance>(null);
  const categoryNameOffsetRef = useRef(0);
  const categoryInputFocusedRef = useRef(false);

  useEffect(() => {
    trackAnalyticsEvent('manual_entry_opened');
  }, []);

  const rootCategories = useMemo(
    () => allCategories.filter((category) => category.type === type && category.parentId === null),
    [allCategories, type],
  );

  const selectedRoot = rootCategories.find((category) => category.id === categoryId) ?? null;
  const subcategories = useMemo(
    () => allCategories.filter((category) => category.parentId === categoryId),
    [allCategories, categoryId],
  );
  const newCategoryColor =
    selectedRoot?.color ??
    NEW_CATEGORY_COLORS[
      allCategories.filter((category) => category.type === type && category.parentId === null)
        .length % NEW_CATEGORY_COLORS.length
    ];
  const displayedAmount = amount ? formatAmountExpression(amount) : '0.00';
  const amountFontSize =
    amount.length >= 18 ? 20 : amount.length >= 14 ? 24 : amount.length >= 10 ? 28 : 36;

  const changeType = (nextType: TransactionType) => {
    const nextRoots = allCategories.filter(
      (category) => category.type === nextType && category.parentId === null,
    );
    const nextRoot = nextRoots[0] ?? null;
    const nextChild = nextRoot
      ? allCategories.find((category) => category.parentId === nextRoot.id)
      : null;
    setType(nextType);
    setCategoryId(nextRoot?.id ?? null);
    setSubcategoryId(nextChild?.id ?? null);
  };

  const selectRoot = (category: CategoryRow) => {
    const firstChild = allCategories.find((candidate) => candidate.parentId === category.id);
    setCategoryId(category.id);
    setSubcategoryId(firstChild?.id ?? null);
  };

  const openCategoryModal = () => {
    setNewCategoryName('');
    const nextLevel = categoryId ? 'sub' : 'root';
    setNewCategoryLevel(nextLevel);
    setNewCategoryIcon(
      resolveCategoryIcon({
        parentIcon: nextLevel === 'sub' ? selectedRoot?.icon : null,
      }),
    );
    setCategoryError(null);
    categoryInputFocusedRef.current = false;
    setCategoryModalVisible(true);
  };

  const closeCategoryModal = () => {
    categoryInputFocusedRef.current = false;
    setCategoryModalVisible(false);
  };

  const saveNewCategory = () => {
    try {
      const parentId = newCategoryLevel === 'sub' ? categoryId : null;
      if (newCategoryLevel === 'sub' && !parentId) {
        setCategoryError('请先选择一个一级分类');
        return;
      }
      const created = createCategory(db, {
        name: newCategoryName,
        type,
        parentId,
        color: newCategoryColor,
        icon: newCategoryIcon,
      });
      const nextCategories = listCategories(db);
      setAllCategories(nextCategories);
      if (parentId) {
        setCategoryId(parentId);
        setSubcategoryId(created.id);
      } else {
        setCategoryId(created.id);
        setSubcategoryId(null);
      }
      closeCategoryModal();
      setCategoryError(null);
    } catch (caught) {
      setCategoryError(caught instanceof Error ? caught.message : '分类创建失败');
    }
  };

  const applyQuickDate = (daysAgo: number) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const next = dateWithTime(date, occurredAt);
    setOccurredAt(next);
  };

  const save = () => {
    const amountMinor = evaluateAmountExpressionToCents(amount);
    if (!amountMinor) {
      setError('请输入有效金额或算式');
      return;
    }
    if (!categoryId) {
      setError('请选择分类');
      return;
    }
    try {
      const input = {
        type,
        amountMinor,
        categoryId,
        subcategoryId,
        occurredAt: occurredAt.toISOString(),
        note,
      };
      if (editingId) {
        updateTransaction(db, editingId, input);
        trackAnalyticsEvent('transaction_updated');
      } else {
        createTransaction(db, input);
        trackAnalyticsEvent('manual_transaction_created');
      }
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败');
    }
  };

  const appendAmount = (key: AmountKey) => {
    setAmount((current) => appendAmountKey(current, key));
    setError(null);
  };

  const focusAmount = () => {
    noteFocusedRef.current = false;
    categoryInputFocusedRef.current = false;
    Keyboard.dismiss();
    setAmountKeypadVisible(true);
  };

  const focusNote = () => {
    noteFocusedRef.current = true;
    categoryInputFocusedRef.current = false;
    setAmountKeypadVisible(false);
  };

  const focusCategoryName = () => {
    noteFocusedRef.current = false;
    categoryInputFocusedRef.current = true;
    setAmountKeypadVisible(false);
    setTimeout(() => {
      categorySheetScrollRef.current?.scrollTo({
        y: Math.max(0, categoryNameOffsetRef.current - 16),
        animated: true,
      });
    }, Platform.OS === 'ios' ? 60 : 120);
  };

  useEffect(() => {
    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const subscription = Keyboard.addListener(eventName, () => {
      if (noteFocusedRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, noteOffsetRef.current - 84),
            animated: true,
          });
        }, Platform.OS === 'ios' ? 60 : 0);
      }
      if (categoryInputFocusedRef.current) {
        setTimeout(() => {
          categorySheetScrollRef.current?.scrollTo({
            y: Math.max(0, categoryNameOffsetRef.current - 16),
            animated: true,
          });
        }, Platform.OS === 'ios' ? 60 : 0);
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      noteFocusedRef.current = false;
      categoryInputFocusedRef.current = false;
    });
    return () => {
      subscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const blurNote = () => {
    noteFocusedRef.current = false;
  };

  const confirmDelete = () => {
    if (!editingId) return;
    Alert.alert('删除这笔账单？', '删除后，账本和统计会立即更新。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          const deleted = findTransaction(db, editingId);
          if (deleted) useUndoDeleteStore.getState().setDeleted(deleted);
          softDeleteTransaction(db, editingId);
          trackAnalyticsEvent('transaction_deleted');
          router.back();
        },
      },
    ]);
  };

  const [nowSnapshot] = useState(() => new Date());
  const quickDates: { label: string; key: string; days: number }[] = useMemo(() => {
    const dateAt = (daysAgo: number) =>
      new Date(nowSnapshot.getFullYear(), nowSnapshot.getMonth(), nowSnapshot.getDate() - daysAgo);
    return [
      { label: '今天', key: localDateKey(dateAt(0)), days: 0 },
      { label: '昨天', key: localDateKey(dateAt(1)), days: 1 },
      { label: '前天', key: localDateKey(dateAt(2)), days: 2 },
    ];
  }, [nowSnapshot]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="关闭">
            <Icon name="close" size={20} color={colors.inkSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>{editingId ? '编辑账单' : '记一笔'}</Text>
          <Pressable
            onPress={save}
            disabled={!ready}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, !ready && styles.disabled]}
          >
            <Text style={styles.saveText}>保存</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setAmountKeypadVisible(false)}
          onTouchStart={() => setAmountKeypadVisible(false)}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.segment}>
            {(['expense', 'income'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => changeType(value)}
                style={[styles.segmentItem, type === value && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, type === value && styles.segmentTextActive]}>
                  {value === 'expense' ? '支出' : '收入'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.amountSection}>
            <Pressable
              accessibilityLabel={type === 'expense' ? '输入支出金额' : '输入收入金额'}
              hitSlop={12}
              onPress={focusAmount}
              style={styles.amountLabelButton}
            >
              <Text style={styles.amountLabel}>{type === 'expense' ? '花了多少' : '收到多少'}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`金额${displayedAmount}`}
              accessibilityRole="button"
              onPress={focusAmount}
              style={({ pressed }) => [
                styles.amountCard,
                amountKeypadVisible && styles.amountCardActive,
                pressed && styles.amountCardPressed,
              ]}
            >
              <View style={styles.amountInputRow}>
                <Text style={styles.amountCurrency}>¥</Text>
                <View style={styles.amountValueRow}>
                  <Text
                    maxFontSizeMultiplier={1}
                    numberOfLines={1}
                    style={[
                      styles.amountExpression,
                      !amount && styles.amountExpressionPlaceholder,
                      { fontSize: amountFontSize, lineHeight: amountFontSize + 6 },
                    ]}
                  >
                    {displayedAmount}
                  </Text>
                  {amountKeypadVisible ? (
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={[
                        styles.amountCaret,
                        { height: Math.max(24, amountFontSize * 0.82) },
                      ]}
                    />
                  ) : null}
                </View>
              </View>
              <Text style={styles.amountHint}>支持 + − × ÷ 计算，保存时自动得出金额</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionLabel, styles.sectionLabelInHeading]}>分类</Text>
            <Pressable onPress={openCategoryModal} style={styles.newCategoryButton}>
              <Icon name="plus" size={14} color={colors.blushDeep} strokeWidth={2} />
              <Text style={styles.newCategoryText}>新建分类</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            contentContainerStyle={styles.rootCategoryRow}
            showsHorizontalScrollIndicator={false}
          >
            {rootCategories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => selectRoot(category)}
                  style={[
                    styles.rootCategory,
                    selected && { borderColor: category.color, backgroundColor: `${category.color}18` },
                  ]}
                >
                  <View style={[styles.rootCategoryIcon, { backgroundColor: `${category.color}18` }]}>
                    <CategoryIcon
                      color={category.color}
                      icon={category.icon}
                      size={15}
                      strokeWidth={1.7}
                    />
                  </View>
                  <Text style={[styles.rootCategoryText, selected && { color: colors.ink }]}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {subcategories.length > 0 ? (
            <View style={styles.subcategoryWrap}>
              {subcategories.map((category) => {
                const selected = category.id === subcategoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setSubcategoryId(category.id)}
                    style={[styles.subcategory, selected && styles.subcategorySelected]}
                  >
                    <CategoryIcon
                      color={selected ? colors.blushDeep : colors.inkTertiary}
                      icon={category.icon}
                      size={14}
                      strokeWidth={1.7}
                    />
                    <Text style={[styles.subcategoryText, selected && styles.subcategoryTextSelected]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>时间</Text>
          <View style={styles.quickDates}>
            {quickDates.map(({ label, key, days }) => (
              <Pressable
                key={label}
                onPress={() => applyQuickDate(days)}
                style={[
                  styles.quickDate,
                  localDateKey(occurredAt) === key && styles.quickDateSelected,
                ]}
              >
                <Text
                  style={[
                    styles.quickDateText,
                    localDateKey(occurredAt) === key && styles.quickDateTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityLabel="选择日期和时间"
            onPress={() => setDatePickerVisible(true)}
            style={styles.dateCard}
          >
            <View style={styles.dateCardIcon}>
              <Icon name="calendar" size={20} color={colors.blushDeep} />
            </View>
            <View style={styles.dateCardCopy}>
              <Text style={styles.dateCardLabel}>{formatDayHeading(occurredAt)}</Text>
              <Text style={styles.dateCardHint}>点击打开月历，精确选择日期和时间</Text>
            </View>
            <Text style={styles.dateCardTime}>{formatTime(occurredAt.toISOString())}</Text>
            <Icon name="chevron-right" size={16} color={colors.inkTertiary} />
          </Pressable>

          <View
            style={styles.noteField}
            onLayout={(event) => {
              noteOffsetRef.current = event.nativeEvent.layout.y;
            }}
          >
            <View style={styles.noteHeading}>
              <Text style={styles.noteLabel}>备注</Text>
              <Text style={styles.noteOptional}>选填</Text>
            </View>
            <TextInput
              accessibilityLabel="备注"
              blurOnSubmit
              maxLength={40}
              onBlur={blurNote}
              onChangeText={setNote}
              onFocus={focusNote}
              placeholder="写点备注，例如：和朋友聚餐"
              placeholderTextColor={colors.inkTertiary}
              returnKeyType="done"
              style={styles.noteInput}
              value={note}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {editingId ? (
            <Pressable onPress={confirmDelete} style={styles.deleteButton}>
              <Icon name="trash" size={17} color={colors.danger} />
              <Text style={styles.deleteText}>删除这笔账单</Text>
            </Pressable>
          ) : null}

          <Text style={styles.privacy}>账单保存在本机。语音和云备份将在后续阶段接入。</Text>
        </ScrollView>
        {amountKeypadVisible ? (
          <AmountKeypad onKey={appendAmount} onDelete={() => setAmount(deleteAmountKey)} />
        ) : null}
      </KeyboardAvoidingView>

      <DateTimePickerSheet
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          setOccurredAt(date);
          setDatePickerVisible(false);
        }}
        value={occurredAt}
        visible={datePickerVisible}
      />

      <AnimatedSheetModal
        closeAccessibilityLabel="关闭新建分类"
        onRequestClose={closeCategoryModal}
        sheetStyle={styles.categorySheet}
        visible={categoryModalVisible}
      >
        <View style={styles.sheetHandle} />
        <ScrollView
          ref={categorySheetScrollRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.categorySheetContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.categorySheetScroll}
        >
              <Text style={styles.sheetTitle}>新建分类</Text>
              <Text style={styles.sheetCaption}>新分类会保存在本机，并立即出现在分类选择中。</Text>

              <View style={styles.sheetSegment}>
                <Pressable
                  onPress={() => {
                    setNewCategoryLevel('root');
                    setNewCategoryIcon('other');
                  }}
                  style={[
                    styles.sheetSegmentItem,
                    newCategoryLevel === 'root' && styles.sheetSegmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetSegmentText,
                      newCategoryLevel === 'root' && styles.sheetSegmentTextActive,
                    ]}
                  >
                    一级分类
                  </Text>
                </Pressable>
                <Pressable
                  disabled={!selectedRoot}
                  onPress={() => {
                    setNewCategoryLevel('sub');
                    setNewCategoryIcon(
                      resolveCategoryIcon({
                        parentIcon: selectedRoot?.icon,
                      }),
                    );
                  }}
                  style={[
                    styles.sheetSegmentItem,
                    newCategoryLevel === 'sub' && styles.sheetSegmentActive,
                    !selectedRoot && styles.sheetSegmentDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetSegmentText,
                      newCategoryLevel === 'sub' && styles.sheetSegmentTextActive,
                    ]}
                  >
                    {selectedRoot ? `在「${selectedRoot.name}」下` : '二级分类'}
                  </Text>
                </Pressable>
              </View>

              <View
                onLayout={(event) => {
                  categoryNameOffsetRef.current = event.nativeEvent.layout.y;
                }}
              >
                <TextInput
                  accessibilityLabel="新分类名称"
                  autoFocus
                  maxLength={12}
                  onBlur={() => {
                    categoryInputFocusedRef.current = false;
                  }}
                  onChangeText={(value) => {
                    setNewCategoryName(value);
                    setCategoryError(null);
                  }}
                  onFocus={focusCategoryName}
                  placeholder="例如：夜宵、通勤、宠物零食"
                  placeholderTextColor={colors.inkTertiary}
                  selectionColor={colors.blushDeep}
                  style={styles.categoryNameInput}
                  value={newCategoryName}
                />
              </View>
              <CategoryIconPicker
                color={newCategoryColor}
                onChange={(icon) => {
                  setNewCategoryIcon(normalizeCategoryIcon(icon));
                  setCategoryError(null);
                }}
                value={newCategoryIcon}
              />
              {categoryError ? <Text style={styles.categoryModalError}>{categoryError}</Text> : null}

              <View style={styles.sheetActions}>
                <Pressable onPress={closeCategoryModal} style={styles.sheetCancel}>
                  <Text style={styles.sheetCancelText}>取消</Text>
                </Pressable>
                <Pressable onPress={saveNewCategory} style={styles.sheetSave}>
                  <Icon name="plus" size={16} color={colors.surface} />
                  <Text style={styles.sheetSaveText}>添加分类</Text>
                </Pressable>
              </View>
        </ScrollView>
      </AnimatedSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
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
    fontSize: 20,
  },
  saveButton: {
    minWidth: 64,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  saveText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
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
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  segmentText: {
    color: colors.inkTertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.ink,
  },
  amountSection: {
    marginTop: spacing.xxl,
    paddingBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  amountLabel: {
    color: colors.inkSecondary,
    fontSize: 12,
  },
  amountLabelButton: {
    alignSelf: 'flex-start',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountValueRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountCard: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountCardPressed: {
    opacity: 0.82,
  },
  amountCardActive: {
    borderColor: colors.blushDeep,
  },
  amountCurrency: {
    color: colors.blushDeep,
    fontFamily: typography.number,
    fontSize: 28,
  },
  amountExpression: {
    flexShrink: 1,
    marginLeft: 8,
    overflow: 'hidden',
    color: colors.ink,
    fontFamily: typography.number,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    includeFontPadding: false,
  },
  amountExpressionPlaceholder: {
    color: colors.inkTertiary,
  },
  amountCaret: {
    width: 2,
    marginLeft: 3,
    borderRadius: 2,
    backgroundColor: colors.blushDeep,
  },
  amountHint: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    color: colors.inkTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionLabelInHeading: {
    marginTop: 0,
    marginBottom: 0,
  },
  newCategoryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  newCategoryText: {
    color: colors.blushDeep,
    fontSize: 11,
    fontWeight: '700',
  },
  rootCategoryRow: {
    gap: 8,
    paddingRight: spacing.xl,
  },
  rootCategory: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  rootCategoryIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  rootCategoryText: {
    color: colors.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  subcategoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
  },
  subcategory: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subcategorySelected: {
    borderColor: colors.blushDeep,
    backgroundColor: colors.blushSoft,
  },
  subcategoryText: {
    color: colors.inkSecondary,
    fontSize: 12,
  },
  subcategoryTextSelected: {
    color: colors.blushDeep,
    fontWeight: '700',
  },
  quickDates: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDate: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDateSelected: {
    borderColor: colors.blushDeep,
    backgroundColor: colors.blushSoft,
  },
  quickDateText: {
    color: colors.inkSecondary,
    fontSize: 12,
  },
  quickDateTextSelected: {
    color: colors.blushDeep,
    fontWeight: '700',
  },
  dateCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  dateCardIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.blushSoft,
  },
  dateCardCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  dateCardLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  dateCardHint: {
    marginTop: 4,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  dateCardTime: {
    marginRight: 7,
    color: colors.blushDeep,
    fontFamily: typography.number,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  noteField: {
    marginTop: spacing.xxl,
  },
  noteHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  noteLabel: {
    color: colors.inkTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  noteOptional: {
    color: colors.inkTertiary,
    fontSize: 10,
  },
  noteInput: {
    height: 50,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  error: {
    marginTop: spacing.lg,
    color: colors.danger,
    fontSize: 12,
  },
  deleteButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: spacing.xxxl,
    borderRadius: 14,
    backgroundColor: '#FFF4F2',
  },
  deleteText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  privacy: {
    marginTop: spacing.xl,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  categorySheet: {
    maxHeight: '92%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.canvas,
  },
  categorySheetContent: {
    flexGrow: 0,
    paddingBottom: 34,
  },
  categorySheetScroll: {
    flexShrink: 1,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sheetTitle: {
    marginTop: spacing.xl,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 25,
  },
  sheetCaption: {
    marginTop: 6,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
  sheetSegment: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xl,
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceSunken,
  },
  sheetSegmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  sheetSegmentActive: {
    backgroundColor: colors.surface,
  },
  sheetSegmentDisabled: {
    opacity: 0.4,
  },
  sheetSegmentText: {
    color: colors.inkTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  sheetSegmentTextActive: {
    color: colors.ink,
  },
  categoryNameInput: {
    height: 52,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 15,
  },
  categoryModalError: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 11,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  sheetCancel: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.surfaceSunken,
  },
  sheetCancelText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sheetSave: {
    flex: 1.35,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  sheetSaveText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
