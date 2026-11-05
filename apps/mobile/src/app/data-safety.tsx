import { buildBackupDocument, buildTransactionsCsv, parseBackupText } from '@shengzhang/domain';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import {
  clearLocalLedger,
  markExportCompleted,
  readLastExportAt,
  readLocalSnapshot,
  restoreLocalSnapshot,
} from '../db/dataSafetyRepository';
import { useDatabase } from '../db/DatabaseProvider';
import {
  buildClearConfirmation,
  buildRestoreConfirmation,
  formatDataSafetyError,
  formatLastExportAt,
} from '../features/dataSafety/dataSafetyMessages';
import { trackAnalyticsEvent } from '../services/analytics';
import { pickBackupFile, shareTextFile } from '../services/dataSafetyFiles';
import { colors, radii, spacing, typography } from '../theme/tokens';

type BusyAction = 'json' | 'csv' | 'restore' | 'clear' | null;

function confirmAction(title: string, message: string, confirmText: string) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: '取消', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: 'destructive',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export default function DataSafetyScreen() {
  const db = useDatabase();
  const [transactionCount, setTransactionCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await readLocalSnapshot(db);
      setTransactionCount(snapshot.transactions.filter((transaction) => !transaction.deletedAt).length);
      setCategoryCount(snapshot.categories.length);
      setLastExportAt(await readLastExportAt(db));
      setError(null);
    } catch (caught) {
      setError(formatDataSafetyError(caught));
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      trackAnalyticsEvent('data_safety_opened');
      void refresh();
    }, [refresh]),
  );

  const exportJson = async () => {
    setBusy('json');
    setError(null);
    try {
      const exportedAt = new Date().toISOString();
      const document = buildBackupDocument({
        exportedAt,
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        data: await readLocalSnapshot(db),
      });
      await shareTextFile({
        content: JSON.stringify(document, null, 2),
        fileName: `声账备份-${exportedAt.slice(0, 10)}.json`,
        mimeType: 'application/json',
        dialogTitle: '保存声账备份',
      });
      await markExportCompleted(db, exportedAt);
      setLastExportAt(exportedAt);
      trackAnalyticsEvent('data_backup_exported');
      Alert.alert('备份已生成', '请把 JSON 文件保存到云盘或电脑；这个文件可以完整恢复账本。');
    } catch (caught) {
      setError(formatDataSafetyError(caught));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    setBusy('csv');
    setError(null);
    try {
      const snapshot = await readLocalSnapshot(db);
      const categoryMap = new Map(snapshot.categories.map((category) => [category.id, category]));
      const csv = buildTransactionsCsv(
        snapshot.transactions
          .filter((transaction) => !transaction.deletedAt)
          .map((transaction) => ({
            occurredAt: transaction.occurredAt,
            type: transaction.type,
            amountMinor: transaction.amountMinor,
            categoryName: categoryMap.get(transaction.categoryId)?.name ?? '其他',
            subcategoryName: transaction.subcategoryId
              ? categoryMap.get(transaction.subcategoryId)?.name ?? null
              : null,
            note: transaction.note,
            source: transaction.source,
          })),
      );
      await shareTextFile({
        content: csv,
        fileName: `声账账单-${new Date().toISOString().slice(0, 10)}.csv`,
        mimeType: 'text/csv',
        dialogTitle: '导出账单 CSV',
      });
      trackAnalyticsEvent('data_csv_exported');
    } catch (caught) {
      setError(formatDataSafetyError(caught));
    } finally {
      setBusy(null);
    }
  };

  const restoreJson = async () => {
    setBusy('restore');
    setError(null);
    try {
      const picked = await pickBackupFile();
      if (!picked) return;
      const backup = parseBackupText(picked.text);
      const confirmation = buildRestoreConfirmation(backup, transactionCount);
      if (!(await confirmAction(confirmation.title, confirmation.message, '继续恢复'))) return;
      if (
        transactionCount > 0 &&
        !(await confirmAction(
          '最后确认覆盖',
          '恢复会替换当前本机账本。这个操作无法撤销，请确认已经导出当前数据。',
          '确认覆盖',
        ))
      ) {
        return;
      }
      await restoreLocalSnapshot(db, backup.data);
      await refresh();
      trackAnalyticsEvent('data_backup_restored');
      Alert.alert('恢复完成', `已恢复 ${backup.counts.transactions} 笔账单和 ${backup.counts.categories} 个分类。`);
    } catch (caught) {
      setError(formatDataSafetyError(caught));
    } finally {
      setBusy(null);
    }
  };

  const clearLedger = async () => {
    setBusy('clear');
    setError(null);
    try {
      const first = buildClearConfirmation(transactionCount);
      if (!(await confirmAction(first.title, first.message, '继续'))) return;
      if (
        !(await confirmAction(
          '确认永久清空',
          '清空后账单无法恢复，内置分类会重新出现。确定继续吗？',
          '永久清空',
        ))
      ) {
        return;
      }
      await clearLocalLedger(db);
      await refresh();
      trackAnalyticsEvent('local_ledger_cleared');
      Alert.alert('本机账本已清空', '内置分类已经恢复。');
    } catch (caught) {
      setError(formatDataSafetyError(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="返回">
          <Icon name="back" size={20} color={colors.inkSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>数据安全</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.heroOrb} />
          <Text style={styles.heroEyebrow}>YOUR DATA, YOURS TO KEEP</Text>
          <Text style={styles.heroTitle}>账本默认只保存在本机，{'\n'}你可以随时带走。</Text>
          <Text style={styles.heroBody}>
            录音只用于本次识别，完成后丢弃。JSON 备份包含完整账本，CSV 适合用 Excel 或 WPS 查看。
          </Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{transactionCount}</Text>
            <Text style={styles.statLabel}>本机账单</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{categoryCount}</Text>
            <Text style={styles.statLabel}>分类</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.lastExport}>{formatLastExportAt(lastExportAt)}</Text>
            <Text style={styles.statLabel}>最近导出</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>数据操作没有完成</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>带走与恢复</Text>
        <View style={styles.group}>
          <ActionRow
            busy={busy === 'json'}
            description="完整账单、分类、排序和语音批次关联。恢复时覆盖当前账本。"
            label="导出 JSON 备份"
            onPress={() => void exportJson()}
          />
          <ActionRow
            busy={busy === 'csv'}
            description="适合用 Excel 或 WPS 查看中文账单，不作为恢复格式。"
            label="导出 CSV 账单"
            onPress={() => void exportCsv()}
          />
          <ActionRow
            busy={busy === 'restore'}
            description="选择之前导出的声账 JSON；文件损坏时不会改动现有账本。"
            label="从 JSON 恢复"
            onPress={() => void restoreJson()}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>危险操作</Text>
        <View style={styles.group}>
          <ActionRow
            busy={busy === 'clear'}
            danger
            description="永久删除本机账单、分类排序和语音批次；无法从服务器找回。"
            label="清空本机账本"
            onPress={() => void clearLedger()}
            last
          />
        </View>

        <Text style={styles.footnote}>
          当前版本没有云备份。换机前请先导出 JSON，并在新设备安装声账后恢复。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  label,
  description,
  busy,
  danger = false,
  last = false,
  onPress,
}: {
  label: string;
  description: string;
  busy: boolean;
  danger?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        !last && styles.actionDivider,
        pressed && styles.actionPressed,
      ]}
    >
      <View style={styles.actionCopy}>
        <Text style={[styles.actionLabel, danger && styles.dangerText]}>{label}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={danger ? colors.danger : colors.blushDeep} />
      ) : (
        <Icon name="chevron-right" size={17} color={colors.inkTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  hero: {
    overflow: 'hidden',
    marginTop: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  heroOrb: {
    position: 'absolute',
    top: -78,
    right: -48,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.blushDeep,
    opacity: 0.2,
  },
  heroEyebrow: {
    color: colors.sand,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    marginTop: spacing.md,
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 27,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  heroBody: {
    marginTop: spacing.md,
    color: 'rgba(255, 253, 248, 0.66)',
    fontSize: 12,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  stat: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  statValue: {
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 23,
    fontWeight: '700',
  },
  lastExport: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    marginTop: 4,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBody: {
    marginTop: 5,
    color: colors.inkSecondary,
    fontSize: 11,
    lineHeight: 18,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: 2,
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  group: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  actionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actionPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  actionDescription: {
    marginTop: 5,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
  },
  dangerText: {
    color: colors.danger,
  },
  footnote: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 17,
    textAlign: 'center',
  },
});
