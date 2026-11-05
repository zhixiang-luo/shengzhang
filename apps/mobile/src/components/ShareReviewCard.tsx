import { StyleSheet, Text, View } from 'react-native';

import type { ReviewSharePreview } from '../features/review/shareCard';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { BrandMark } from './BrandMark';

export function ShareReviewCard({ preview }: { preview: ReviewSharePreview }) {
  return (
    <View collapsable={false} style={styles.card}>
      <View pointerEvents="none" style={styles.orbLarge} />
      <View pointerEvents="none" style={styles.orbSmall} />
      <View pointerEvents="none" style={styles.contour} />

      <View style={styles.topRow}>
        <Text style={styles.month}>{preview.monthLabel}</Text>
        <Text style={styles.eyebrow}>说一句，就记好。</Text>
      </View>

      <View style={styles.mark}>
        <BrandMark size={72} />
      </View>

      <Text style={styles.headline}>{preview.headline}</Text>

      <View style={styles.facts}>
        <View style={styles.factRow}>
          <Text style={styles.factMark}>◌</Text>
          <Text style={styles.factText}>{preview.categoryLine}</Text>
        </View>
        <View style={styles.factRow}>
          <Text style={styles.factMark}>⌁</Text>
          <Text style={styles.factText}>{preview.trendLine}</Text>
        </View>
        {preview.voiceLine ? (
          <View style={styles.factRow}>
            <Text style={styles.factMark}>声</Text>
            <Text style={styles.factText}>{preview.voiceLine}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.brand}>声账</Text>
          <Text style={styles.cta}>{preview.cta}</Text>
        </View>
        <View style={styles.voicePill}>
          <View style={styles.voiceDot} />
          <Text style={styles.voicePillText}>VOICE FIRST</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 4 / 5,
    overflow: 'hidden',
    padding: spacing.xxl,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  orbLarge: {
    position: 'absolute',
    top: -82,
    right: -58,
    width: 236,
    height: 236,
    borderRadius: 118,
    backgroundColor: colors.blushDeep,
    opacity: 0.22,
  },
  orbSmall: {
    position: 'absolute',
    bottom: -72,
    left: -42,
    width: 174,
    height: 174,
    borderRadius: 87,
    backgroundColor: colors.sand,
    opacity: 0.1,
  },
  contour: {
    position: 'absolute',
    top: 86,
    right: 22,
    width: 92,
    height: 92,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 248, 0.09)',
    borderRadius: 46,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  month: {
    color: colors.sand,
    fontFamily: typography.number,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  eyebrow: {
    color: 'rgba(255, 253, 248, 0.46)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  mark: {
    marginTop: spacing.xxl,
  },
  headline: {
    maxWidth: 280,
    marginTop: spacing.lg,
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 28,
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  facts: {
    gap: 10,
    marginTop: spacing.xl,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  factMark: {
    width: 19,
    color: colors.blushSoft,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  factText: {
    flex: 1,
    color: 'rgba(255, 253, 248, 0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    right: spacing.xxl,
    bottom: spacing.xxl,
    left: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  brand: {
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 22,
  },
  cta: {
    marginTop: 3,
    color: colors.blushSoft,
    fontSize: 10,
  },
  voicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 248, 0.15)',
    borderRadius: 999,
  },
  voiceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.sage,
  },
  voicePillText: {
    color: 'rgba(255, 253, 248, 0.46)',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
