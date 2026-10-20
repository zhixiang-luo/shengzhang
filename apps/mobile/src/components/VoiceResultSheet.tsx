import { formatCents, summarizeAmounts } from '@shengzhang/domain';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '../db/DatabaseProvider';
import { createVoiceBatch } from '../db/transactionRepository';
import { useVoiceResultStore } from '../stores/voiceResultStore';
import { colors, spacing, typography } from '../theme/tokens';
import { Icon } from './Icon';

export function VoiceResultSheet({ onSaved }: { onSaved: () => void }) {
  const db = useDatabase();
  const insets = useSafeAreaInsets();
  const result = useVoiceResultStore((state) => state.result);
  const clear = useVoiceResultStore((state) => state.clear);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  if (!result) return null;

  const summary = summarizeAmounts(result.entries);
  const totalMinor = summary.balanceMinor;

  return (
    <Modal animationType="slide" onRequestClose={clear} presentationStyle="overFullScreen" transparent visible>
      <View style={styles.root}>
        <Pressable accessibilityLabel="关闭语音结果" onPress={clear} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.check}>
              <Icon name="check" size={24} color={colors.surface} strokeWidth={2.3} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>要记这几笔吗？</Text>
              <Text style={styles.subtitle}>“{result.transcript}”</Text>
            </View>
            <View style={styles.totalWrap}>
              <Text style={styles.totalLabel}>合计</Text>
              <Text style={styles.total}>
                {totalMinor <= 0 ? '−' : '+'}¥{formatCents(Math.abs(totalMinor))}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.entries} showsVerticalScrollIndicator={false}>
            {result.entries.map((entry, index) => (
              <View key={`${result.requestId}-${index}`} style={styles.entry}>
                <View>
                  <Text style={styles.entryTitle}>
                    {entry.note || entry.subcategoryName || entry.categoryName}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {entry.subcategoryName
                      ? `${entry.categoryName} · ${entry.subcategoryName}`
                      : entry.categoryName}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.entryAmount,
                    entry.type === 'income' && styles.incomeAmount,
                  ]}
                >
                  {entry.type === 'income' ? '+' : '−'}¥{formatCents(entry.amountMinor)}
                </Text>
              </View>
            ))}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.undoHint}>确认后写入账本，撤销则不保存</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                setError(null);
                clear();
              }}
              style={styles.undoButton}
            >
              <Text style={styles.undoText}>撤销</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (savingRef.current) return;
                savingRef.current = true;
                setError(null);
                try {
                  createVoiceBatch(db, result);
                  clear();
                  onSaved();
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : '记账失败，请重试。');
                } finally {
                  savingRef.current = false;
                }
              }}
              style={styles.doneButton}
            >
              <Text style={styles.doneText}>确认记账</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(29, 26, 24, 0.35)',
  },
  sheet: {
    maxHeight: '82%',
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
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  check: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.blushDeep,
  },
  headingCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 23,
  },
  subtitle: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 10,
  },
  total: {
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  totalWrap: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    marginBottom: 2,
    color: colors.inkTertiary,
    fontSize: 9,
    fontWeight: '600',
  },
  entries: {
    marginTop: spacing.xl,
  },
  entry: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  entryTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  entryMeta: {
    marginTop: 3,
    color: colors.inkTertiary,
    fontSize: 10,
  },
  entryAmount: {
    color: colors.blushDeep,
    fontFamily: typography.number,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  incomeAmount: {
    color: colors.income,
  },
  undoHint: {
    marginTop: spacing.md,
    color: colors.inkTertiary,
    fontSize: 9,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  undoButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#FFF1EE',
  },
  undoText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
  doneButton: {
    flex: 1.5,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  doneText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
