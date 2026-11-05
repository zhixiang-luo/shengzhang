import {
  buildPrivacySafeShareSummary,
  formatCents,
} from '@shengzhang/domain';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { BrandMark } from '../components/BrandMark';
import { CategoryIcon } from '../components/CategoryIcon';
import { Icon } from '../components/Icon';
import { ShareReviewCard } from '../components/ShareReviewCard';
import {
  buildReviewShareFileName,
  buildReviewSharePreview,
} from '../features/review/shareCard';
import {
  currentMonthKey,
  useMonthlyReview,
} from '../features/review/useMonthlyReview';
import { trackAnalyticsEvent } from '../services/analytics';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatMonth } from '../utils/date';

function resolveMonthParam(value: string | string[] | undefined): string {
  const requested = Array.isArray(value) ? value[0] : value;
  return requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested)
    ? requested
    : currentMonthKey();
}

function comparisonLabel(direction: 'up' | 'down' | 'same' | 'no_baseline', percent: number | null) {
  if (direction === 'no_baseline') return '上月无记录';
  if (direction === 'same') return '与上月持平';
  return `较上月 ${percent !== null && percent > 0 ? '+' : ''}${percent ?? 0}%`;
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ month?: string | string[] }>();
  const monthKey = resolveMonthParam(params.month);
  const { month, review, categories, loading, error, refresh } =
    useMonthlyReview(monthKey);
  const [shareVisible, setShareVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const shareCardRef = useRef<ViewInstance>(null);

  useEffect(() => {
    trackAnalyticsEvent('monthly_review_opened');
  }, [monthKey]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const topCategory = review.topCategory
    ? categoryMap.get(review.topCategory.categoryId)
    : null;
  const safeSummary = useMemo(
    () => buildPrivacySafeShareSummary(review),
    [review],
  );
  const sharePreview = useMemo(
    () => buildReviewSharePreview(safeSummary),
    [safeSummary],
  );

  const openPreview = () => {
    if (!review.hasData) return;
    setShareError(null);
    setShareVisible(true);
    trackAnalyticsEvent('monthly_review_previewed');
  };

  const sharePng = async () => {
    if (sharing || !shareCardRef.current) return;
    setSharing(true);
    setShareError(null);
    let uri: string | null = null;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('当前设备不支持系统分享');
      }
      uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: 1350,
        fileName: buildReviewShareFileName(review.month),
      });
      await Sharing.shareAsync(uri, {
        dialogTitle: '分享声账月度回顾',
        mimeType: 'image/png',
      });
      // The system share sheet does not expose whether the recipient was confirmed.
      trackAnalyticsEvent('monthly_review_share_opened');
    } catch (caught) {
      setShareError(caught instanceof Error ? caught.message : '分享卡生成失败');
      trackAnalyticsEvent('monthly_review_share_failed', {
        reason: 'share_failed',
      });
    } finally {
      if (uri) releaseCapture(uri);
      setSharing(false);
    }
  };

  const highestDay = review.highestExpenseDay
    ? `${Number(review.highestExpenseDay.localDate.slice(5, 7))}月${Number(
        review.highestExpenseDay.localDate.slice(8, 10),
      )}日`
    : '—';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="返回统计"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Icon name="back" size={20} color={colors.inkSecondary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>本月回顾</Text>
          <Text style={styles.headerMonth}>{formatMonth(month)}</Text>
        </View>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>回顾没有生成</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryText}>重新读取</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.blushDeep} />
            <Text style={styles.loadingText}>正在把这一月收拢起来</Text>
          </View>
        ) : null}

        {!loading && !error && !review.hasData ? (
          <View style={styles.empty}>
            <BrandMark size={82} />
            <Text style={styles.emptyTitle}>这个月还很安静</Text>
            <Text style={styles.emptyBody}>
              记下第一笔后，这里会替你整理出支出流向、语音记录和一个月里最值得回看的事实。
            </Text>
            <Pressable onPress={() => router.push('/entry')} style={styles.emptyButton}>
              <Icon name="plus" size={17} color={colors.surface} />
              <Text style={styles.emptyButtonText}>记下第一笔</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && review.hasData ? (
          <>
            <View style={styles.hero}>
              <View pointerEvents="none" style={styles.heroOrbLarge} />
              <View pointerEvents="none" style={styles.heroOrbSmall} />
              <Text style={styles.heroEyebrow}>YOUR MONTH, IN A FEW WORDS</Text>
              <Text style={styles.heroTitle}>{review.narrative}</Text>
              <View style={styles.heroFooter}>
                <Text style={styles.heroMeta}>
                  {review.transactionCount} 笔账单 · {review.voiceTransactionCount} 笔来自语音
                </Text>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>
                    {comparisonLabel(review.comparison.direction, review.comparison.percent)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.totalCard}>
              <View style={styles.totalMain}>
                <Text style={styles.totalLabel}>支出</Text>
                <Text style={styles.totalAmount}>¥{formatCents(review.expenseMinor)}</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalSide}>
                <Text style={styles.totalSideLabel}>收入</Text>
                <Text style={styles.totalSideValue}>¥{formatCents(review.incomeMinor)}</Text>
                <Text style={styles.totalSideLabel}>结余</Text>
                <Text
                  style={[
                    styles.totalSideValue,
                    review.balanceMinor >= 0 && styles.incomeAmount,
                  ]}
                >
                  ¥{formatCents(review.balanceMinor)}
                </Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>日均支出</Text>
                <Text style={styles.metricValue}>¥{formatCents(review.dailyAverageMinor)}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>最高支出日</Text>
                <Text style={styles.metricValue}>{highestDay}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>语音记账</Text>
                <Text style={styles.metricValue}>{review.voiceTransactionCount} 笔</Text>
              </View>
            </View>

            {review.topCategory ? (
              <View style={styles.categoryCard}>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>钱主要去了哪里</Text>
                  <Text style={styles.cardHint}>一级分类</Text>
                </View>
                <View style={styles.categoryMain}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${topCategory?.color ?? colors.blush}20` },
                    ]}
                  >
                    <CategoryIcon
                      color={topCategory?.color ?? colors.blushDeep}
                      icon={topCategory?.icon ?? 'other'}
                      size={25}
                      strokeWidth={1.7}
                    />
                  </View>
                  <View style={styles.categoryCopy}>
                    <View style={styles.categoryTitleRow}>
                      <Text style={styles.categoryName}>{review.topCategory.name}</Text>
                      <Text style={styles.categoryShare}>{review.topCategory.sharePercent}%</Text>
                    </View>
                    <Text style={styles.categoryAmount}>
                      ¥{formatCents(review.topCategory.amountMinor)}
                    </Text>
                  </View>
                </View>
                <View style={styles.shareTrack}>
                  <View
                    style={[
                      styles.shareFill,
                      {
                        width: `${Math.max(4, review.topCategory.sharePercent)}%`,
                        backgroundColor: topCategory?.color ?? colors.blushDeep,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.categoryNote}>
                  这是本月最大的一类支出。去统计页可以继续看这一类的二级构成。
                </Text>
              </View>
            ) : null}

            <View style={styles.voiceCard}>
              <View style={styles.voiceMark}>
                <Icon name="mic" size={19} color={colors.sage} strokeWidth={1.8} />
              </View>
              <View style={styles.voiceCopy}>
                <Text style={styles.voiceTitle}>
                  {review.voiceTransactionCount > 0
                    ? `${review.voiceTransactionCount} 笔是你说出来的`
                    : '这个月都用手动记账'}
                </Text>
                <Text style={styles.voiceBody}>
                  语音只用于当次识别，账本本身留在本机。分享卡默认也不带具体账目。
                </Text>
              </View>
            </View>

            <View style={styles.shareSection}>
              <Text style={styles.shareEyebrow}>A QUIET MONTHLY CARD</Text>
              <Text style={styles.shareTitle}>留下一张不带账目细节的月卡</Text>
              <Text style={styles.shareBody}>
                默认只展示分类占比区间、趋势方向、语音笔数和品牌入口，不显示金额、备注、商户或具体日期。
              </Text>
              <Pressable onPress={openPreview} style={styles.shareButton}>
                <Icon name="share" size={18} color={colors.surface} />
                <Text style={styles.shareButtonText}>预览并分享</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!sharing) setShareVisible(false);
        }}
        statusBarTranslucent
        transparent
        visible={shareVisible}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>分享预览</Text>
                <Text style={styles.modalHint}>这是对方实际看到的全部内容</Text>
              </View>
              <Pressable
                accessibilityLabel="关闭分享预览"
                disabled={sharing}
                onPress={() => setShareVisible(false)}
                style={styles.modalClose}
              >
                <Icon name="close" size={18} color={colors.inkSecondary} />
              </Pressable>
            </View>

            <View ref={shareCardRef} collapsable={false} style={styles.captureFrame}>
              <ShareReviewCard preview={sharePreview} />
            </View>

            <Text style={styles.privacyNote}>
              不含金额、备注、商户、分类名和具体日期。分享由你主动触发。
            </Text>
            {shareError ? <Text style={styles.shareError}>{shareError}</Text> : null}
            <Pressable
              disabled={sharing}
              onPress={() => void sharePng()}
              style={[styles.modalShareButton, sharing && styles.buttonDisabled]}
            >
              {sharing ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Icon name="share" size={18} color={colors.surface} />
              )}
              <Text style={styles.modalShareText}>
                {sharing ? '正在生成高清图片' : '分享 PNG'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  headerMonth: {
    marginTop: 2,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  headerSpace: {
    width: 44,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  hero: {
    overflow: 'hidden',
    padding: spacing.xxl,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  heroOrbLarge: {
    position: 'absolute',
    top: -92,
    right: -54,
    width: 218,
    height: 218,
    borderRadius: 109,
    backgroundColor: colors.blushDeep,
    opacity: 0.2,
  },
  heroOrbSmall: {
    position: 'absolute',
    bottom: -54,
    left: -30,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.sand,
    opacity: 0.08,
  },
  heroEyebrow: {
    color: colors.sand,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  heroTitle: {
    maxWidth: 310,
    marginTop: spacing.lg,
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 25,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  heroMeta: {
    flex: 1,
    color: 'rgba(255, 253, 248, 0.5)',
    fontSize: 9,
  },
  heroPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 253, 248, 0.06)',
  },
  heroPillText: {
    color: colors.blushSoft,
    fontSize: 8,
    fontWeight: '700',
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  totalMain: {
    flex: 1.35,
    justifyContent: 'center',
  },
  totalLabel: {
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  totalAmount: {
    marginTop: 7,
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: -1,
  },
  totalDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  totalSide: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  totalSideLabel: {
    color: colors.inkTertiary,
    fontSize: 8,
  },
  totalSideValue: {
    marginBottom: 6,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  incomeAmount: {
    color: colors.income,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  metric: {
    flex: 1,
    minHeight: 70,
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    backgroundColor: colors.surface,
  },
  metricLabel: {
    color: colors.inkTertiary,
    fontSize: 8,
  },
  metricValue: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  categoryCard: {
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
    fontSize: 13,
    fontWeight: '700',
  },
  cardHint: {
    color: colors.inkTertiary,
    fontSize: 9,
  },
  categoryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  categoryCopy: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 22,
  },
  categoryShare: {
    color: colors.blushDeep,
    fontFamily: typography.number,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryAmount: {
    marginTop: 3,
    color: colors.inkSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  shareTrack: {
    height: 7,
    overflow: 'hidden',
    marginTop: spacing.lg,
    borderRadius: 999,
    backgroundColor: colors.surfaceSunken,
  },
  shareFill: {
    height: '100%',
    borderRadius: 999,
  },
  categoryNote: {
    marginTop: spacing.md,
    color: colors.inkTertiary,
    fontSize: 9,
    lineHeight: 15,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.sageSoft,
  },
  voiceMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  voiceCopy: {
    flex: 1,
  },
  voiceTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  voiceBody: {
    marginTop: 4,
    color: colors.inkSecondary,
    fontSize: 9,
    lineHeight: 15,
  },
  shareSection: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  shareEyebrow: {
    color: colors.blushDeep,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  shareTitle: {
    marginTop: 6,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 23,
    lineHeight: 30,
  },
  shareBody: {
    marginTop: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 10,
    lineHeight: 17,
  },
  shareButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.blushDeep,
  },
  shareButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  loading: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: 80,
  },
  loadingText: {
    color: colors.inkTertiary,
    fontSize: 11,
  },
  errorCard: {
    marginTop: spacing.md,
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
    fontSize: 11,
    lineHeight: 17,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    color: colors.blushDeep,
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
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
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    backgroundColor: colors.blushDeep,
  },
  emptyButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(24, 20, 18, 0.58)',
  },
  modalSheet: {
    maxHeight: '94%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.canvas,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  modalHint: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  modalClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  captureFrame: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  privacyNote: {
    marginTop: spacing.md,
    color: colors.inkTertiary,
    fontSize: 9,
    lineHeight: 15,
    textAlign: 'center',
  },
  shareError: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  modalShareButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    borderRadius: 17,
    backgroundColor: colors.ink,
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  modalShareText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
});
