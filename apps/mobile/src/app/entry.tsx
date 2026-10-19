import { parseYuanToCents, type TransactionType } from '@shengzhang/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { listCategories, type CategoryRow } from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import {
  createTransaction,
  findTransaction,
  softDeleteTransaction,
  updateTransaction,
} from '../db/transactionRepository';
import { colors, spacing, typography } from '../theme/tokens';
import { dateFromDayInput, formatDateInput, localDateKey } from '../utils/date';

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
  dateInput: string;
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
        dateInput: formatDateInput(now),
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
        dateInput: formatDateInput(now),
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
      dateInput: formatDateInput(occurredAt),
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
      dateInput: formatDateInput(now),
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

  const allCategories = initial.categories;
  const ready = initial.ready;
  const [type, setType] = useState<TransactionType>(initial.type);
  const [amount, setAmount] = useState(initial.amount);
  const [note, setNote] = useState(initial.note);
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt);
  const [dateInput, setDateInput] = useState(initial.dateInput);
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(initial.subcategoryId);
  const [error, setError] = useState<string | null>(initial.error);

  const rootCategories = useMemo(
    () => allCategories.filter((category) => category.type === type && category.parentId === null),
    [allCategories, type],
  );

  const selectedRoot = rootCategories.find((category) => category.id === categoryId) ?? null;
  const subcategories = useMemo(
    () => allCategories.filter((category) => category.parentId === categoryId),
    [allCategories, categoryId],
  );

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

  const applyQuickDate = (daysAgo: number) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const next = dateWithTime(date, occurredAt);
    setOccurredAt(next);
    setDateInput(formatDateInput(next));
  };

  const commitDateInput = (value: string) => {
    setDateInput(value);
    const parsed = dateFromDayInput(value);
    if (parsed) setOccurredAt(dateWithTime(parsed, occurredAt));
  };

  const save = () => {
    const amountMinor = parseYuanToCents(amount);
    if (!amountMinor) {
      setError('请输入大于 0 的金额');
      return;
    }
    if (!categoryId) {
      setError('请选择分类');
      return;
    }
    if (!dateFromDayInput(dateInput)) {
      setError('日期格式应为 YYYY-MM-DD');
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
      if (editingId) updateTransaction(db, editingId, input);
      else createTransaction(db, input);
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败');
    }
  };

  const confirmDelete = () => {
    if (!editingId) return;
    Alert.alert('删除这笔账单？', '删除后，账本和统计会立即更新。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          softDeleteTransaction(db, editingId);
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            <Text style={styles.amountLabel}>{type === 'expense' ? '花了多少' : '收到多少'}</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.amountCurrency}>¥</Text>
              <TextInput
                accessibilityLabel="金额"
                autoFocus={!editingId}
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setAmount(value.replace(/[^\d.]/g, ''));
                  setError(null);
                }}
                placeholder="0.00"
                placeholderTextColor={colors.inkTertiary}
                selectionColor={colors.blushDeep}
                style={styles.amountInput}
                value={amount}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>分类</Text>
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
                  <View style={[styles.rootDot, { backgroundColor: category.color }]} />
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
                    <Text style={[styles.subcategoryText, selected && styles.subcategoryTextSelected]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>日期</Text>
          <View style={styles.quickDates}>
            {quickDates.map(({ label, key, days }) => (
              <Pressable
                key={label}
                onPress={() => applyQuickDate(days)}
                style={[styles.quickDate, dateInput === key && styles.quickDateSelected]}
              >
                <Text style={[styles.quickDateText, dateInput === key && styles.quickDateTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            accessibilityLabel="日期"
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            onChangeText={commitDateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.inkTertiary}
            style={styles.dateInput}
            value={dateInput}
          />

          <Text style={styles.sectionLabel}>备注</Text>
          <TextInput
            accessibilityLabel="备注"
            maxLength={40}
            onChangeText={setNote}
            placeholder={`例如：${selectedRoot?.name ?? '午饭'}`}
            placeholderTextColor={colors.inkTertiary}
            style={styles.noteInput}
            value={note}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {editingId ? (
            <Pressable onPress={confirmDelete} style={styles.deleteButton}>
              <Icon name="trash" size={17} color={colors.danger} />
              <Text style={styles.deleteText}>删除这笔账单</Text>
            </Pressable>
          ) : null}

          <Text style={styles.privacy}>账单保存在本机。语音和云备份将在后续阶段接入。</Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  amountCurrency: {
    color: colors.blushDeep,
    fontFamily: typography.number,
    fontSize: 28,
  },
  amountInput: {
    flex: 1,
    marginLeft: 8,
    padding: 0,
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 52,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  sectionLabel: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    color: colors.inkTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
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
  rootDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
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
  dateInput: {
    height: 46,
    marginTop: spacing.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 14,
  },
  noteInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 14,
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
});
