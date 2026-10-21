import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { listCategories } from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import { countTransactions } from '../db/transactionRepository';
import {
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  trackAnalyticsEvent,
} from '../services/analytics';
import { colors, radii, spacing, typography } from '../theme/tokens';

export default function SettingsScreen() {
  const db = useDatabase();
  const [transactionCount, setTransactionCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [analyticsEnabled, setAnalyticsEnabledState] = useState(true);

  useEffect(() => {
    trackAnalyticsEvent('settings_opened');
    void isAnalyticsEnabled().then(setAnalyticsEnabledState);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setTransactionCount(countTransactions(db));
      setCategoryCount(listCategories(db).length);
    }, [db]),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="返回">
          <Icon name="back" size={20} color={colors.inkSecondary} />
        </Pressable>
        <Text style={styles.title}>设置</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>本机数据</Text>
        <View style={styles.group}>
          <SettingRow label="账单" value={`${transactionCount} 笔`} />
          <SettingRow label="分类" value={`${categoryCount} 个`} last />
        </View>
        <Text style={styles.note}>账本保存在本机，可离线记收入和支出。</Text>

        <Text style={styles.sectionLabel}>分类</Text>
        <View style={styles.group}>
          <SettingRow
            label="分类管理"
            value="新增、改名、隐藏"
            last
            onPress={() => router.push('/categories')}
          />
        </View>

        <Text style={styles.sectionLabel}>数据与账号</Text>
        <View style={styles.group}>
          <SettingRow label="本地导出与恢复" value="下一阶段" />
          <SettingRow label="账号与云备份" value="后续版本" />
          <SettingRow label="微信登录" value="暂缓评估" last />
        </View>

        <Text style={styles.sectionLabel}>隐私</Text>
        <View style={styles.group}>
          <View style={[styles.row, styles.analyticsRow]}>
            <View style={styles.analyticsCopy}>
              <Text style={styles.rowLabel}>匿名使用统计</Text>
              <Text style={styles.analyticsHint}>只记录功能次数和账单条数，不含金额、分类、备注或录音。</Text>
            </View>
            <Switch
              accessibilityLabel="匿名使用统计"
              onValueChange={(value) => {
                setAnalyticsEnabledState(value);
                void setAnalyticsEnabled(value);
              }}
              thumbColor={colors.surface}
              trackColor={{ false: colors.surfaceSunken, true: colors.blush }}
              value={analyticsEnabled}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>关于</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutName}>声账</Text>
          <Text style={styles.aboutTagline}>说一句，就记好。</Text>
          <Text style={styles.aboutVersion}>
            MVP {Constants.expoConfig?.version ?? '0.1.1'} · Expo 58
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  label,
  value,
  last = false,
  onPress,
}: {
  label: string;
  value: string;
  last?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowTrailing}>
        <Text style={styles.rowValue}>{value}</Text>
        {onPress ? <Icon name="chevron-right" size={15} color={colors.inkTertiary} /> : null}
      </View>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.rowPressed]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={[styles.row, !last && styles.rowDivider]}>{content}</View>;
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
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 21,
  },
  headerSpace: {
    width: 44,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  sectionLabel: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  group: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    color: colors.ink,
    fontSize: 14,
  },
  rowValue: {
    color: colors.inkTertiary,
    fontSize: 12,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowPressed: {
    backgroundColor: colors.canvas,
  },
  analyticsRow: {
    minHeight: 76,
    gap: spacing.lg,
  },
  analyticsCopy: {
    flex: 1,
  },
  analyticsHint: {
    marginTop: 4,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
  },
  note: {
    marginTop: spacing.sm,
    paddingHorizontal: 4,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
  },
  aboutCard: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  aboutName: {
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 27,
  },
  aboutTagline: {
    marginTop: 5,
    color: colors.blushSoft,
    fontSize: 12,
  },
  aboutVersion: {
    marginTop: spacing.xl,
    color: 'rgba(255, 253, 248, 0.46)',
    fontSize: 10,
  },
});
