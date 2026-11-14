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
import {
  AppState,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppUpdatePolicyResponse } from '@shengzhang/contracts';

import { NativeUpdateDialog } from './NativeUpdateDialog';
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
  showNativeUpdate: () => void;
  openNativeUpdate: (options?: { exitAfterOpen?: boolean }) => Promise<void>;
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
  const [dismissedNativeVersion, setDismissedNativeVersion] = useState<string | null>(
    null,
  );
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

  const openNativeUpdate = useCallback(
    async (options?: { exitAfterOpen?: boolean }) => {
      const url = nativeUpdate?.downloadUrl;
      if (!url) return;
      try {
        await Linking.openURL(url);
        if (options?.exitAfterOpen && Platform.OS === 'android') {
          setTimeout(() => BackHandler.exitApp(), 600);
        }
      } catch (caught) {
        setNativeError(toUpdateFailureMessage(caught));
      }
    },
    [nativeUpdate?.downloadUrl],
  );
  const showNativeUpdate = useCallback(() => setDismissedNativeVersion(null), []);

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
      dismissNativeUpdate: () =>
        setDismissedNativeVersion(nativeUpdate?.latestVersion ?? null),
      showNativeUpdate,
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
      showNativeUpdate,
      showBanner,
      status,
    ],
  );

  const forceNativeUpdate = nativeUpdate?.updateType === 'required';
  const optionalNativeUpdate = nativeUpdate?.updateType === 'optional';
  const dismissedNativeCurrentVersion =
    nativeUpdate?.latestVersion === dismissedNativeVersion;
  const showNativeDialog =
    optionalNativeUpdate &&
    Boolean(nativeUpdate?.downloadUrl) &&
    nativeUpdate?.requiresReinstall === true &&
    !dismissedNativeCurrentVersion;
  const showNativeBanner =
    optionalNativeUpdate &&
    Boolean(nativeUpdate?.downloadUrl) &&
    nativeUpdate?.requiresReinstall === false &&
    !dismissedNativeCurrentVersion &&
    !showBanner &&
    !forceNativeUpdate;
  const showOtaBanner =
    showBanner && !showNativeDialog && !showNativeBanner && !forceNativeUpdate;

  return (
    <UpdateContext.Provider value={value}>
      {children}
      {showOtaBanner ? (
        <UpdateBanner
          onApply={() => void apply()}
          onDismiss={() => setBannerVisible(false)}
        />
      ) : showNativeBanner && nativeUpdate ? (
        <UpdateBanner
          title={`声账 ${nativeUpdate.latestVersion} 已发布`}
          body={nativeUpdate.message}
          primaryLabel="前往下载"
          onApply={() => void openNativeUpdate()}
          onDismiss={() =>
            setDismissedNativeVersion(nativeUpdate.latestVersion)
          }
        />
      ) : null}
      {showNativeDialog && nativeUpdate ? (
        <NativeUpdateDialog
          update={nativeUpdate}
          required={false}
          error={nativeError}
          onDownload={() => void openNativeUpdate({ exitAfterOpen: true })}
          onDismiss={() => setDismissedNativeVersion(nativeUpdate.latestVersion)}
          onRetry={() => undefined}
        />
      ) : null}
      {forceNativeUpdate && nativeUpdate ? (
        <NativeUpdateDialog
          update={nativeUpdate}
          required
          error={nativeError}
          onDownload={() => void openNativeUpdate({ exitAfterOpen: true })}
          onDismiss={() => undefined}
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
});
