import { formatCents } from '@shengzhang/domain';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomDock } from '../components/BottomDock';
import { Icon } from '../components/Icon';
import { VoiceCaptureOverlay } from '../components/VoiceCaptureOverlay';
import { VoiceResultSheet } from '../components/VoiceResultSheet';
import { useLedgerMonth } from '../features/ledger/useLedgerMonth';
import { useVoiceCapture } from '../features/voice/useVoiceCapture';
import { trackAnalyticsEvent } from '../services/analytics';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatMonth, localDateKey } from '../utils/date';

export default function StatsScreen() {
  const voice = useVoiceCapture();
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [today] = useState(() => new Date());
  const {
    month,
    entries,
    categories,
    summary,
    previousSummary,
    expenseCategories,
    refresh,
    previousMonth,
    nextMonth,
  } = useLedgerMonth();

  useEffect(() => {
    trackAnalyticsEvent('stats_opened');
  }, []);

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
    const key = localDateKey(date);
    return { day: index + 1, key, amountMinor: dailyExpense.get(key) ?? 0 };
  });
  const maxDaily = Math.max(...dailyValues.map((item) => item.amountMinor), 1);
  const maxDay = dailyValues.reduce(
    (current, item) => (item.amountMinor > current.amountMinor ? item : current),
    dailyValues[0] ?? { day: 1, key: '', amountMinor: 0 },
  );
  const topCategories = expenseCategories;
  const daysElapsed =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()
      ? Math.max(1, today.getDate())
      : daysInMonth;
  const dailyAverage = Math.round(summary.expenseMinor / Math.max(1, daysElapsed));
  const comparison =
    previousSummary.expenseMinor === 0
      ? '上月无记录'
      : `较上月 ${summary.expenseMinor >= previousSummary.expenseMinor ? '+' : ''}${(
          ((summary.expenseMinor - previousSummary.expenseMinor) / previousSummary.expenseMinor) *
          100
        ).toFixed(0)}%`;
  const selectedDayTransactions = selectedDayKey
    ? entries.filter((entry) => localDateKey(entry.occurredAt) === selectedDayKey)
    : [];
  const selectedCategoryEntries = selectedCategoryId
    ? entries.filter((entry) => entry.type === 'expense' && entry.categoryId === selectedCategoryId)
    : [];
  const subcategoryTotals = new Map<string, number>();
  for (const entry of selectedCategoryEntries) {
    const key = entry.subcategoryName ?? '未细分';
    subcategoryTotals.set(key, (subcategoryTotals.get(key) ?? 0) + entry.amountMinor);
  }

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

            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>较上月</Text>
                <Text style={styles.metricValue}>{comparison}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>日均支出</Text>
                <Text style={styles.metricValue}>¥{formatCents(dailyAverage)}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>最高一天</Text>
                <Text style={styles.metricValue}>
                  {maxDay.amountMinor > 0 ? `${maxDay.day}日` : '—'}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>每日支出</Text>
                <Text style={styles.cardHint}>{daysInMonth} 天</Text>
              </View>
              <View style={styles.chart}>
                {dailyValues.map((item) => (
                  <Pressable
                    accessibilityLabel={`${item.day}日支出${formatCents(item.amountMinor)}元`}
                    disabled={item.amountMinor === 0}
                    key={item.day}
                    onPress={() =>
                      setSelectedDayKey((current) => (current === item.key ? null : item.key))
                    }
                    style={[
                      styles.barColumn,
                      selectedDayKey === item.key && styles.barColumnSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(3, Math.round((item.amountMinor / maxDaily) * 104)),
                          opacity: item.amountMinor > 0 ? 1 : 0.22,
                          backgroundColor:
                            selectedDayKey === item.key ? colors.blushDeep : colors.blush,
                        },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
              <View style={styles.axis}>
                <Text style={styles.axisText}>1日</Text>
                <Text style={styles.axisText}>15日</Text>
                <Text style={styles.axisText}>{daysInMonth}日</Text>
              </View>

              {selectedDayKey ? (
                <View style={styles.dayDetail}>
                  <View style={styles.dayDetailHeader}>
                    <Text style={styles.dayDetailTitle}>
                      {Number(selectedDayKey.slice(5, 7))}月{Number(selectedDayKey.slice(8, 10))}日
                    </Text>
                    <Pressable
                      accessibilityLabel="关闭日期明细"
                      onPress={() => setSelectedDayKey(null)}
                      style={styles.dayDetailClose}
                    >
                      <Icon name="close" size={15} color={colors.inkTertiary} />
                    </Pressable>
                  </View>
                  {selectedDayTransactions.map((entry) => (
                    <View key={entry.id} style={styles.dayTransaction}>
                      <Text style={styles.dayTransactionName}>
                        {entry.note || entry.subcategoryName || entry.categoryName}
                      </Text>
                      <Text
                        style={[
                          styles.dayTransactionAmount,
                          entry.type === 'income' && styles.incomeAmount,
                        ]}
                      >
                        {entry.type === 'income' ? '+' : '−'}¥{formatCents(entry.amountMinor)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>花在了哪里</Text>
                <Text style={styles.cardHint}>按一级分类</Text>
              </View>
              {topCategories.map((item) => {
                const category = categoryMap.get(item.categoryId);
                const share = summary.expenseMinor > 0 ? item.amountMinor / summary.expenseMinor : 0;
                const selected = selectedCategoryId === item.categoryId;
                return (
                  <View key={item.categoryId}>
                    <Pressable
                      onPress={() =>
                        setSelectedCategoryId((current) =>
                          current === item.categoryId ? null : item.categoryId,
                        )
                      }
                      style={styles.categoryRow}
                    >
                      <View style={[styles.categoryDot, { backgroundColor: category?.color ?? colors.inkTertiary }]} />
                      <View style={styles.categoryCopy}>
                        <View style={styles.categoryLabelRow}>
                          <View style={styles.categoryNameRow}>
                            <Text style={styles.categoryName}>{category?.name ?? '其他'}</Text>
                            <Text style={styles.categoryHint}>{selected ? '收起' : '细分'}</Text>
                          </View>
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
                    </Pressable>
                    {selected ? (
                      <View style={styles.subcategoryPanel}>
                        {[...subcategoryTotals.entries()].map(([name, amountMinor]) => (
                          <View key={name} style={styles.subcategoryRow}>
                            <Text style={styles.subcategoryName}>{name}</Text>
                            <Text style={styles.subcategoryAmount}>¥{formatCents(amountMinor)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <BottomDock
        active="stats"
        voiceActive={voice.phase === 'recording'}
        onVoiceStart={() => void voice.startHold()}
        onVoiceModeChange={voice.setGestureMode}
        onVoiceEnd={voice.endHold}
        onVoiceManual={() => router.push('/entry')}
      />
      <VoiceCaptureOverlay
        phase={voice.phase}
        transcript={voice.transcript}
        error={voice.error}
        cancelArmed={voice.cancelArmed}
        manualArmed={voice.manualArmed}
        audioLevel={voice.audioLevel}
      />
      <VoiceResultSheet onSaved={refresh} />
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
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  metric: {
    flex: 1,
    minHeight: 64,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  metricLabel: {
    color: colors.inkTertiary,
    fontSize: 9,
  },
  metricValue: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 3,
  },
  barColumnSelected: {
    backgroundColor: colors.blushSoft,
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
  dayDetail: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayDetailTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  dayDetailClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTransaction: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTransactionName: {
    color: colors.inkSecondary,
    fontSize: 11,
  },
  dayTransactionAmount: {
    color: colors.blushDeep,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  incomeAmount: {
    color: colors.income,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 48,
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
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryHint: {
    color: colors.inkTertiary,
    fontSize: 8,
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
  subcategoryPanel: {
    marginTop: 4,
    marginLeft: 16,
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  subcategoryRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subcategoryName: {
    color: colors.inkTertiary,
    fontSize: 10,
  },
  subcategoryAmount: {
    color: colors.inkSecondary,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
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
