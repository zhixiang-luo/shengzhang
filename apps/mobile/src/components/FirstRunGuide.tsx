import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '../theme/tokens';
import { AnimatedSheetModal } from './AnimatedSheetModal';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';

export function FirstRunGuide({
  visible,
  onDismiss,
  onManual,
}: {
  visible: boolean;
  onDismiss: () => void;
  onManual: () => void;
}) {
  const insets = useSafeAreaInsets();
  const pendingManualRef = useRef(false);

  return (
    <AnimatedSheetModal
      closeAccessibilityLabel="关闭首次使用说明"
      onClosed={() => {
        if (!pendingManualRef.current) return;
        pendingManualRef.current = false;
        onManual();
      }}
      onRequestClose={onDismiss}
      sheetStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
      visible={visible}
    >
      <View style={styles.handle} />
      <View style={styles.hero}>
        <BrandMark size={58} />
        <Text style={styles.eyebrow}>第一次见面</Text>
        <Text style={styles.title}>按住说一句，松手就记好</Text>
        <Text style={styles.body}>
          金额、分类和时间会自动整理。发现不对，可以马上修改。
        </Text>
      </View>

      <View style={styles.steps}>
        <GuideStep icon="mic" title="按住底部按钮" detail="比如：“午饭二十五，打车十八”" />
        <GuideStep icon="check" title="松手自动入账" detail="一次最多整理 5 笔，8 秒内可撤销" />
        <GuideStep
          icon="ledger"
          title="不想说也可以手动"
          detail="按住语音按钮向右滑，空账本也可以点“加一笔”"
        />
      </View>

      <Text style={styles.privacy}>
        录音只用于本次识别，处理完成后丢弃。账本默认保存在本机。
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            pendingManualRef.current = true;
            onDismiss();
          }}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryActionText}>手动记一笔</Text>
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>知道了</Text>
        </Pressable>
      </View>
    </AnimatedSheetModal>
  );
}

function GuideStep({
  icon,
  title,
  detail,
}: {
  icon: 'mic' | 'check' | 'ledger';
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>
        <Icon name={icon} size={17} color={colors.blushDeep} strokeWidth={2} />
      </View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.canvas,
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  eyebrow: {
    marginTop: spacing.md,
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 5,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 25,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  body: {
    maxWidth: 310,
    marginTop: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  steps: {
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  step: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  stepIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.blushSoft,
  },
  stepCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  stepDetail: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
  },
  privacy: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 17,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  secondaryAction: {
    minHeight: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  secondaryActionText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryAction: {
    minHeight: 50,
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
