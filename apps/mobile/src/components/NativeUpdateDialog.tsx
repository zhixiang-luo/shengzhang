import type { AppUpdatePolicyResponse } from '@shengzhang/contracts';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '../theme/tokens';

type NativeUpdateDialogProps = {
  update: AppUpdatePolicyResponse;
  required: boolean;
  error: string | null;
  onDownload: () => void;
  onDismiss: () => void;
  onRetry: () => void;
};

export function NativeUpdateDialog({
  update,
  required,
  error,
  onDownload,
  onDismiss,
  onRetry,
}: NativeUpdateDialogProps) {
  const insets = useSafeAreaInsets();
  const downloadLabel =
    Platform.OS === 'android' && update.requiresReinstall ? '下载并退出' : '前往下载';

  return (
    <Modal
      animationType="fade"
      onRequestClose={required ? () => undefined : onDismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {required ? null : (
          <Pressable
            accessibilityLabel="稍后更新"
            onPress={onDismiss}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View accessibilityViewIsModal style={styles.card}>
          <Text style={styles.eyebrow}>{required ? '必须更新' : '版本更新'}</Text>
          <Text style={styles.title}>声账 {update.latestVersion}</Text>
          <Text style={styles.message}>{update.message}</Text>

          {update.releaseNotes.length > 0 ? (
            <ScrollView
              contentContainerStyle={styles.notes}
              showsVerticalScrollIndicator={false}
              style={styles.notesViewport}
            >
              {update.releaseNotes.map((note, index) => (
                <View key={`${index}-${note}`} style={styles.noteRow}>
                  <View style={styles.noteDot} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <Text style={styles.installHint}>
            {update.requiresReinstall
              ? '需要覆盖安装，本机账本会保留。安装完成后再打开声账。'
              : '打开下载页后按提示完成更新。'}
          </Text>
          <Text style={styles.version}>
            当前 {update.currentVersion} · 最新 {update.latestVersion}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={onDownload}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>{downloadLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={required ? onRetry : onDismiss}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>{required ? '重新检查' : '稍后'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(29, 26, 24, 0.52)',
  },
  card: {
    width: '100%',
    maxHeight: '86%',
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 18,
  },
  eyebrow: {
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 26,
  },
  message: {
    marginTop: spacing.md,
    color: colors.inkSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  notesViewport: {
    marginTop: spacing.lg,
    flexShrink: 1,
    maxHeight: 220,
  },
  notes: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noteDot: {
    width: 5,
    height: 5,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: colors.blushDeep,
  },
  noteText: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 21,
  },
  installHint: {
    marginTop: spacing.lg,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
  version: {
    marginTop: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 11,
  },
  error: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 11,
    lineHeight: 17,
  },
  primaryButton: {
    minHeight: 50,
    marginTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.inkSecondary,
    fontSize: 12,
  },
  buttonPressed: {
    opacity: 0.76,
  },
});
