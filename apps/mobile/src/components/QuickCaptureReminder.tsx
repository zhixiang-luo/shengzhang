import { getScreenCaptureStatus, openAccessibilitySettings } from '@shengzhang/screen-capture';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDatabase } from '../db/DatabaseProvider';
import {
  dismissQuickCaptureReminder,
  markQuickCaptureEnabled,
  readQuickCaptureReminderState,
  shouldShowQuickCaptureReminder,
} from '../services/quickCaptureReminder';
import { synchronizeScreenOverlay } from '../services/screenOverlayConfiguration';
import { colors, radii, spacing } from '../theme/tokens';
import { Icon } from './Icon';

/**
 * A quiet, dismissible reminder for users whose accessibility service was
 * switched off by the system after an update or a force-stop. Android does not
 * allow an app to re-enable accessibility itself, so this only opens settings.
 */
export function QuickCaptureReminder() {
  const db = useDatabase();
  const [visible, setVisible] = useState(false);

  const refresh = useCallback(() => {
    if (Platform.OS !== 'android') return;
    void (async () => {
      try {
        const status = await getScreenCaptureStatus();
        const state = await readQuickCaptureReminderState(db);
        if (status.accessibilityEnabled) {
          if (!state.everEnabled || state.dismissed) await markQuickCaptureEnabled(db);
          setVisible(false);
          return;
        }
        setVisible(shouldShowQuickCaptureReminder({
          supported: status.supported,
          accessibilityEnabled: status.accessibilityEnabled,
          ...state,
        }));
      } catch {
        setVisible(false);
      }
    })();
  }, [db]);

  useEffect(() => {
    refresh();
    const change = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const focus = AppState.addEventListener('focus', refresh);
    return () => {
      change.remove();
      focus.remove();
    };
  }, [refresh]);

  const openSettings = () => {
    void (async () => {
      try {
        await synchronizeScreenOverlay(db.$client.databasePath);
      } catch {
        // Settings can still be opened if the overlay configuration fails.
      }
      await openAccessibilitySettings();
    })().catch(() => undefined);
  };

  const dismiss = () => {
    setVisible(false);
    void dismissQuickCaptureReminder(db).catch(() => undefined);
  };

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel="快捷记账被系统关闭，点此重新开启"
        accessibilityRole="button"
        onPress={openSettings}
        style={styles.main}
      >
        <View style={styles.iconWrap}>
          <Icon name="ledger" size={14} color={colors.blushDeep} />
        </View>
        <Text numberOfLines={2} style={styles.text}>快捷记账被系统关闭了</Text>
        <Text style={styles.action}>重新开启</Text>
        <Icon name="chevron-right" size={12} color={colors.blushDeep} />
      </Pressable>
      <Pressable
        accessibilityLabel="暂不提示快捷记账"
        hitSlop={8}
        onPress={dismiss}
        style={styles.close}
      >
        <Icon name="close" size={12} color={colors.inkTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  main: {
    minHeight: 42,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.blushSoft,
  },
  text: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  action: {
    marginLeft: spacing.sm,
    color: colors.blushDeep,
    fontSize: 11,
    fontWeight: '700',
  },
  close: {
    width: 32,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
