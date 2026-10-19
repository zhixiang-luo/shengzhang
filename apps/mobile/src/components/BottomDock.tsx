import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/tokens';
import { Icon } from './Icon';

type BottomDockProps = {
  active: 'ledger' | 'stats';
  onVoice: () => void;
};

export function BottomDock({ active, onVoice }: BottomDockProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: active === 'ledger' }}
          onPress={() => router.replace('/')}
          style={styles.item}
        >
          <Icon name="ledger" color={active === 'ledger' ? colors.blushDeep : colors.inkTertiary} size={21} />
          <Text style={[styles.label, active === 'ledger' && styles.activeLabel]}>账本</Text>
        </Pressable>

        <View style={styles.centerSpace} />

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: active === 'stats' }}
          onPress={() => router.replace('/stats')}
          style={styles.item}
        >
          <Icon name="chart" color={active === 'stats' ? colors.blushDeep : colors.inkTertiary} size={21} />
          <Text style={[styles.label, active === 'stats' && styles.activeLabel]}>统计</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel="语音记账"
        accessibilityHint="语音功能将在下一阶段接入，当前可先手动记账"
        onPress={onVoice}
        style={({ pressed }) => [styles.voice, pressed && styles.voicePressed]}
      >
        <Icon name="mic" color={colors.surface} size={27} strokeWidth={2} />
        <View style={styles.voiceDot} />
      </Pressable>
      <Text style={styles.voiceLabel}>说一句</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(255, 253, 248, 0.96)',
    paddingHorizontal: 48,
    paddingTop: 9,
  },
  item: {
    width: 78,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.blushDeep,
  },
  centerSpace: {
    width: 92,
  },
  voice: {
    position: 'absolute',
    bottom: 34,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: colors.blushDeep,
    borderWidth: 5,
    borderColor: colors.canvas,
    shadowColor: colors.blushDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    elevation: 8,
  },
  voicePressed: {
    transform: [{ scale: 0.94 }],
  },
  voiceLabel: {
    position: 'absolute',
    bottom: 13,
    right: 0,
    left: 0,
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  voiceDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sand,
    borderWidth: 2,
    borderColor: colors.blushDeep,
  },
});
