import {
  getScreenCaptureStatus,
  openAccessibilitySettings,
  requestQuickSettingsTile,
  type ScreenCaptureStatus,
} from '@shengzhang/screen-capture';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { colors, radii, spacing, typography } from '../theme/tokens';

export default function ScreenCaptureSettingsScreen() {
  const [status, setStatus] = useState<ScreenCaptureStatus | null>(null);
  const [requestingTile, setRequestingTile] = useState(false);

  const refresh = useCallback(() => {
    void getScreenCaptureStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openAccessibility = () => {
    void openAccessibilitySettings().catch(() => {
      Alert.alert('无法打开设置', '请在系统设置 → 无障碍 → 已下载的应用中找到“声账”。');
    });
  };

  const addTile = async () => {
    if (requestingTile) return;
    setRequestingTile(true);
    try {
      const opened = await requestQuickSettingsTile();
      if (!opened) {
        Alert.alert(
          '手动添加磁贴',
          '下拉控制中心，点击编辑按钮，把“声账记账”拖到常用磁贴中。',
        );
      }
    } catch {
      Alert.alert('暂时无法自动添加', '请下拉控制中心，点击编辑按钮并手动添加“声账记账”。');
    } finally {
      setRequestingTile(false);
    }
  };

  const supported = status?.supported === true;
  const accessibilityEnabled = status?.accessibilityEnabled === true;
  const ios = Platform.OS === 'ios';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="返回">
          <Icon name="back" size={20} color={colors.inkSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>付款页快捷记账</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="ledger" size={25} color={colors.blushDeep} />
          </View>
          <Text style={styles.heroEyebrow}>ONE TAP, ONE BILL</Text>
          <Text style={styles.heroTitle}>付完款，点一下“声账记账”</Text>
          <Text style={styles.heroText}>
            在微信或支付宝付款成功页下拉控制中心，点一下磁贴。声账会读取当前页面的金额、时间和商户，先让你确认，再写入账本。
          </Text>
        </View>

        <View style={styles.statusCard}>
          <StatusRow
            label="系统能力"
            ready={supported}
            value={
              status === null
                ? '检查中…'
                : supported
                  ? `Android ${status.androidApi}`
                  : ios
                    ? 'iPhone 需快捷指令'
                    : '当前环境不支持'
            }
          />
          <StatusRow
            label="读取服务"
            ready={accessibilityEnabled}
            value={accessibilityEnabled ? '已开启' : '未开启'}
            last
          />
        </View>

        {supported ? (
          <View style={styles.setupGroup}>
            <Pressable
              disabled={accessibilityEnabled}
              onPress={openAccessibility}
              style={[styles.setupRow, accessibilityEnabled && styles.setupRowDone]}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{accessibilityEnabled ? '✓' : '1'}</Text>
              </View>
              <View style={styles.setupCopy}>
                <Text style={styles.setupTitle}>开启“声账快捷记账”</Text>
                <Text style={styles.setupText}>
                  {accessibilityEnabled
                    ? '服务已开启，只有点击磁贴时才会读取。'
                    : '仅用于读取微信、支付宝付款结果页，不会后台持续监听。'}
                </Text>
              </View>
              {!accessibilityEnabled ? (
                <Icon name="chevron-right" size={15} color={colors.inkTertiary} />
              ) : null}
            </Pressable>

            <View style={styles.divider} />

            <Pressable disabled={requestingTile} onPress={() => void addTile()} style={styles.setupRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.setupCopy}>
                <Text style={styles.setupTitle}>添加控制中心磁贴</Text>
                <Text style={styles.setupText}>
                  {requestingTile
                    ? '正在请求系统添加…'
                    : status?.autoAddTileSupported
                      ? '点这里尝试自动添加，也可以在控制中心编辑菜单里手动添加。'
                      : '下拉控制中心 → 编辑磁贴 → 添加“声账记账”。'}
                </Text>
              </View>
              <View style={styles.tileAddPill}>
                <Text style={styles.tileAddText}>添加</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.unsupportedCard}>
            <Text style={styles.unsupportedTitle}>
              {ios ? 'iPhone 的系统限制' : '当前运行环境无法读取付款页'}
            </Text>
            <Text style={styles.unsupportedText}>
              {ios
                ? 'iOS 不允许普通 App 静默读取其他 App 的屏幕。后续会通过“快捷指令截屏 → 声账确认”接入，不需要开无障碍权限。'
                : '付款页快捷记账需要包含原生模块的 Android 11+ 安装包，Expo Go 和网页预览无法使用真实读屏。'}
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>看一眼确认卡</Text>
        <Pressable onPress={() => router.push('/screen-capture?demo=1')} style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Icon name="ledger" size={20} color={colors.blushDeep} />
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>打开微信支付示例</Text>
            <Text style={styles.previewText}>金额、分类、时间都能改；预览不会写入账本。</Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.inkTertiary} />
        </Pressable>

        <Text style={styles.sectionLabel}>使用方式</Text>
        <View style={styles.stepsCard}>
          <Step index="01" title="付完款停在成功页" text="微信、支付宝的常见付款结果页都可以。" />
          <Step index="02" title="下拉控制中心，点声账记账" text="磁贴会收起控制中心，再读取当前页面。" />
          <Step index="03" title="核对后记好这一笔" text="保存后还能在原地撤销，不会连续弹确认框。" />
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>隐私边界</Text>
          <Text style={styles.privacyText}>
            只读取白名单里的微信和支付宝；不读取订单号、余额或银行卡信息；截图不存相册、不上传，最长保留 5 分钟后自动清理。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({
  label,
  value,
  ready,
  last = false,
}: {
  label: string;
  value: string;
  ready: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.statusRow, !last && styles.statusDivider]}>
      <View style={styles.statusName}>
        <View style={[styles.statusDot, ready ? styles.statusDotReady : styles.statusDotOff]} />
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      <Text style={[styles.statusValue, ready && styles.statusValueReady]}>{value}</Text>
    </View>
  );
}

function Step({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepIndex}>{index}</Text>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
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
    fontSize: 20,
  },
  headerSpace: {
    width: 44,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heroIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.blushSoft,
  },
  heroEyebrow: {
    marginTop: spacing.lg,
    color: colors.blushDeep,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroTitle: {
    marginTop: 6,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  heroText: {
    maxWidth: 410,
    marginTop: spacing.md,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  statusCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  statusRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  statusDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statusName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotReady: {
    backgroundColor: colors.income,
  },
  statusDotOff: {
    backgroundColor: colors.sand,
  },
  statusLabel: {
    color: colors.inkSecondary,
    fontSize: 12,
  },
  statusValue: {
    color: colors.inkTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusValueReady: {
    color: colors.income,
  },
  setupGroup: {
    marginTop: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  setupRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  setupRowDone: {
    opacity: 0.75,
  },
  stepNumber: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.blushSoft,
  },
  stepNumberText: {
    color: colors.blushDeep,
    fontSize: 11,
    fontWeight: '800',
  },
  setupCopy: {
    flex: 1,
  },
  setupTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  setupText: {
    marginTop: 4,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 15,
  },
  tileAddPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.blushSoft,
  },
  tileAddText: {
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
    backgroundColor: colors.border,
  },
  unsupportedCard: {
    marginTop: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#EBDCC4',
    borderRadius: radii.lg,
    backgroundColor: '#FFF8ED',
  },
  unsupportedTitle: {
    color: '#70502B',
    fontSize: 13,
    fontWeight: '700',
  },
  unsupportedText: {
    marginTop: spacing.sm,
    color: '#8D7253',
    fontSize: 11,
    lineHeight: 18,
  },
  sectionLabel: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  previewCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  previewIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.blushSoft,
  },
  previewCopy: {
    flex: 1,
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  previewText: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 10,
  },
  stepsCard: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepIndex: {
    width: 24,
    color: colors.blushDeep,
    fontFamily: typography.number,
    fontSize: 10,
    fontWeight: '700',
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 15,
  },
  privacyCard: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.sageSoft,
  },
  privacyTitle: {
    color: colors.income,
    fontSize: 12,
    fontWeight: '700',
  },
  privacyText: {
    marginTop: 6,
    color: '#61735D',
    fontSize: 10,
    lineHeight: 16,
  },
});
