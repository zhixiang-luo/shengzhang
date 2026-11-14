import {
  appendAmountKey, deleteAmountKey, evaluateAmountExpressionToCents, formatAmountExpression,
  type AmountKey, type TransactionType,
} from '@shengzhang/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, BackHandler, Image, Keyboard, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountKeypad } from '../components/AmountKeypad';
import { AnimatedSheetModal } from '../components/AnimatedSheetModal';
import { CategoryIcon } from '../components/CategoryIcon';
import { DateTimePickerSheet } from '../components/DateTimePickerSheet';
import { Icon } from '../components/Icon';
import { listCategories, type CategoryRow } from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import { createScreenTransaction } from '../db/transactionRepository';
import { mergeScreenBillDraft, type ScreenBillDraft, type ScreenBillEdits } from '../features/screenCapture/screenBillDraft';
import { useScreenCapture } from '../features/screenCapture/useScreenCapture';
import { setScreenCloudConsent } from '../services/screenBillApi';
import { colors, radii, spacing } from '../theme/tokens';

function recommendCategory(note: string, type: TransactionType, categories: CategoryRow[]): string | null {
  const active = categories.filter((item) => !item.isArchived && item.type === type && item.parentId === null);
  const id = type === 'income' ? 'income-other'
    : /滴滴|打车|出租|高德|地铁|公交/.test(note) ? 'expense-transport'
      : /外卖|餐|饭|咖啡|奶茶|面馆/.test(note) ? 'expense-food'
        : /超市|商城|淘宝|京东|拼多多|便利店/.test(note) ? 'expense-shopping'
          : /药|医院|诊所/.test(note) ? 'expense-health' : 'expense-other';
  return active.find((item) => item.id === id)?.id ?? active.find((item) => /其他/.test(item.name))?.id ?? active[0]?.id ?? null;
}

function displayTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ScreenCaptureScreen() {
  const db = useDatabase();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ demo?: string; captureId?: string }>();
  const demo = params.demo === '1';
  const [categories] = useState(() => listCategories(db));
  const capture = useScreenCapture({ demo, captureId: params.captureId, categories });
  const ready = capture.viewState?.kind === 'ready' ? capture.viewState : null;
  const [draft, setDraft] = useState<ScreenBillDraft>({ amount: '', note: '', type: 'expense', occurredAt: new Date().toISOString(), categoryId: null, subcategoryId: null });
  const [amountVisible, setAmountVisible] = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  const [categoryVisible, setCategoryVisible] = useState(false);
  const [cloudPreview, setCloudPreview] = useState(false);
  const [cloudDismissedCapture, setCloudDismissedCapture] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeEdited, setTimeEdited] = useState(false);
  const editedRef = useRef<ScreenBillEdits>({});
  const initializedRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const savedRef = useRef(false);
  const discardRef = useRef(capture.discard);
  const extraction = ready?.extraction;
  const activeCaptureId = ready?.capture.captureId;
  const cloudPreviewVisible = cloudPreview || Boolean(capture.needsCloudConsent && activeCaptureId && cloudDismissedCapture !== activeCaptureId);
  const dismissCloudPreview = useCallback(() => {
    setCloudPreview(false);
    setCloudDismissedCapture(activeCaptureId ?? null);
  }, [activeCaptureId]);

  useEffect(() => { discardRef.current = capture.discard; }, [capture.discard]);
  useEffect(() => () => { void discardRef.current(); }, []);
  const applyExtraction = useCallback(() => {
    if (!extraction || !activeCaptureId || savingRef.current) return;
    if (initializedRef.current !== activeCaptureId) {
      initializedRef.current = activeCaptureId;
      editedRef.current = {};
      savedRef.current = false;
      setError(null);
      setTimeEdited(false);
      setAmountVisible(false);
      setDateVisible(false);
      setCategoryVisible(false);
      setCloudPreview(false);
    }
    if (savedRef.current) return;
    const suggested = categories.find((item) => item.id === capture.suggestedCategoryId && !item.isArchived);
    const rootId = suggested?.parentId ?? suggested?.id ?? recommendCategory(extraction.note, extraction.type, categories);
    setDraft((current) => {
      const next = mergeScreenBillDraft(current, extraction, editedRef.current, rootId);
      if (!editedRef.current.categoryId && suggested?.parentId) next.subcategoryId = suggested.id;
      return next;
    });
  }, [extraction, activeCaptureId, categories, capture.suggestedCategoryId]);
  useEffect(() => { applyExtraction(); }, [applyExtraction]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    void discardRef.current();
    router.replace('/');
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cloudPreviewVisible) dismissCloudPreview();
      else if (amountVisible) setAmountVisible(false);
      else if (categoryVisible) setCategoryVisible(false);
      else if (dateVisible) setDateVisible(false);
      else close();
      return true;
    });
    return () => subscription.remove();
  }, [close, cloudPreviewVisible, dismissCloudPreview, amountVisible, categoryVisible, dateVisible]);

  const edit = <K extends keyof ScreenBillDraft>(key: K, value: ScreenBillDraft[K]) => {
    editedRef.current[key] = true;
    if (key === 'occurredAt') setTimeEdited(true);
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };
  const category = categories.find((item) => item.id === (draft.subcategoryId ?? draft.categoryId));
  const activeCategories = useMemo(() => categories.filter((item) => !item.isArchived && item.type === draft.type), [categories, draft.type]);
  const amountMinor = evaluateAmountExpressionToCents(draft.amount);
  const amountText = draft.amount ? formatAmountExpression(draft.amount) : '待补金额';
  const blocked = ready?.extraction.blockingReason;
  const warning = error ?? capture.error ?? (amountMinor && !ready?.extraction.amountMinor && !blocked ? null : ready?.extraction.warnings[0]) ?? null;
  const canSave = Boolean(ready && amountMinor && draft.categoryId && !capture.recognizing && !saving && !blocked);

  const save = async () => {
    if (savingRef.current || savedRef.current || !canSave || !ready || !amountMinor || !draft.categoryId) return;
    if (!capture.ensureFresh()) return;
    savingRef.current = true;
    setSaving(true);
    capture.stopRecognition();
    Keyboard.dismiss();
    try {
      if (!demo) createScreenTransaction(db, {
        captureId: ready.capture.captureId, type: draft.type, amountMinor,
        categoryId: draft.categoryId, subcategoryId: draft.subcategoryId,
        occurredAt: draft.occurredAt, note: draft.note,
      });
      savedRef.current = true;
      await capture.discard().catch(() => undefined);
      if (Platform.OS === 'android') ToastAndroid.show(demo ? '预览完成，不会入账' : '已记好这笔', ToastAndroid.SHORT);
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请重试');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const consentCloud = async () => {
    try {
      await setScreenCloudConsent(true);
      dismissCloudPreview();
      await capture.recognizeCloud();
    } catch { setError('暂时无法开启云端识别，请重试'); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>声账</Text>
        <Text style={styles.headerHint}>快捷记账</Text>
        <Pressable onPress={close} accessibilityLabel="关闭快捷记账" style={styles.close}>
          <Icon name="close" size={20} color={colors.inkSecondary} />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.center}>
        <View style={styles.card}>
          {!ready ? (
            <View style={styles.state}>
              {capture.loading ? <ActivityIndicator color={colors.blushDeep} /> : <Icon name="ledger" size={25} color={colors.blushDeep} />}
              <Text style={styles.stateTitle}>{capture.loading ? '正在读取截图' : capture.expired ? '截图已过期' : capture.viewState?.kind === 'setup_required' ? '先设置快捷记账' : '还没有账单截图'}</Text>
              <Text style={styles.stateText}>{capture.error ?? (capture.viewState?.kind === 'unsupported' ? '真实截图识别需要新版 Android 安装包。' : '在付款详情页点击“声账记账”，或把一张截图分享给声账。')}</Text>
              {!capture.loading ? <Pressable onPress={() => router.replace('/screen-capture-settings')} style={styles.primary}><Text style={styles.primaryText}>查看设置</Text></Pressable> : null}
            </View>
          ) : (
            <>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>核对这一笔</Text>
                <Text style={styles.source}>{demo ? '预览 · 不会入账' : ready.capture.sourceApp === 'wechat' ? '微信支付' : ready.capture.sourceApp === 'alipay' ? '支付宝' : '账单截图'}</Text>
              </View>
              <Pressable onPress={() => { Keyboard.dismiss(); setAmountVisible(true); }} accessibilityLabel={draft.amount ? `修改金额，当前${amountText}元` : '补充金额'} style={styles.amountArea}>
                {draft.amount ? <Text style={styles.currency}>{draft.type === 'expense' ? '−' : '+'} ¥</Text> : null}
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, !draft.amount && styles.amountUnknown]}>{amountText}</Text>
                <Icon name="edit" size={15} color={colors.inkTertiary} />
              </Pressable>
              <View style={styles.noteRow}>
                <TextInput accessibilityLabel="商户或商品内容" value={draft.note} onChangeText={(value) => edit('note', value)} placeholder="内容待补充" placeholderTextColor={colors.inkTertiary} maxLength={40} returnKeyType="done" style={styles.note} />
                <Icon name="edit" size={15} color={colors.inkTertiary} />
              </View>
              <View style={styles.metaRow}>
                <Pressable onPress={() => { Keyboard.dismiss(); setCategoryVisible(true); }} accessibilityLabel="修改收支和分类" style={styles.categoryChip}>
                  <CategoryIcon icon={category?.icon ?? 'other'} color={colors.inkSecondary} size={16} />
                  <Text style={styles.metaText} numberOfLines={1}>{category?.name ?? '选择分类'}</Text>
                  <Icon name="chevron-right" size={12} color={colors.inkTertiary} />
                </Pressable>
                <Pressable onPress={() => { Keyboard.dismiss(); setDateVisible(true); }} accessibilityLabel="修改交易时间" style={styles.timeButton}>
                  <Text style={styles.timeText}>{displayTime(draft.occurredAt)}</Text>
                  <Text style={styles.timeOrigin}>{timeEdited ? '已修改' : ready.extraction.timeSource === 'capture' ? '默认当前时间' : '交易时间'}</Text>
                </Pressable>
              </View>
              {capture.recognizing ? <View style={styles.progress}><ActivityIndicator size="small" color={colors.blushDeep} /><Text style={styles.progressText}>正在用视觉模型识别…</Text></View> : warning ? <Pressable onPress={() => Alert.alert('识别提示', warning)}><Text numberOfLines={2} style={styles.warningText}>{warning}</Text></Pressable> : <Text style={styles.hint}>点内容可修改，确认后直接入账</Text>}
              <Pressable disabled={!canSave} onPress={() => void save()} style={[styles.primary, !canSave && styles.disabled]} accessibilityLabel="确定收好了">
                <Text style={styles.primaryText}>{saving ? '正在记好…' : capture.recognizing ? '正在识别…' : demo ? '预览确定收好了' : '确定收好了'}</Text>
              </Pressable>
              {blocked ? <Pressable onPress={() => router.replace('/entry')} style={styles.secondary}><Text style={styles.secondaryText}>转手动记账</Text></Pressable> : ready.capture.screenshotUri && !capture.recognizing && !demo ? <Pressable onPress={() => capture.needsCloudConsent ? setCloudPreview(true) : void capture.recognizeCloud()} style={styles.secondary}><Text style={styles.secondaryText}>{capture.needsCloudConsent ? '开启云端识别' : '重新识别'}</Text></Pressable> : null}
            </>
          )}
        </View>
        <Text style={styles.outsideHint}>只识别这一次，确认后直接保存</Text>
      </KeyboardAvoidingView>

      <AnimatedSheetModal visible={amountVisible} onRequestClose={() => setAmountVisible(false)} closeAccessibilityLabel="关闭金额编辑" sheetStyle={styles.sheet}>
        <Text style={styles.sheetTitle}>修改金额</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.editAmount}>¥ {draft.amount ? formatAmountExpression(draft.amount) : '0.00'}</Text>
        <AmountKeypad onKey={(key: AmountKey) => edit('amount', appendAmountKey(draft.amount, key))} onDelete={() => edit('amount', deleteAmountKey(draft.amount))} />
        <Pressable onPress={() => setAmountVisible(false)} style={[styles.primary, { marginBottom: Math.max(insets.bottom, 12) }]}><Text style={styles.primaryText}>完成</Text></Pressable>
      </AnimatedSheetModal>

      <AnimatedSheetModal visible={categoryVisible} onRequestClose={() => setCategoryVisible(false)} closeAccessibilityLabel="关闭分类选择" sheetStyle={styles.categorySheet}>
        <Text style={styles.sheetTitle}>收支与分类</Text>
        <View style={styles.typeRow}>{(['expense', 'income'] as const).map((type) => <Pressable key={type} onPress={() => {
          editedRef.current.categoryId = true;
          edit('type', type);
          setDraft((current) => ({ ...current, categoryId: recommendCategory(current.note, type, categories), subcategoryId: null }));
        }} style={[styles.typeButton, draft.type === type && styles.typeSelected]}><Text style={styles.metaText}>{type === 'expense' ? '支出' : '收入'}</Text></Pressable>)}</View>
        <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
          {activeCategories.filter((item) => !item.parentId).map((root) => <View key={root.id}>
            <Pressable onPress={() => { editedRef.current.categoryId = true; setDraft((current) => ({ ...current, categoryId: root.id, subcategoryId: null })); setCategoryVisible(false); }} style={styles.categoryOption}>
              <CategoryIcon icon={root.icon} size={20} color={colors.inkSecondary} /><Text style={styles.categoryOptionText}>{root.name}</Text>{draft.categoryId === root.id && !draft.subcategoryId ? <Icon name="check" size={18} color={colors.blushDeep} /> : null}
            </Pressable>
            {draft.categoryId === root.id ? <View style={styles.children}>{activeCategories.filter((item) => item.parentId === root.id).map((child) => <Pressable key={child.id} onPress={() => { editedRef.current.categoryId = true; setDraft((current) => ({ ...current, categoryId: root.id, subcategoryId: child.id })); setCategoryVisible(false); }} style={styles.childChip}><Text style={styles.secondaryText}>{child.name}</Text></Pressable>)}</View> : null}
          </View>)}
        </ScrollView>
        <Pressable onPress={() => setCategoryVisible(false)} style={[styles.primary, { marginBottom: Math.max(insets.bottom, 12) }]}><Text style={styles.primaryText}>完成</Text></Pressable>
      </AnimatedSheetModal>

      <DateTimePickerSheet visible={dateVisible} value={new Date(draft.occurredAt)} onClose={() => setDateVisible(false)} onConfirm={(date) => { edit('occurredAt', date.toISOString()); setDateVisible(false); }} />

      <Modal visible={cloudPreviewVisible} onRequestClose={dismissCloudPreview} animationType="fade">
        <SafeAreaView style={styles.cloudRoot}>
          <Text style={styles.sheetTitle}>确认发送这张截图</Text>
          <Text style={styles.cloudText}>快捷记账将把当前截图经声账服务发送给视觉模型，直接提取金额、内容、时间和分类。图片可能包含余额、姓名、卡号等信息，可先遮盖无关信息再分享。服务端不长期保存图片。开启一次后，后续点击直接识别，可在设置关闭。</Text>
          {capture.screenshotUri ? <Image source={{ uri: capture.screenshotUri }} resizeMode="contain" style={styles.cloudImage} /> : null}
          <Pressable onPress={() => void consentCloud()} style={styles.primary}><Text style={styles.primaryText}>同意并开启云端识别</Text></Pressable>
          <Pressable onPress={dismissCloudPreview} style={styles.secondary}><Text style={styles.secondaryText}>暂不开启，手动填写</Text></Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, gap: spacing.sm },
  brand: { color: colors.ink, fontSize: 21, fontWeight: '600' },
  headerHint: { color: colors.inkTertiary, fontSize: 12, flex: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: { width: '100%', maxWidth: 360, padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.ink, shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  source: { fontSize: 11, color: colors.inkSecondary },
  amountArea: { minHeight: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  currency: { fontSize: 22, color: colors.ink, fontWeight: '500' },
  amount: { flexShrink: 1, fontSize: 44, fontWeight: '500', fontVariant: ['tabular-nums'], color: colors.ink },
  amountUnknown: { fontSize: 30, color: colors.inkTertiary },
  noteRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  note: { flex: 1, fontSize: 16, lineHeight: 23, color: colors.ink, paddingVertical: 8, includeFontPadding: false },
  metaRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  categoryChip: { minHeight: 44, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: colors.inkSecondary, fontSize: 13, flexShrink: 1 },
  timeButton: { minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  timeText: { color: colors.inkSecondary, fontSize: 12 },
  timeOrigin: { color: colors.inkTertiary, fontSize: 10, marginTop: 3 },
  hint: { color: colors.inkTertiary, fontSize: 11, textAlign: 'center', marginBottom: spacing.md },
  warningText: { color: colors.blushDeep, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  progress: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  progressText: { color: colors.inkSecondary, fontSize: 12 },
  primary: { minHeight: 48, borderRadius: radii.md, backgroundColor: colors.blushDeep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  primaryText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.42 },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  secondaryText: { color: colors.inkSecondary, fontSize: 12 },
  outsideHint: { marginTop: spacing.lg, fontSize: 11, color: colors.inkTertiary },
  state: { alignItems: 'stretch', gap: spacing.md, paddingVertical: spacing.sm },
  stateTitle: { fontSize: 20, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  stateText: { color: colors.inkSecondary, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  sheet: { padding: spacing.xl, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.canvas },
  sheetTitle: { color: colors.ink, fontSize: 20, fontWeight: '600', marginBottom: spacing.md },
  editAmount: { color: colors.ink, fontSize: 36, minHeight: 62, textAlign: 'center' },
  categorySheet: { maxHeight: '75%', padding: spacing.xl, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.canvas },
  categoryList: { flexGrow: 0, marginVertical: spacing.sm },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.surface },
  typeSelected: { backgroundColor: colors.blushSoft },
  categoryOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  categoryOptionText: { flex: 1, color: colors.ink, fontSize: 15 },
  children: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.sm },
  childChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surfaceSunken },
  cloudRoot: { flex: 1, padding: spacing.xl, backgroundColor: colors.canvas },
  cloudText: { color: colors.inkSecondary, fontSize: 12, lineHeight: 19 },
  cloudImage: { flex: 1, minHeight: 80, marginVertical: spacing.lg },
});
