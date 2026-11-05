import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppUpdatePolicyResponse } from '@shengzhang/contracts';

import { toUpdateFailureMessage } from '../features/updates/updateMessages';
import {
  applyAppUpdate,
  checkNativeAppUpdate,
  checkForAppUpdate,
  getAppUpdateInfo,
  type AppUpdateStatus,
} from '../services/appUpdates';
import { colors, radii, spacing } from '../theme/tokens';

const AUTO_CHECK_INTERVAL_MS = 15 * 60 * 1000;

type UpdateContextValue = {
  status: AppUpdateStatus;
  error: string | null;
  check: (manual?: boolean) => Promise<void>;
  apply: () => Promise<void>;
  dismissBanner: () => void;
  bannerVisible: boolean;
  info: ReturnType<typeof getAppUpdateInfo>;
  nativeUpdate: AppUpdatePolicyResponse | null;
  nativeChecking: boolean;
  nativeError: string | null;
  dismissNativeUpdate: () => void;
  openNativeUpdate: () => Promise<void>;
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const info = useMemo(() => getAppUpdateInfo(), []);
  const [status, setStatus] = useState<AppUpdateStatus>(() =>
    info.enabled ? 'idle' : 'unsupported',
  );
  const [error, setError] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [nativeUpdate, setNativeUpdate] = useState<AppUpdatePolicyResponse | null>(null);
  const [nativeChecking, setNativeChecking] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [nativeDismissed, setNativeDismissed] = useState(false);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);

  const check = useCallback(
    async (manual = false) => {
      if (checkingRef.current) return;
      if (!manual && Date.now() - lastCheckRef.current < AUTO_CHECK_INTERVAL_MS) return;
      checkingRef.current = true;
      lastCheckRef.current = Date.now();
      if (manual) {
        setStatus('checking');
        setError(null);
      }
      try {
        setNativeChecking(true);
        setNativeError(null);
        const [otaResult, nativeResult] = await Promise.allSettled([
          checkForAppUpdate(),
          checkNativeAppUpdate(),
        ]);

        if (otaResult.status === 'fulfilled') {
          setStatus(otaResult.value.status);
          setError(otaResult.value.message ?? null);
          if (otaResult.value.status === 'ready') setBannerVisible(true);
        } else {
          setStatus('error');
          setError(toUpdateFailureMessage(otaResult.reason));
        }

        if (nativeResult.status === 'fulfilled') {
          setNativeUpdate(nativeResult.value);
        } else if (manual) {
          setNativeError(toUpdateFailureMessage(nativeResult.reason));
        }
      } catch (caught) {
        setStatus('error');
        setError(toUpdateFailureMessage(caught));
      } finally {
        setNativeChecking(false);
        checkingRef.current = false;
      }
    },
    [],
  );

  const apply = useCallback(async () => {
    try {
      setStatus('downloading');
      await applyAppUpdate();
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : '更新安装失败。');
    }
  }, []);

  const openNativeUpdate = useCallback(async () => {
    const url = nativeUpdate?.downloadUrl;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (caught) {
      setNativeError(toUpdateFailureMessage(caught));
    }
  }, [nativeUpdate?.downloadUrl]);

  useEffect(() => {
    if (!info.enabled) return;
    const initialCheck = setTimeout(() => {
      void check(false);
    }, 500);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check(false);
    });
    return () => {
      clearTimeout(initialCheck);
      subscription.remove();
    };
  }, [check, info.enabled]);

  const showBanner = bannerVisible && status === 'ready';
  const value = useMemo(
    () => ({
      status,
      error,
      check,
      apply,
      dismissBanner: () => setBannerVisible(false),
      bannerVisible: showBanner,
      info,
      nativeUpdate,
      nativeChecking,
      nativeError,
      dismissNativeUpdate: () => setNativeDismissed(true),
      openNativeUpdate,
    }),
    [
      apply,
      check,
      error,
      info,
      nativeChecking,
      nativeError,
      nativeUpdate,
      openNativeUpdate,
      showBanner,
      status,
    ],
  );

  const forceNativeUpdate = nativeUpdate?.updateType === 'required';
  const showNativeBanner =
    nativeUpdate?.updateType === 'optional' &&
    Boolean(nativeUpdate.downloadUrl) &&
    !nativeDismissed &&
    !showBanner;

  return (
    <UpdateContext.Provider value={value}>
      {children}
      {showBanner ? (
        <UpdateBanner
          onApply={() => void apply()}
          onDismiss={() => setBannerVisible(false)}
        />
      ) : showNativeBanner && nativeUpdate ? (
        <UpdateBanner
          title="有新的安装包"
          body="覆盖安装即可使用新功能，本地账本会保留。"
          primaryLabel="下载"
          onApply={() => void openNativeUpdate()}
          onDismiss={() => setNativeDismissed(true)}
        />
      ) : null}
      {forceNativeUpdate && nativeUpdate ? (
        <ForceUpdateGate
          update={nativeUpdate}
          error={nativeError}
          onOpen={() => void openNativeUpdate()}
          onRetry={() => void check(true)}
        />
      ) : null}
    </UpdateContext.Provider>
  );
}

