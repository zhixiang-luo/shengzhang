import { formatCents } from '@shengzhang/domain';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '../components/CategoryIcon';
import { DateTimePickerSheet } from '../components/DateTimePickerSheet';
import { Icon } from '../components/Icon';
import {
  listCategories,
  type CategoryRow,
} from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import {
  listAllTransactions,
  type TransactionRow,
} from '../db/transactionRepository';
import {
  countActiveSearchFilters,
  dateFromLocalDateKey,
  matchesLedgerSearch,
  normalizeLedgerSearchFilters,
  updateSearchDate,
  type LedgerSearchDateField,
  type LedgerSearchDraft,
  type SearchCategory,
} from '../features/search/ledgerSearch';
import { trackAnalyticsEvent } from '../services/analytics';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDayHeading, formatTime, localDateKey } from '../utils/date';

type SearchEntryView = TransactionRow & {
  categoryName: string;
  subcategoryName: string | null;
  categoryColor: string;
  categoryIcon: string;
  localDate: string;
};

const EMPTY_DRAFT: LedgerSearchDraft = {
  query: '',
  type: 'all',
  categoryId: null,
  startDate: null,
  endDate: null,
  minAmount: '',
  maxAmount: '',
};

export default function SearchScreen() {
  const db = useDatabase();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [draft, setDraft] = useState<LedgerSearchDraft>(EMPTY_DRAFT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [datePickerField, setDatePickerField] = useState<LedgerSearchDateField | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    try {
      setTransactions(listAllTransactions(db));
      setCategories(listCategories(db, true));
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : '账单读取失败');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      trackAnalyticsEvent('ledger_search_opened');
      load();
    }, [load]),
  );

  const categoryMap = useMemo(
    () => new Map<string, CategoryRow>(categories.map((category) => [category.id, category])),
    [categories],
  );

  const entries = useMemo<SearchEntryView[]>(
    () =>
      transactions.map((transaction) => {
        const category = categoryMap.get(transaction.categoryId);
        const subcategory = transaction.subcategoryId
          ? categoryMap.get(transaction.subcategoryId)
          : null;
        return {
          ...transaction,
          categoryName: category?.name ?? '其他',
          subcategoryName: subcategory?.name ?? null,
          categoryColor: category?.color ?? colors.inkTertiary,
          categoryIcon: subcategory?.icon ?? category?.icon ?? 'other',
          localDate: localDateKey(transaction.occurredAt),
        };
      }),
    [categoryMap, transactions],
  );

  const normalized = useMemo(() => {
    try {
      return {
        filters: normalizeLedgerSearchFilters(draft),
        error: null as string | null,
      };
    } catch (caught) {
      return {
        filters: null,
        error: caught instanceof Error ? caught.message : '筛选条件不正确',
      };
    }
  }, [draft]);

  const results = useMemo(() => {
    if (!normalized.filters) return [];
    return entries.filter((entry) =>
      matchesLedgerSearch(entry, normalized.filters!, categoryMap as Map<string, SearchCategory>),
    );
  }, [categoryMap, entries, normalized.filters]);

  const activeFilterCount = normalized.filters
    ? countActiveSearchFilters(normalized.filters)
    : 0;

  const categorySections = useMemo(() => {
    const types: ('expense' | 'income')[] =
      draft.type === 'income' ? ['income'] : draft.type === 'expense' ? ['expense'] : ['expense', 'income'];
    return types.map((type) => {
      const roots = categories
        .filter(
          (category) =>
            category.type === type &&
            category.parentId === null &&
            !category.isArchived,
        )
        .sort((left, right) => left.sortOrder - right.sortOrder);
      return {
        type,
        title: type === 'expense' ? '支出分类' : '收入分类',
        categories: roots.flatMap((root) => [
          root,
          ...categories
            .filter((category) => category.parentId === root.id && !category.isArchived)
            .sort((left, right) => left.sortOrder - right.sortOrder),
        ]),
      };
    });
  }, [categories, draft.type]);

  const setType = (type: 'all' | 'expense' | 'income') => {
    setDraft((current) => {
      const selectedCategory = current.categoryId
        ? categoryMap.get(current.categoryId)
        : null;
      const keepCategory = type === 'all' || selectedCategory?.type === type;
      return {
        ...current,
        type,
        categoryId: keepCategory ? current.categoryId : null,
      };
    });
  };

  const clearFilters = () => {
    setDraft(EMPTY_DRAFT);
    setFiltersOpen(false);
  };

  const clearDate = (field: LedgerSearchDateField) => {
    setDraft((current) => ({ ...current, [field]: null }));
  };

  const openDatePicker = (field: LedgerSearchDateField) => {
    Keyboard.dismiss();
    setDatePickerField(field);
  };

  const selectedDateKey =
    datePickerField === 'startDate'
      ? draft.startDate
      : datePickerField === 'endDate'
        ? draft.endDate
        : null;
  const datePickerValue = useMemo(
    () => dateFromLocalDateKey(selectedDateKey),
    [selectedDateKey],
  );

  const trackApplied = () => {
    if (!normalized.filters) return;
    trackAnalyticsEvent('ledger_search_applied', {
      filterCount: countActiveSearchFilters(normalized.filters),
    });
  };

  const filterButtonLabel =
    activeFilterCount > 0 ? `筛选 ${activeFilterCount}` : '筛选';

  const listHeader = (
    <View>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>FIND THAT ENTRY</Text>
        <Text style={styles.title}>找回每一笔</Text>
        <Text style={styles.subtitle}>按备注、分类、日期和金额找，全部在本机完成。</Text>
      </View>

      <View style={[styles.searchBox, normalized.error && styles.searchBoxError]}>
        <Icon name="search" size={20} color={colors.inkTertiary} />
        <TextInput
          accessibilityLabel="搜索账单"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          onChangeText={(query) => setDraft((current) => ({ ...current, query }))}
          onSubmitEditing={trackApplied}
          placeholder="搜备注或分类"
          placeholderTextColor={colors.inkTertiary}
          returnKeyType="search"
          style={styles.searchInput}
          value={draft.query ?? ''}
        />
        {draft.query ? (
          <Pressable
            accessibilityLabel="清除搜索词"
            onPress={() => setDraft((current) => ({ ...current, query: '' }))}
            style={styles.clearQuery}
          >
            <Icon name="close" size={16} color={colors.inkTertiary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.quickFilters}>
        <View style={styles.typeSegment}>
          {(
            [
              ['all', '全部'],
              ['expense', '支出'],
              ['income', '收入'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: draft.type === value }}
              key={value}
              onPress={() => setType(value)}
              style={[
                styles.typeOption,
                draft.type === value && styles.typeOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  draft.type === value && styles.typeTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityLabel={filterButtonLabel}
          accessibilityState={{ expanded: filtersOpen }}
          onPress={() => setFiltersOpen((open) => !open)}
          style={[styles.filterButton, filtersOpen && styles.filterButtonOpen]}
        >
          <Icon
            name="settings"
            size={16}
            color={filtersOpen ? colors.surface : colors.inkSecondary}
          />
          <Text
            style={[
              styles.filterButtonText,
              filtersOpen && styles.filterButtonTextOpen,
            ]}
          >
            {filterButtonLabel}
          </Text>
        </Pressable>
      </View>

      {filtersOpen ? (
        <View style={styles.filterPanel}>
          {categorySections.map((section) => (
            <View key={section.type} style={styles.filterSection}>
              <Text style={styles.filterLabel}>{section.title}</Text>
              <View style={styles.categoryChips}>
                {section.categories.map((category) => {
                  const selected = draft.categoryId === category.id;
                  const isChild = category.parentId !== null;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={category.id}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          categoryId: selected ? null : category.id,
                        }))
                      }
                      style={[
                        styles.categoryChip,
                        isChild && styles.categoryChipChild,
                        selected && styles.categoryChipActive,
                      ]}
                    >
                      {isChild ? (
                        <Text
                          style={[
                            styles.childMark,
                            selected && styles.categoryChipTextActive,
                          ]}
                        >
                          ↳
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>日期范围</Text>
            <View style={styles.rangeRow}>
              <DateRangeField
                label="开始日期"
                onClear={() => clearDate('startDate')}
                onPress={() => openDatePicker('startDate')}
                value={draft.startDate ?? null}
              />
              <Text style={styles.rangeDash}>—</Text>
              <DateRangeField
                label="结束日期"
                onClear={() => clearDate('endDate')}
                onPress={() => openDatePicker('endDate')}
                value={draft.endDate ?? null}
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>金额范围</Text>
            <View style={styles.rangeRow}>
              <FilterInput
                accessibilityLabel="最低金额"
                keyboardType="decimal-pad"
                onChangeText={(minAmount) =>
                  setDraft((current) => ({ ...current, minAmount }))
                }
                placeholder="最低 ¥"
                value={draft.minAmount ?? ''}
              />
              <Text style={styles.rangeDash}>—</Text>
              <FilterInput
                accessibilityLabel="最高金额"
                keyboardType="decimal-pad"
                onChangeText={(maxAmount) =>
                  setDraft((current) => ({ ...current, maxAmount }))
                }
                placeholder="最高 ¥"
                value={draft.maxAmount ?? ''}
              />
            </View>
          </View>

          {normalized.error ? (
            <Text style={styles.filterError}>{normalized.error}</Text>
          ) : null}

          <View style={styles.filterActions}>
            <Pressable onPress={clearFilters} style={styles.resetButton}>
              <Text style={styles.resetText}>全部清除</Text>
            </Pressable>
            <Pressable
              disabled={Boolean(normalized.error)}
              onPress={() => {
                trackApplied();
                setFiltersOpen(false);
              }}
              style={[
                styles.applyButton,
                normalized.error && styles.applyButtonDisabled,
              ]}
            >
              <Text style={styles.applyText}>
                {normalized.error ? '检查筛选条件' : `查看 ${results.length} 笔`}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.resultHeading}>
        <View>
          <Text style={styles.resultTitle}>
            {activeFilterCount > 0 ? '搜索结果' : '最近账单'}
          </Text>
          <Text style={styles.resultHint}>
            {normalized.error
              ? '条件有误，暂不显示结果'
              : `${results.length} 笔账单`}
          </Text>
        </View>
        {activeFilterCount > 0 ? (
          <Pressable
            accessibilityLabel="清除全部筛选"
            onPress={clearFilters}
            style={styles.clearAllButton}
          >
            <Text style={styles.clearAllText}>清除筛选</Text>
          </Pressable>
        ) : null}
      </View>

      {loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>账单没有读出来</Text>
          <Text style={styles.errorBody}>{loadError}</Text>
          <Pressable onPress={load} style={styles.retryButton}>
            <Text style={styles.retryText}>重新读取</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="返回账本"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Icon name="back" size={20} color={colors.inkSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>搜索账单</Text>
        <View style={styles.headerSpace} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.keyboardView}
      >
        <FlatList
          contentContainerStyle={styles.content}
          data={loadError ? [] : results}
          ItemSeparatorComponent={() => <View style={styles.resultDivider} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(entry) => entry.id}
          ListEmptyComponent={
            loadError ? undefined : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon name="search" size={25} color={colors.blushDeep} />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeFilterCount > 0 ? '没有找到这组条件' : '账本还是空的'}
                </Text>
                <Text style={styles.emptyBody}>
                  {activeFilterCount > 0
                    ? '试着缩短关键词，或放宽分类、日期与金额范围。'
                    : '记下第一笔后，这里会按时间展示最近账单。'}
                </Text>
                {activeFilterCount > 0 ? (
                  <Pressable onPress={clearFilters} style={styles.emptyAction}>
                    <Text style={styles.emptyActionText}>清除全部筛选</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => router.push('/entry')}
                    style={styles.emptyAction}
                  >
                    <Text style={styles.emptyActionText}>去记一笔</Text>
                  </Pressable>
                )}
              </View>
            )
          }
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <Pressable
              accessibilityHint="打开账单编辑"
              accessibilityLabel={`${item.note || item.subcategoryName || item.categoryName}，${item.type === 'income' ? '收入' : '支出'}${formatCents(item.amountMinor)}元`}
              onPress={() =>
                router.push({ pathname: '/entry', params: { id: item.id } })
              }
              style={({ pressed }) => [
                styles.resultRow,
                pressed && styles.resultRowPressed,
              ]}
            >
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: `${item.categoryColor}18` },
                ]}
              >
                <CategoryIcon
                  color={item.categoryColor}
                  icon={item.categoryIcon}
                  size={20}
                  strokeWidth={1.7}
                />
              </View>
              <View style={styles.resultCopy}>
                <Text numberOfLines={1} style={styles.resultName}>
                  {item.note || item.subcategoryName || item.categoryName}
                </Text>
                <Text numberOfLines={1} style={styles.resultMeta}>
                  {item.subcategoryName
                    ? `${item.categoryName} · ${item.subcategoryName}`
                    : item.categoryName}
                  {'  '}
                  {formatDayHeading(item.occurredAt)} · {formatTime(item.occurredAt)}
                </Text>
              </View>
              <Text
                style={[
                  styles.resultAmount,
                  item.type === 'income' && styles.incomeAmount,
                ]}
              >
                {item.type === 'income' ? '+' : '−'}¥{formatCents(item.amountMinor)}
              </Text>
              <Icon name="chevron-right" size={15} color={colors.inkTertiary} />
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>

      <DateTimePickerSheet
        mode="date"
        onClose={() => setDatePickerField(null)}
        onConfirm={(date) => {
          if (!datePickerField) return;
          setDraft((current) => updateSearchDate(current, datePickerField, date));
          setDatePickerField(null);
        }}
        value={datePickerValue}
        visible={datePickerField !== null}
      />
    </SafeAreaView>
  );
}

function DateRangeField({
  label,
  onClear,
  onPress,
  value,
}: {
  label: string;
  onClear: () => void;
  onPress: () => void;
  value: string | null;
}) {
  return (
    <View style={[styles.rangeInput, styles.dateRangeField]}>
      <Pressable
        accessibilityHint="打开月历选择日期"
        accessibilityLabel={`${label}，${value ?? '未选择'}`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.dateRangeTrigger}
      >
        <Icon name="calendar" size={15} color={colors.blushDeep} />
        <Text
          numberOfLines={1}
          style={[styles.dateRangeText, !value && styles.dateRangePlaceholder]}
        >
          {value ?? `选择${label}`}
        </Text>
      </Pressable>
      {value ? (
        <Pressable
          accessibilityLabel={`清除${label}`}
          accessibilityRole="button"
          onPress={onClear}
          style={styles.dateRangeClear}
        >
          <Icon name="close" size={14} color={colors.inkTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function FilterInput({
  accessibilityLabel,
  keyboardType = 'numbers-and-punctuation',
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  keyboardType?: 'decimal-pad' | 'numbers-and-punctuation';
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.inkTertiary}
      style={styles.rangeInput}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpace: {
    width: 44,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  intro: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.blushDeep,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 4,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 31,
    fontWeight: '500',
    letterSpacing: -0.9,
  },
  subtitle: {
    marginTop: 6,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
  searchBox: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: spacing.lg,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  searchBoxError: {
    borderColor: '#E9C7C2',
  },
  searchInput: {
    flex: 1,
    height: 52,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clearQuery: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  quickFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  typeSegment: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  typeOption: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  typeOptionActive: {
    backgroundColor: colors.ink,
  },
  typeText: {
    color: colors.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeTextActive: {
    color: colors.surface,
  },
  filterButton: {
    minWidth: 88,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  filterButtonOpen: {
    borderColor: colors.blushDeep,
    backgroundColor: colors.blushDeep,
  },
  filterButtonText: {
    color: colors.inkSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterButtonTextOpen: {
    color: colors.surface,
  },
  filterPanel: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    marginBottom: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  categoryChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.canvas,
  },
  categoryChipChild: {
    minHeight: 31,
  },
  categoryChipActive: {
    borderColor: colors.blushDeep,
    backgroundColor: colors.blushDeep,
  },
  categoryChipText: {
    color: colors.inkSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: colors.surface,
  },
  childMark: {
    marginRight: 3,
    color: colors.inkTertiary,
    fontSize: 11,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rangeInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.canvas,
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dateRangeField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  dateRangeTrigger: {
    flex: 1,
    minWidth: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 11,
  },
  dateRangeText: {
    flex: 1,
    color: colors.ink,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  dateRangePlaceholder: {
    color: colors.inkTertiary,
  },
  dateRangeClear: {
    width: 34,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeDash: {
    color: colors.inkTertiary,
    fontSize: 12,
  },
  filterError: {
    marginBottom: spacing.md,
    color: colors.danger,
    fontSize: 11,
    lineHeight: 17,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resetButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  resetText: {
    color: colors.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.ink,
  },
  applyButtonDisabled: {
    opacity: 0.38,
  },
  applyText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  resultHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  resultHint: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 10,
  },
  clearAllButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllText: {
    color: colors.blushDeep,
    fontSize: 11,
    fontWeight: '700',
  },
  resultRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  resultRowPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  categoryIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  resultMeta: {
    marginTop: 4,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  resultAmount: {
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  incomeAmount: {
    color: colors.income,
  },
  resultDivider: {
    height: 8,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 34,
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.blushSoft,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 23,
  },
  emptyBody: {
    maxWidth: 270,
    marginTop: 8,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
    backgroundColor: colors.blushSoft,
  },
  emptyActionText: {
    color: colors.blushDeep,
    fontSize: 12,
    fontWeight: '700',
  },
  errorCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E9C7C2',
    borderRadius: 18,
    backgroundColor: '#FFF8F6',
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  errorBody: {
    marginTop: 5,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  retryText: {
    color: colors.blushDeep,
    fontSize: 12,
    fontWeight: '700',
  },
});
