import type { FeedbackType } from '@shengzhang/contracts';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/BrandMark';
import { Icon } from '../components/Icon';
import {
  FEEDBACK_DESCRIPTION_PLACEHOLDER,
  feedbackFailureMessage,
  validateFeedbackInput,
} from '../features/feedback/feedbackForm';
import {
  createFeedbackRequestId,
  submitFeedback,
} from '../services/feedback';
import { trackAnalyticsEvent } from '../services/analytics';
import { colors, radii, spacing, typography } from '../theme/tokens';

const FEEDBACK_TYPES: { type: FeedbackType; label: string }[] = [
  { type: 'feature', label: '功能建议' },
  { type: 'usage', label: '使用问题' },
  { type: 'voice', label: '语音识别' },
  { type: 'ledger', label: '记账结果' },
  { type: 'privacy', label: '数据安全' },
  { type: 'other', label: '其他' },
];

type SuccessState = {
  referenceCode: string;
  hasContact: boolean;
};

export default function FeedbackScreen() {
  const [type, setType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    trackAnalyticsEvent('feedback_opened');
  }, []);

  const reset = () => {
    setType(null);
    setMessage('');
    setContact('');
    setDiagnosticsEnabled(true);
    setSubmitting(false);
    setError(null);
    setSuccess(null);
    requestIdRef.current = null;
  };

  const send = async () => {
    if (submitting || !type) {
      if (!type) setError('请选择反馈类型');
      return;
    }
    const validation = validateFeedbackInput({ type, message, contact });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    Keyboard.dismiss();
    setError(null);
    setSubmitting(true);
    requestIdRef.current ??= createFeedbackRequestId();
    try {
      const response = await submitFeedback(
        {
          type,
          message: validation.message,
          contact: validation.contact ?? '',
          diagnosticsEnabled,
        },
        requestIdRef.current,
      );
      setSuccess({
        referenceCode: response.referenceCode,
        hasContact: validation.contact !== null,
      });
      trackAnalyticsEvent('feedback_submitted', { feedbackType: type });
      requestIdRef.current = null;
    } catch (caught) {
      trackAnalyticsEvent('feedback_failed', {
        feedbackType: type,
        reason: caught instanceof Error && caught.name === 'AbortError' ? 'timeout' : 'connection',
      });
      setError(feedbackFailureMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="返回设置"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Icon name="back" size={20} color={colors.inkSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>改进与反馈</Text>
          <View style={styles.headerSpace} />
        </View>
        <View style={styles.successWrap}>
          <View style={styles.successCard}>
            <BrandMark size={76} />
            <Text style={styles.successTitle}>收到了</Text>
            <Text style={styles.successBody}>
              谢谢你帮声账变好。我会认真看完每一条反馈。
            </Text>
            <View style={styles.referencePill}>
              <Text style={styles.referenceLabel}>反馈编号</Text>
              <Text selectable style={styles.referenceCode}>
                {success.referenceCode}
              </Text>
            </View>
            <Text style={styles.successNote}>
              {success.hasContact
                ? '如果需要更多信息，我会通过你留下的联系方式联系你。'
                : '这次是匿名提交；因为没有留联系方式，可能无法逐一回复。'}
            </Text>
            <Pressable onPress={reset} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>再提一条</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="返回设置"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="back" size={20} color={colors.inkSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>改进与反馈</Text>
        <View style={styles.headerSpace} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View pointerEvents="none" style={styles.heroOrb} />
            <Text style={styles.eyebrow}>A NOTE TO THE MAKER</Text>
            <Text style={styles.heroTitle}>哪里不顺手，{'\n'}都可以告诉我。</Text>
            <Text style={styles.heroBody}>
              你的反馈会直接给到独立开发者。匿名也能提交；留下联系方式，才方便我回复你。
            </Text>
          </View>

          <Text style={styles.sectionLabel}>这是什么反馈</Text>
          <View style={styles.typeGrid}>
            {FEEDBACK_TYPES.map((item) => {
              const selected = type === item.type;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item.type}
                  onPress={() => {
                    setType(item.type);
                    setError(null);
                  }}
                  style={({ pressed }) => [
                    styles.typeChip,
                    selected && styles.typeChipSelected,
                    pressed && styles.typeChipPressed,
                  ]}
                >
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>详细描述</Text>
          <View style={styles.fieldCard}>
            <TextInput
              accessibilityLabel="反馈详细描述"
              maxLength={1000}
              multiline
              onChangeText={(value) => {
                setMessage(value);
                setError(null);
              }}
              placeholder={FEEDBACK_DESCRIPTION_PLACEHOLDER}
              placeholderTextColor={colors.inkTertiary}
              style={styles.messageInput}
              textAlignVertical="top"
              value={message}
            />
            <Text style={styles.counter}>{message.length} / 1000</Text>
          </View>
          <Text style={styles.fieldHint}>
            写清楚发生了什么、你原本期望怎样，会更容易定位。
          </Text>

          <Text style={styles.sectionLabel}>联系方式 · 选填</Text>
          <View style={styles.fieldCard}>
            <TextInput
              accessibilityLabel="联系方式"
              autoCapitalize="none"
              maxLength={200}
              onChangeText={(value) => {
                setContact(value);
                setError(null);
              }}
              placeholder="邮箱、微信或手机号"
              placeholderTextColor={colors.inkTertiary}
              style={styles.contactInput}
              value={contact}
            />
          </View>
          <Text style={styles.fieldHint}>不留也可以匿名发送，只是我可能无法回复你。</Text>

          <View style={styles.diagnosticsCard}>
            <View style={styles.diagnosticsHeader}>
              <View style={styles.diagnosticsCopy}>
                <Text style={styles.diagnosticsTitle}>附上匿名诊断信息</Text>
                <Text style={styles.diagnosticsHint}>
                  App 版本、系统版本、当前页面和错误码，用于定位问题。
                </Text>
              </View>
              <Switch
                accessibilityLabel="附上匿名诊断信息"
                onValueChange={setDiagnosticsEnabled}
                thumbColor={colors.surface}
                trackColor={{ false: colors.surfaceSunken, true: colors.blush }}
                value={diagnosticsEnabled}
              />
            </View>
            <View style={styles.privacyNote}>
              <Icon name="check" size={15} color={colors.income} />
              <Text style={styles.privacyText}>
                不会附带金额、分类、备注、录音或语音转写。
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>还没有发送成功</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Text style={styles.errorHint}>你填写的内容还在，可以直接重试。</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void send()}
            style={({ pressed }) => [
              styles.submitButton,
              submitting && styles.submitButtonBusy,
              pressed && !submitting && styles.submitButtonPressed,
            ]}
          >
            {submitting ? (
              <>
                <ActivityIndicator color={colors.surface} />
                <Text style={styles.submitText}>正在发送</Text>
              </>
            ) : (
              <Text style={styles.submitText}>发送反馈</Text>
            )}
          </Pressable>
          <Text style={styles.footerNote}>
            反馈正文会保存在声账的私有收件箱，默认保留 180 天。
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  keyboardView: {
    flex: 1,
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
  headerTitle: {
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
  hero: {
    overflow: 'hidden',
    marginTop: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  heroOrb: {
    position: 'absolute',
    top: -86,
    right: -46,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.blushDeep,
    opacity: 0.24,
  },
  eyebrow: {
    color: colors.sand,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroTitle: {
    marginTop: spacing.md,
    color: colors.surface,
    fontFamily: typography.display,
    fontSize: 29,
    lineHeight: 39,
    letterSpacing: -0.7,
  },
  heroBody: {
    marginTop: spacing.md,
    maxWidth: 300,
    color: 'rgba(255, 253, 248, 0.68)',
    fontSize: 12,
    lineHeight: 20,
  },
  sectionLabel: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    minWidth: 92,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  typeChipSelected: {
    borderColor: colors.blushDeep,
    backgroundColor: colors.blushSoft,
  },
  typeChipPressed: {
    opacity: 0.78,
  },
  typeChipText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: colors.blushDeep,
  },
  fieldCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  messageInput: {
    minHeight: 142,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 23,
  },
  counter: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.md,
    color: colors.inkTertiary,
    fontSize: 10,
  },
  contactInput: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    color: colors.ink,
    fontSize: 14,
  },
  fieldHint: {
    marginTop: spacing.sm,
    paddingHorizontal: 4,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
  },
  diagnosticsCard: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  diagnosticsCopy: {
    flex: 1,
  },
  diagnosticsTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  diagnosticsHint: {
    marginTop: 5,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  privacyText: {
    flex: 1,
    color: colors.inkSecondary,
    fontSize: 10,
    lineHeight: 16,
  },
  errorCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  errorBody: {
    marginTop: 5,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 19,
  },
  errorHint: {
    marginTop: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 10,
  },
  submitButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    borderRadius: 18,
    backgroundColor: colors.blushDeep,
  },
  submitButtonBusy: {
    opacity: 0.7,
  },
  submitButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  submitText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    marginTop: spacing.md,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  successCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  successTitle: {
    marginTop: spacing.lg,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 31,
  },
  successBody: {
    maxWidth: 280,
    marginTop: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  referencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
  },
  referenceLabel: {
    color: colors.inkTertiary,
    fontSize: 10,
  },
  referenceCode: {
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  successNote: {
    marginTop: spacing.lg,
    color: colors.inkTertiary,
    fontSize: 10,
    lineHeight: 17,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
  },
  secondaryButtonText: {
    color: colors.blushDeep,
    fontSize: 13,
    fontWeight: '600',
  },
});
