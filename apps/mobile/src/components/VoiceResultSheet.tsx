import { formatCents, summarizeAmounts } from '@shengzhang/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '../db/DatabaseProvider';
import { createVoiceBatch, softDeleteVoiceBatch } from '../db/transactionRepository';
import { trackAnalyticsEvent } from '../services/analytics';
import { useVoiceResultStore } from '../stores/voiceResultStore';
import { colors, spacing, typography } from '../theme/tokens';
import { AnimatedSheetModal } from './AnimatedSheetModal';
import { Icon } from './Icon';

type SaveState = 'saving' | 'saved' | 'failed';

export function VoiceResultSheet({ onSaved }: { onSaved: () => void }) {
  const db = useDatabase();
  const insets = useSafeAreaInsets();
  const result = useVoiceResultStore((state) => state.result);
  const clear = useVoiceResultStore((state) => state.clear);
  const savingRef = useRef(false);
  const autoSavedRequestRef = useRef<string | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saving');
  const [error, setError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const saveBatch = useCallback(() => {
    if (!result || savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    setError(null);
    let didSave = false;
    try {
      createVoiceBatch(db, result);
      didSave = true;
    } catch (caught) {
      setSaveState('failed');
      setError(caught instanceof Error ? caught.message : '记账失败，请重试。');
      trackAnalyticsEvent('voice_failed', { reason: 'save_failed' });
    } finally {
      savingRef.current = false;
    }
    if (!didSave) return;

    setSaveState('saved');
    trackAnalyticsEvent('voice_saved', { entryCount: result.entries.length });
    try {
      onSaved();
    } catch {
      // The batch is already committed; the next focus event will reload the ledger.
    }
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => setSheetVisible(false), 8_000);
  }, [db, onSaved, result]);

  const requestId = result?.requestId ?? null;

  useEffect(() => {
    if (!requestId) {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      return;
    }
    if (autoSavedRequestRef.current === requestId) return;
    const frame = requestAnimationFrame(() => setSheetVisible(true));
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoSavedRequestRef.current = requestId;
    saveBatch();
    return () => cancelAnimationFrame(frame);
  }, [requestId, saveBatch]);

  useEffect(
    () => () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    },
    [],
  );

  if (!result) return null;

  const summary = summarizeAmounts(result.entries);
  const totalMinor = summary.balanceMinor;
  const isSaving = saveState === 'saving';
  const isSaved = saveState === 'saved';
  const title = isSaving
    ? '正在记好'
    : isSaved
      ? result.entries.length > 1
        ? `已记好 ${result.entries.length} 笔`
        : '已记好'
      : '这几笔还没保存';
  const hint = isSaving
    ? '正在写入本机账本'
    : isSaved
      ? '账本已更新，8 秒内可整批撤销'
      : '本机账本没有改变，可以重试';

  const close = () => {
    if (!isSaving) setSheetVisible(false);
  };

  return (
    <AnimatedSheetModal
      closeAccessibilityLabel="关闭语音结果"
      onClosed={clear}
      onRequestClose={close}
      sheetStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
      visible={sheetVisible}
    >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.check}>
              <Icon name="check" size={24} color={colors.surface} strokeWidth={2.3} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>{title}</Text>
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
          <Text style={styles.undoHint}>{hint}</Text>
          <View style={styles.actions}>
            {isSaved ? (
              <>
                <Pressable
                  onPress={() => {
                    softDeleteVoiceBatch(db, result.requestId);
                    trackAnalyticsEvent('voice_undone', { entryCount: result.entries.length });
                    onSaved();
                    setSheetVisible(false);
                  }}
                  style={styles.undoButton}
                >
                  <Text style={styles.undoText}>撤销</Text>
                </Pressable>
                <Pressable onPress={() => setSheetVisible(false)} style={styles.doneButton}>
                  <Text style={styles.doneText}>收好</Text>
                </Pressable>
              </>
            ) : null}
            {isSaving ? (
              <View style={[styles.doneButton, styles.disabledButton]}>
                <Text style={styles.doneText}>正在保存</Text>
              </View>
            ) : null}
            {saveState === 'failed' ? (
              <>
                <Pressable onPress={() => setSheetVisible(false)} style={styles.undoButton}>
                  <Text style={styles.undoText}>放弃</Text>
                </Pressable>
                <Pressable onPress={saveBatch} style={styles.doneButton}>
                  <Text style={styles.doneText}>重试</Text>
                </Pressable>
              </>
            ) : null}
          </View>
    </AnimatedSheetModal>
  );
}

const styles = StyleSheet.create({
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
  disabledButton: {
    opacity: 0.58,
  },
});
