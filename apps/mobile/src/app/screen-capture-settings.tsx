import {
  getScreenCaptureStatus,
  openAccessibilitySettings,
  requestQuickSettingsTile,
  type ScreenCaptureStatus,
} from '@shengzhang/screen-capture';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, AppState, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { useDatabase } from '../db/DatabaseProvider';
import { getScreenCloudConsent, setScreenCloudConsent } from '../services/screenBillApi';
import { synchronizeScreenOverlay } from '../services/screenOverlayConfiguration';
import { colors, radii, spacing, typography } from '../theme/tokens';

export default function ScreenCaptureSettingsScreen() {
  const db = useDatabase();
  const [status, setStatus] = useState<ScreenCaptureStatus | null>(null);
  const [requestingTile, setRequestingTile] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);

  const refresh = useCallback(() => {
    void getScreenCaptureStatus().then(setStatus).catch(() => setStatus(null));
    void getScreenCloudConsent().then(setCloudEnabled).catch(() => setCloudEnabled(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const state = AppState.addEventListener('change', (value) => { if (value === 'active') refresh(); });
      // Android's notification shade does not always change AppState. Its focus
      // event also refreshes manual tile additions/removals made in System UI.
      const focus = Platform.OS === 'android' ? AppState.addEventListener('focus', refresh) : null;
      return () => { state.remove(); focus?.remove(); };
    }, [refresh]),
  );

  const openAccessibility = () => withCloudConsent(async () => {
    await synchronizeScreenOverlay(db.$client.databasePath);
    await openAccessibilitySettings();
  });

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
      refresh();
    }
  };

  const supported = status?.supported === true;
  const accessibilityEnabled = status?.accessibilityEnabled === true;
  const accessibilityReady = accessibilityEnabled && status?.accessibilityConnected !== false;
  const tileAdded = status?.tileAdded === true;
  const ios = Platform.OS === 'ios';
  const runAction = (action: () => Promise<void>) => {
    void action().then(refresh).catch((error: unknown) => {
      Alert.alert('暂时未完成', error instanceof Error ? error.message : '请重试，或在系统设置中检查声账权限。');
      refresh();
    });
  };
  const withCloudConsent = (action: () => Promise<void>) => {
    if (cloudEnabled) { runAction(action); return; }
    Alert.alert('开启快捷记账', '点击快捷入口后，声账会把当前截图发送到云端视觉模型，直接提取金额、内容、时间和分类。截图可能含姓名、余额、卡号，建议遮盖无关信息再分享。声账服务不长期保存图片，供应商按其条款处理。同意一次后每次点击直接识别，可随时关闭。', [
      { text: '暂不开启', style: 'cancel' },
      { text: '同意并开启', onPress: () => runAction(async () => {
        await setScreenCloudConsent(true);
        setCloudEnabled(true);
        await synchronizeScreenOverlay(db.$client.databasePath);
        await action();
      }) },
    ]);
  };
  const changeCloud = (enabled: boolean) => {
    if (enabled) { withCloudConsent(async () => undefined); return; }
    runAction(async () => {
      await setScreenCloudConsent(false);
      setCloudEnabled(false);
    });
  };
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
          <Text style={styles.heroEyebrow}>付款之后，顺手记好</Text>
          <Text style={styles.heroTitle}>留在付款页，就记好</Text>
          <Text style={styles.heroText}>
            在付款详情页点“声账记账”，核对金额、内容和时间。点一次“确定收好了”就入账，卡片自动收起。
          </Text>
        </View>

        {supported ? (
          <View style={styles.setupGroup}>
            <Pressable
              disabled={accessibilityReady}
              onPress={openAccessibility}
              style={[styles.setupRow, accessibilityReady && styles.setupRowDone]}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{accessibilityReady ? '✓' : '1'}</Text>
              </View>
              <View style={styles.setupCopy}>
                <Text style={styles.setupTitle}>开启“声账快捷记账”</Text>
                <Text style={styles.setupText}>
                  {accessibilityReady
                    ? '服务已开启，只有点击记账入口时才截图。'
                    : accessibilityEnabled
                      ? '服务正在连接；若长时间未就绪，可点此重新检查。'
                    : '用于主动截图和原页面确认卡，不会自动读取账单。'}
                </Text>
              </View>
              {!accessibilityReady ? (
                <Icon name="chevron-right" size={15} color={colors.inkTertiary} />
              ) : null}
            </Pressable>

            <View style={styles.divider} />

            <Pressable disabled={requestingTile || tileAdded} onPress={() => void addTile()} style={[styles.setupRow, tileAdded && styles.setupRowDone]}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{tileAdded ? '✓' : '2'}</Text>
              </View>
              <View style={styles.setupCopy}>
                <Text style={styles.setupTitle}>{tileAdded ? '已添加控制中心磁贴' : '添加控制中心磁贴'}</Text>
                <Text style={styles.setupText}>
                  {tileAdded
                    ? '下拉控制中心，点“声账记账”即可使用。'
                    : requestingTile
                    ? '正在请求系统添加…'
                    : status?.autoAddTileSupported
                      ? '点此添加；如果已经添加，系统会确认当前状态。'
                      : status?.tileAdded == null
                        ? '在控制中心编辑菜单里添加“声账记账”。已添加过？展开一次控制中心即可同步状态。'
                        : '下拉控制中心 → 编辑磁贴 → 添加“声账记账”。'}
                </Text>
              </View>
              {!tileAdded ? <View style={styles.tileAddPill}>
                <Text style={styles.tileAddText}>添加</Text>
              </View> : null}
            </Pressable>
          </View>
        ) : (
          <View style={styles.unsupportedCard}>
            <Text style={styles.unsupportedTitle}>
              {status === null ? '正在检查系统能力…' : ios ? 'iPhone 的系统限制' : '当前运行环境无法读取付款页'}
            </Text>
            <Text style={styles.unsupportedText}>
              {status === null ? '请稍候，正在确认快捷记账是否可用。' : ios
                ? 'iOS 不允许普通 App 静默读取其他 App 的屏幕。后续会通过“快捷指令截屏 → 声账确认”接入，不需要开无障碍权限。'
                : '付款页快捷记账需要包含原生模块的 Android 11+ 安装包，Expo Go 和网页预览无法使用真实读屏。'}
            </Text>
          </View>
        )}

        {supported ? <>
          <Text style={styles.gestureHint}>部分手机支持在系统设置中，把轻点背面、侧键等手势绑定到快捷动作。可用选项因机型而异，控制中心磁贴可直接使用。</Text>
          {status?.lastCaptureMessage && status.lastCaptureCode?.startsWith('ERROR_') ? <View style={styles.lastCapture}>
            <Text style={styles.setupTitle}>最近一次识别</Text>
            <Text style={styles.setupText}>{status.lastCaptureMessage}{status.lastCaptureCode ? `（${status.lastCaptureCode}）` : ''}</Text>
          </View> : null}
        </> : null}

        <Text style={styles.sectionLabel}>识别方式</Text>
        <View style={styles.statusCard}>
          <View style={styles.setupRow}>
            <View style={styles.setupCopy}>
              <Text style={styles.setupTitle}>云端图片识别</Text>
              <Text style={styles.setupText}>识别当前付款页的金额、内容和时间。首次同意后直接识别；关闭后可手动或语音记账。</Text>
            </View>
            <Switch accessibilityLabel="云端图片识别" value={cloudEnabled} onValueChange={changeCloud} trackColor={{ true: colors.blushDeep }} />
          </View>
        </View>
        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>也可以不开无障碍</Text>
          <Text style={styles.privacyText}>{status?.imageExportSupported
            ? '在账单详情页正常截图，从系统分享面板选择“声账 · 记一笔”。只读取这次分享的图片，不读取整个相册。能正常截图的银行单笔详情也可通过此入口尝试识别。'
            : '新版 Android 安装包支持“截图 → 系统分享 → 声账 · 记一笔”，也支持云端截图识别；当前安装包可能需要更新。银行的安全页面若禁止截图，则需使用手动或语音记账。'}</Text>
        </View>

        <Text style={styles.sectionLabel}>看一眼确认卡</Text>
        <Pressable onPress={() => router.push('/screen-capture?demo=1')} style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Icon name="ledger" size={20} color={colors.blushDeep} />
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>打开微信支付示例</Text>
            <Text style={styles.previewText}>查看应用内分享确认卡，预览不写账本。</Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.inkTertiary} />
        </Pressable>

        <Text style={styles.sectionLabel}>使用方式</Text>
        <View style={styles.stepsCard}>
          <Step index="01" title="打开单笔付款详情" text="保留金额和交易状态；安全页面可能不允许截图。" />
          <Step index="02" title="下拉控制中心，点声账记账" text="磁贴会收起控制中心，再读取当前页面。" />
          <Step index="03" title="点一次确定收好了" text="保存成功卡片自动收起；需要删除时到账本操作。" />
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>隐私边界</Text>
          <Text style={styles.privacyText}>
            只在你主动点击时采集当前微信或支付宝页面，开启云端后发送本次截图，不发送历史账本。图片可能包含订单号、余额等信息，没有自动脱敏。临时草稿五分钟后失效，保存或取消后清理；系统截图原图由你管理。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  gestureHint: {
    marginTop: spacing.md,
    color: colors.inkSecondary,
    fontSize: 11,
    lineHeight: 18,
  },
  lastCapture: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.sageSoft,
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
