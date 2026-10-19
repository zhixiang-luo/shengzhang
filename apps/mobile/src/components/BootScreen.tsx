import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';
import { BrandMark } from './BrandMark';

export function BootScreen() {
  return (
    <View style={styles.container}>
      <BrandMark size={76} />
      <Text style={styles.title}>正在翻开账本</Text>
      <Text style={styles.caption}>说一句，就记好。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  title: {
    marginTop: spacing.xl,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 24,
  },
  caption: {
    marginTop: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 12,
  },
});
