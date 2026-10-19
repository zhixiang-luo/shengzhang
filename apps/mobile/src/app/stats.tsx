import { formatCents } from '@shengzhang/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomDock } from '../components/BottomDock';
import { Icon } from '../components/Icon';
import { VoiceActionSheet } from '../components/VoiceActionSheet';
import { useLedgerMonth } from '../features/ledger/useLedgerMonth';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatMonth, localDateKey } from '../utils/date';

export default function StatsScreen() {
  const [voiceVisible, setVoiceVisible] = useState(false);
  const {
    month,
    entries,
    categories,
    summary,
    expenseCategories,
    previousMonth,
    nextMonth,
  } = useLedgerMonth();

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dailyExpense = new Map<string, number>();
  for (const entry of entries) {
    if (entry.type !== 'expense') continue;
    const key = localDateKey(entry.occurredAt);
    dailyExpense.set(key, (dailyExpense.get(key) ?? 0) + entry.amountMinor);
  }
  const dailyValues = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index + 1, 12);
    return { day: index + 1, amountMinor: dailyExpense.get(localDateKey(date)) ?? 0 };
  });
  const maxDaily = Math.max(...dailyValues.map((item) => item.amountMinor), 1);
  const topCategories = expenseCategories.slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MONTH IN REVIEW</Text>
          <Text style={styles.title}>读懂每一笔</Text>
        </View>
        <View style={styles.monthControl}>
          <Pressable onPress={previousMonth} style={styles.monthArrow} accessibilityLabel="上个月">
            <Icon name="chevron-left" size={18} color={colors.inkSecondary} />
          </Pressable>
          <Text style={styles.monthText}>{formatMonth(month)}</Text>
          <Pressable onPress={nextMonth} style={styles.monthArrow} accessibilityLabel="下个月">
            <Icon name="chevron-right" size={18} color={colors.inkSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyMark}>○</Text>
            <Text style={styles.emptyTitle}>这个月还没有账单</Text>
            <Text style={styles.emptyBody}>记下一笔后，这里会长出你的消费轮廓。</Text>
          </View>
        ) : (
          <>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>本月支出</Text>
              <Text style={styles.total}>¥{formatCents(summary.expenseMinor)}</Text>
              <Text style={styles.totalMeta}>
                收入 ¥{formatCents(summary.incomeMinor)} · 结余 ¥{formatCents(summary.balanceMinor)}
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>每日支出</Text>
                <Text style={styles.cardHint}>{daysInMonth} 天</Text>
              </View>
              <View style={styles.chart}>
                {dailyValues.map((item) => (
                  <View key={item.day} style={styles.barColumn}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(3, Math.round((item.amountMinor / maxDaily) * 104)),
                          opacity: item.amountMinor > 0 ? 1 : 0.22,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.axis}>
                <Text style={styles.axisText}>1日</Text>
                <Text style={styles.axisText}>15日</Text>
                <Text style={styles.axisText}>{daysInMonth}日</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>花在了哪里</Text>
                <Text style={styles.cardHint}>按一级分类</Text>
              </View>
              {topCategories.map((item) => {
                const category = categoryMap.get(item.categoryId);
                const share = summary.expenseMinor > 0 ? item.amountMinor / summary.expenseMinor : 0;
                return (
                  <View key={item.categoryId} style={styles.categoryRow}>
                    <View style={[styles.categoryDot, { backgroundColor: category?.color ?? colors.inkTertiary }]} />
                    <View style={styles.categoryCopy}>
                      <View style={styles.categoryLabelRow}>
                        <Text style={styles.categoryName}>{category?.name ?? '其他'}</Text>
                        <Text style={styles.categoryAmount}>¥{formatCents(item.amountMinor)}</Text>
                      </View>
                      <View style={styles.shareTrack}>
                        <View
                          style={[
                            styles.shareFill,
                            {
                              width: `${Math.max(4, Math.round(share * 100))}%`,
                              backgroundColor: category?.color ?? colors.inkTertiary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <BottomDock active="stats" onVoice={() => setVoiceVisible(true)} />
      <VoiceActionSheet
        visible={voiceVisible}
        onClose={() => setVoiceVisible(false)}
        onManualEntry={() => router.push('/entry')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 4,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 32,
    letterSpacing: -1,
  },
  monthControl: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginLeft: -10,
  },
  monthArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    color: colors.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 140,
  },
  totalCard: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.blushSoft,
  },
  totalLabel: {
    color: colors.blushDeep,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  total: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 42,
    fontWeight: '600',
    letterSpacing: -1.5,
  },
  totalMeta: {
    marginTop: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  card: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  cardHint: {
    color: colors.inkTertiary,
    fontSize: 10,
  },
  chart: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: spacing.lg,
  },
  barColumn: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  },
  bar: {
    minHeight: 3,
    borderRadius: 3,
    backgroundColor: colors.blush,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisText: {
    color: colors.inkTertiary,
    fontSize: 9,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryAmount: {
    color: colors.inkSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  shareTrack: {
    height: 4,
    overflow: 'hidden',
    marginTop: 7,
    borderRadius: 2,
    backgroundColor: colors.surfaceSunken,
  },
  shareFill: {
    height: '100%',
    borderRadius: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyMark: {
    color: colors.blush,
    fontSize: 64,
    lineHeight: 68,
  },
  emptyTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 24,
  },
  emptyBody: {
    marginTop: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 12,
  },
});