function UpdateBanner({
  onApply,
  onDismiss,
  title = '新版本已准备好',
  body = '立即重启生效，稍后也会在下次打开时自动更新。',
  primaryLabel = '重启',
}: {
  onApply: () => void;
  onDismiss: () => void;
  title?: string;
  body?: string;
  primaryLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.banner, { marginTop: insets.top + spacing.sm }]}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <Pressable onPress={onDismiss} style={styles.laterButton}>
          <Text style={styles.laterText}>稍后</Text>
        </Pressable>
        <Pressable onPress={onApply} style={styles.applyButton}>
          <Text style={styles.applyText}>{primaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ForceUpdateGate({
  update,
  error,
  onOpen,
  onRetry,
}: {
  update: AppUpdatePolicyResponse;
  error: string | null;
  onOpen: () => void;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityViewIsModal
      style={[styles.forceGate, { paddingTop: insets.top + spacing.huge }]}
    >
      <View style={styles.forceCard}>
        <Text style={styles.forceEyebrow}>安装包更新</Text>
        <Text style={styles.forceTitle}>{update.title}</Text>
        <Text style={styles.forceBody}>{update.message}</Text>
        <Text style={styles.forceVersion}>
          当前 {update.currentVersion} · 最新 {update.latestVersion}
        </Text>
        {error ? <Text style={styles.forceError}>{error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={onOpen} style={styles.forcePrimary}>
          <Text style={styles.forcePrimaryText}>前往官网下载</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.forceSecondary}>
          <Text style={styles.forceSecondaryText}>重新检查</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function useAppUpdates() {
  const value = useContext(UpdateContext);
  if (!value) throw new Error('useAppUpdates must be used inside UpdateProvider');
  return value;
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    right: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    marginTop: 3,
    color: 'rgba(255, 253, 248, 0.58)',
    fontSize: 9,
    lineHeight: 14,
  },
  laterButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  laterText: {
    color: 'rgba(255, 253, 248, 0.58)',
    fontSize: 11,
  },
  applyButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.blush,
  },
  applyText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  forceGate: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2000,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    backgroundColor: colors.canvas,
  },
  forceCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  forceEyebrow: {
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  forceTitle: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontSize: 24,
    fontWeight: '700',
  },
  forceBody: {
    marginTop: spacing.md,
    color: colors.inkSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  forceVersion: {
    marginTop: spacing.md,
    color: colors.inkTertiary,
    fontSize: 11,
  },
  forceError: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 11,
    lineHeight: 17,
  },
  forcePrimary: {
    minHeight: 48,
    marginTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  forcePrimaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  forceSecondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forceSecondaryText: {
    color: colors.inkSecondary,
    fontSize: 12,
  },
});
