import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/BrandMark';
import { colors, spacing, typography } from '../theme/tokens';

export default function FoundationScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <BrandMark size={72} />
        <Text style={styles.eyebrow}>VOICE-FIRST LEDGER</Text>
        <Text style={styles.title}>说一句，{'\n'}就记好。</Text>
        <Text style={styles.description}>
          移动端工程骨架已就绪。下一步接入本地账本、语音录制与分类统计。
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>当前阶段</Text>
          <Text style={styles.cardValue}>Foundation</Text>
          <Text style={styles.cardNote}>Expo 58 · React Native 0.88 · TypeScript 6</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  eyebrow: {
    marginTop: spacing.xxl,
    color: colors.blushDeep,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 52,
    lineHeight: 60,
    letterSpacing: -2,
  },
  description: {
    maxWidth: 300,
    marginTop: spacing.lg,
    color: colors.inkSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    marginTop: spacing.xxxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.xxl,
    backgroundColor: colors.surface,
  },
  cardLabel: {
    color: colors.inkTertiary,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  cardValue: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontSize: 24,
    fontWeight: '600',
  },
  cardNote: {
    marginTop: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 12,
  },
});
