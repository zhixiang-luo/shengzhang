import { formatCents, summarizeAmounts } from '@shengzhang/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomDock } from '../components/BottomDock';
import { BrandMark } from '../components/BrandMark';
import { Icon } from '../components/Icon';
import { UndoDeleteBanner } from '../components/UndoDeleteBanner';
import { VoiceActionSheet } from '../components/VoiceActionSheet';
import { useLedgerMonth } from '../features/ledger/useLedgerMonth';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDayHeading, formatMonth, formatTime } from '../utils/date';

export default function LedgerScreen() {
  const [voiceVisible, setVoiceVisible] = useState(false);
  const {
    month,
    groups,
    summary,
    loading,
    error,
    refresh,
    previousMonth,
    nextMonth,
  } = useLedgerMonth();

  const openManualEntry = () => router.push('/entry');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>声账 · 我的账本</Text>
          <View style={styles.monthRow}>
            <Pressable onPress={previousMonth} style={styles.monthArrow} accessibilityLabel="上个月">
              <Icon name="chevron-left" size={18} color={colors.inkSecondary} />
            </Pressable>
            <Text style={styles.monthTitle}>{formatMonth(month)}</Text>
            <Pressable onPress={nextMonth} style={styles.monthArrow} accessibilityLabel="下个月">
              <Icon name="chevron-right" size={18} color={colors.inkSecondary} />
            </Pressable>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="设置"
            onPress={() => router.push('/settings')}
            style={styles.iconButton}
          >
            <Icon name="settings" size={20} color={colors.inkSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.blushDeep} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>本月支出</Text>
          <View style={styles.amountLine}>
            <Text style={styles.currency}>¥</Text>
            <Text style={styles.amount}>{formatCents(summary.expenseMinor)}</Text>
          </View>
          <View style={styles.summaryMeta}>
            <Text style={styles.metaText}>收入 ¥{formatCents(summary.incomeMinor)}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>结余 ¥{formatCents(summary.balanceMinor)}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>账本没有读出来</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryText}>重试</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && groups.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.blushDeep} />
            <Text style={styles.loadingText}>正在翻开账本</Text>
          </View>
        ) : null}

        {!loading && !error && groups.length === 0 ? (
          <View style={styles.empty}>
            <BrandMark size={82} />
            <Text style={styles.emptyTitle}>第一笔，说一句就好。</Text>
            <Text style={styles.emptyBody}>还没有账单。可以直接加一笔，也可以从下方语音入口滑动进入手动记账。</Text>
            <Pressable onPress={openManualEntry} style={styles.emptyButton}>
              <Icon name="plus" size={17} color={colors.surface} />
              <Text style={styles.emptyButtonText}>加一笔</Text>
            </Pressable>
          </View>
        ) : null}

        {groups.map((group) => {
          const daySummary = summarizeAmounts(group.transactions);
          return (
            <View key={group.key} style={styles.dayGroup}>
              <View style={styles.dayHeading}>
                <Text style={styles.dayTitle}>{formatDayHeading(group.occurredAt)}</Text>
                <Text style={styles.dayTotal}>
                  {daySummary.expenseMinor > 0
                    ? `−¥${formatCents(daySummary.expenseMinor)}`
                    : `+¥${formatCents(daySummary.incomeMinor)}`}
                </Text>
              </View>
              <View style={styles.transactionList}>
                {group.transactions.map((transaction, index) => (
                  <Pressable
                    key={transaction.id}
                    accessibilityLabel={`编辑${transaction.note || transaction.categoryName}`}
                    onPress={() => router.push({ pathname: '/entry', params: { id: transaction.id } })}
                    style={({ pressed }) => [
                      styles.transactionRow,
                      index < group.transactions.length - 1 && styles.transactionDivider,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={[styles.categoryMark, { backgroundColor: `${transaction.categoryColor}22` }]}>
                      <Text style={[styles.categoryInitial, { color: transaction.categoryColor }]}>
                        {transaction.categoryName.slice(0, 1)}
                      </Text>
                    </View>
                    <View style={styles.transactionCopy}>
                      <Text numberOfLines={1} style={styles.transactionTitle}>
                        {transaction.note || transaction.subcategoryName || transaction.categoryName}
                      </Text>
                      <Text style={styles.transactionMeta}>
                        {transaction.subcategoryName
                          ? `${transaction.categoryName} · ${transaction.subcategoryName}`
                          : transaction.categoryName}{' '}
                        · {formatTime(transaction.occurredAt)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.type === 'income' && styles.incomeAmount,
                      ]}
                    >
                      {transaction.type === 'income' ? '+' : '−'}¥{formatCents(transaction.amountMinor)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <UndoDeleteBanner onRestored={refresh} />
      <BottomDock active="ledger" onVoice={() => setVoiceVisible(true)} />
      <VoiceActionSheet
        visible={voiceVisible}
        onClose={() => setVoiceVisible(false)}
        onManualEntry={openManualEntry}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: -8,
  },
  monthArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 25,
    fontWeight: '500',
    letterSpacing: -0.6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 140,
  },
  summary: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  summaryLabel: {
    color: 'rgba(255, 253, 248, 0.62)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  amountLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  currency: {
    marginTop: 9,
    marginRight: 6,
    color: colors.blushSoft,
    fontFamily: typography.number,
    fontSize: 20,
  },
  amount: {
    color: colors.surface,
    fontFamily: typography.number,
    fontSize: 43,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.8,
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: spacing.md,
  },
  metaText: {
    color: 'rgba(255, 253, 248, 0.62)',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 253, 248, 0.28)',
  },
  loading: {
    alignItems: 'center',
    paddingTop: 72,
    gap: 12,
  },
  loadingText: {
    color: colors.inkTertiary,
    fontSize: 12,
  },
  errorCard: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#E9C7C2',
    borderRadius: radii.md,
    backgroundColor: '#FFF8F6',
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBody: {
    marginTop: 7,
    color: colors.inkSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.blushSoft,
  },
  retryText: {
    color: colors.blushDeep,
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 25,
  },
  emptyBody: {
    maxWidth: 280,
    marginTop: 9,
    color: colors.inkSecondary,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 46,
    marginTop: spacing.xl,
    paddingHorizontal: 17,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  emptyButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  dayGroup: {
    marginTop: spacing.xxl,
  },
  dayHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  dayTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  dayTotal: {
    color: colors.inkTertiary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  transactionList: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  transactionRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  transactionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.canvas,
  },
  categoryMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  categoryInitial: {
    fontFamily: typography.display,
    fontSize: 17,
    fontWeight: '600',
  },
  transactionCopy: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  transactionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  transactionMeta: {
    marginTop: 4,
    color: colors.inkTertiary,
    fontSize: 11,
  },
  transactionAmount: {
    color: colors.blushDeep,
    fontFamily: typography.number,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  incomeAmount: {
    color: colors.income,
  },
});
