import {
  completeVoiceDraft,
  describeMissingAmounts,
  formatCents,
  parseAmountInput,
} from '@shengzhang/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type ScrollViewInstance,
  type TextInputInstance,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  abandonMissingAmounts,
  confirmMissingAmounts,
  INITIAL_MISSING_AMOUNT_FLOW,
  settleMissingAmounts,
  type MissingAmountFlowState,
} from '../features/voice/missingAmountFlow';
import { useVoiceResultStore, type PendingVoiceResult } from '../stores/voiceResultStore';
import { colors, spacing, typography } from '../theme/tokens';
import { AnimatedSheetModal } from './AnimatedSheetModal';
import { Icon } from './Icon';

type AmountProblem = 'format' | 'zero' | 'too_large';

const PROBLEM_MESSAGES: Record<AmountProblem, string> = {
  format: '金额格式不对，请只输入数字，例如 45 或 45.5',
  zero: '金额需要大于 0',
  too_large: '金额太大了，请检查',
};

/**
 * Shown when a spoken batch has an entry with no amount. Nothing is saved yet:
 * the user fills in only the missing amounts, then the whole batch is saved
 * together and handed to the normal result card (8-second batch undo).
 */
export function MissingAmountSheet() {
  const pending = useVoiceResultStore((state) => state.pending);
  if (!pending) return null;
  // Every batch gets a fresh form, so typed amounts can never leak from one batch to the next.
  return <MissingAmountForm key={pending.requestId} pending={pending} />;
}

