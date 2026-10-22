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
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  applyAppUpdate,
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
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const info = useMemo(() => getAppUpdateInfo(), []);
  const [status, setStatus] = useState<AppUpdateStatus>(() =>
    info.enabled ? 'idle' : 'unsupported',
  );
  const [error, setError] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
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
        const result = await checkForAppUpdate();
        setStatus(result.status);
        setError(result.message ?? null);
        if (result.status === 'ready') setBannerVisible(true);
      } catch (caught) {
        setStatus('error');
        setError(caught instanceof Error ? caught.message : '检查更新失败。');
      } finally {
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
    }),
    [apply, check, error, info, showBanner, status],
  );

  return (
    <UpdateContext.Provider value={value}>
      {children}
      {showBanner ? (
        <UpdateBanner
          onApply={() => void apply()}
          onDismiss={() => setBannerVisible(false)}
        />
      ) : null}
    </UpdateContext.Provider>
  );
}

function UpdateBanner({
  onApply,
  onDismiss,
}: {
  onApply: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.banner, { marginTop: insets.top + spacing.sm }]}>
        <View style={styles.copy}>
          <Text style={styles.title}>新版本已准备好</Text>
          <Text style={styles.body}>立即重启生效，稍后也会在下次打开时自动更新。</Text>
        </View>
        <Pressable onPress={onDismiss} style={styles.laterButton}>
          <Text style={styles.laterText}>稍后</Text>
        </Pressable>
        <Pressable onPress={onApply} style={styles.applyButton}>
          <Text style={styles.applyText}>重启</Text>
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