function MissingAmountForm({ pending }: { pending: PendingVoiceResult }) {
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [decided, setDecided] = useState(false);
  const [amountTexts, setAmountTexts] = useState<Record<number, string>>({});
  const flowRef = useRef<MissingAmountFlowState>(INITIAL_MISSING_AMOUNT_FLOW);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const rowOffsetsRef = useRef<Record<number, number>>({});
  const inputRefs = useRef<Record<number, TextInputInstance | null>>({});
  const focusedIndexRef = useRef<number | null>(null);
  const keyboardVisibleRef = useRef(false);

  const missing = describeMissingAmounts(pending.entries);
  const firstMissingIndex = missing.indexes[0];
  const lastMissingIndex = missing.indexes[missing.indexes.length - 1];
  const total = pending.entries.length;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSheetVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!sheetVisible || firstMissingIndex === undefined) return;
    const timer = setTimeout(() => inputRefs.current[firstMissingIndex]?.focus(), 360);
    return () => clearTimeout(timer);
  }, [firstMissingIndex, sheetVisible]);

  const revealRow = useCallback((index: number) => {
    setTimeout(
      () => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, (rowOffsetsRef.current[index] ?? 0) - 8),
          animated: true,
        });
      },
      Platform.OS === 'ios' ? 60 : 120,
    );
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      keyboardVisibleRef.current = true;
      // The viewport only shrinks once the keyboard is up, so scroll again now.
      if (focusedIndexRef.current !== null) revealRow(focusedIndexRef.current);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardVisibleRef.current = false;
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [revealRow]);

  // What the user typed, strictly parsed. Anything that is not clearly an amount stays unsaved.
  const typedCents: Record<number, number | null> = {};
  const problems: Record<number, AmountProblem | null> = {};
  for (const index of missing.indexes) {
    const result = parseAmountInput(amountTexts[index] ?? '');
    if (result.ok) {
      typedCents[index] = result.cents;
      problems[index] = null;
    } else {
      typedCents[index] = null;
      problems[index] = result.issue === 'empty' ? null : result.issue;
    }
  }
  const canConfirm = !decided && completeVoiceDraft(pending.entries, typedCents).ok;

  const finishDecision = (next: MissingAmountFlowState) => {
    if (next === flowRef.current) return;
    flowRef.current = next;
    setDecided(true);
    Keyboard.dismiss();
    setSheetVisible(false);
  };

  const confirm = () => finishDecision(confirmMissingAmounts(flowRef.current, pending, typedCents));
  const abandon = () => finishDecision(abandonMissingAmounts(flowRef.current));

  // Backdrop tap and Android back: put the keyboard away first, only then give the batch up.
  const requestClose = () => {
    if (keyboardVisibleRef.current) {
      Keyboard.dismiss();
      return;
    }
    abandon();
  };

  // Runs after the close animation, so the result card never overlaps this sheet.
  const handleClosed = () => {
    const confirmedBatch = settleMissingAmounts(flowRef.current);
    const store = useVoiceResultStore.getState();
    store.clearPending();
    if (confirmedBatch) store.setResult(confirmedBatch);
  };

  const focusNextMissing = (index: number) => {
    const next = missing.indexes.find((candidate) => candidate > index);
    if (next === undefined) {
      Keyboard.dismiss();
      return;
    }
    inputRefs.current[next]?.focus();
  };

  const title = missing.count > 1 ? `还差 ${missing.count} 个金额` : '还差一个金额';
  const subtitle = total > 1 ? `补上后，${total} 笔一起记好` : '补上后就记好';
  const abandonHint = total > 1 ? `放弃则这 ${total} 笔都不记` : '放弃则不记这一笔';

  return (
    <AnimatedSheetModal
      closeAccessibilityLabel="关闭面板，放弃这次语音记账"
      onClosed={handleClosed}
      onRequestClose={requestClose}
      sheetStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
      visible={sheetVisible}
    >
      <View style={styles.handle} />
      <View style={styles.heading}>
        <View style={styles.badge}>
          <Icon name="ledger" size={22} color={colors.surface} strokeWidth={2} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.entries}
      >
        <Text style={styles.transcript}>“{pending.transcript}”</Text>
        {pending.entries.map((entry, index) => {
          const amountMinor = entry.amountMinor;
          const isMissing = amountMinor === null;
          const label = entry.note || entry.subcategoryName || entry.categoryName;
          const categoryLine = entry.subcategoryName
            ? `${entry.categoryName} · ${entry.subcategoryName}`
            : entry.categoryName;
          const problem = problems[index] ?? null;

          return (
            <View
              key={`${pending.requestId}-${index}`}
              onLayout={(event) => {
                rowOffsetsRef.current[index] = event.nativeEvent.layout.y;
              }}
              style={[styles.entry, isMissing && styles.entryMissing]}
            >
              <View style={styles.entryRow}>
                <View style={styles.entryCopy}>
                  <Text style={styles.entryTitle}>{label}</Text>
                  <Text style={[styles.entryMeta, isMissing && styles.entryMetaMissing]}>
                    {isMissing ? `${categoryLine} · 没听到金额` : categoryLine}
                  </Text>
                </View>
                {isMissing ? (
                  <Pressable
                    accessible={false}
                    onPress={() => inputRefs.current[index]?.focus()}
                    style={[styles.amountField, problem && styles.amountFieldInvalid]}
                  >
                    <Text style={styles.amountPrefix}>¥</Text>
                    <TextInput
                      accessibilityLabel={`${label}的金额`}
                      keyboardType="decimal-pad"
                      onBlur={() => {
                        if (focusedIndexRef.current === index) focusedIndexRef.current = null;
                      }}
                      onChangeText={(value) =>
                        setAmountTexts((current) => ({ ...current, [index]: value }))
                      }
                      onFocus={() => {
                        focusedIndexRef.current = index;
                        revealRow(index);
                      }}
                      onSubmitEditing={() => focusNextMissing(index)}
                      placeholder="金额"
                      placeholderTextColor={colors.inkTertiary}
                      ref={(node) => {
                        inputRefs.current[index] = node;
                      }}
                      returnKeyType={index === lastMissingIndex ? 'done' : 'next'}
                      selectionColor={colors.blushDeep}
                      style={styles.amountInput}
                      submitBehavior={index === lastMissingIndex ? 'blurAndSubmit' : 'submit'}
                      value={amountTexts[index] ?? ''}
                    />
                  </Pressable>
                ) : (
                  <Text
                    style={[styles.entryAmount, entry.type === 'income' && styles.incomeAmount]}
                  >
                    {entry.type === 'income' ? '+' : '−'}¥{formatCents(amountMinor)}
                  </Text>
                )}
              </View>
              {problem ? <Text style={styles.problem}>{PROBLEM_MESSAGES[problem]}</Text> : null}
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.hint}>{abandonHint}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={decided}
          onPress={abandon}
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>放弃</Text>
        </Pressable>
        <Pressable
          accessibilityHint={canConfirm ? undefined : '先补上所有缺少的金额'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConfirm }}
          disabled={!canConfirm}
          onPress={confirm}
          style={[styles.confirm, !canConfirm && styles.confirmDisabled]}
        >
          <Text style={styles.confirmText}>确认入账</Text>
        </Pressable>
      </View>
    </AnimatedSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '92%',
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
  badge: {
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
    color: colors.inkSecondary,
    fontSize: 12,
  },
  entries: {
    flexGrow: 0,
    flexShrink: 1,
    marginTop: spacing.lg,
  },
  transcript: {
    marginBottom: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  entry: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  entryMissing: {
    marginVertical: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0,
    borderRadius: 16,
    backgroundColor: colors.blushSoft,
  },
  entryRow: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryCopy: {
    flex: 1,
  },
  entryTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  entryMeta: {
    marginTop: 3,
    color: colors.inkSecondary,
    fontSize: 11,
  },
  entryMetaMissing: {
    color: colors.ink,
    fontWeight: '600',
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
  amountField: {
    width: 132,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.blushDeep,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  amountFieldInvalid: {
    borderColor: colors.danger,
  },
  amountPrefix: {
    marginRight: 4,
    color: colors.inkSecondary,
    fontFamily: typography.number,
    fontSize: 14,
  },
  amountInput: {
    flex: 1,
    height: 48,
    paddingVertical: 0,
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlign: 'right',
    textAlignVertical: 'center',
  },
  problem: {
    paddingBottom: spacing.xs,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  hint: {
    marginTop: spacing.md,
    color: colors.inkSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancel: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.surfaceSunken,
  },
  cancelText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  confirm: {
    flex: 1.5,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
