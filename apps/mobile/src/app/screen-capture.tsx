import {
  appendAmountKey,
  deleteAmountKey,
  evaluateAmountExpressionToCents,
  formatAmountExpression,
  type AmountKey,
  type ScreenBillExtraction,
  type TransactionType,
} from '@shengzhang/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountKeypad } from '../components/AmountKeypad';
import { AnimatedSheetModal } from '../components/AnimatedSheetModal';
import { CategoryEditorSheet } from '../components/CategoryEditorSheet';
import { CategoryIcon } from '../components/CategoryIcon';
import { DateTimePickerSheet } from '../components/DateTimePickerSheet';
import { Icon } from '../components/Icon';
import { listCategories, type CategoryRow } from '../db/categoryRepository';
import { useDatabase } from '../db/DatabaseProvider';
import {
  createScreenTransaction,
  softDeleteTransaction,
} from '../db/transactionRepository';
import { useScreenCapture } from '../features/screenCapture/useScreenCapture';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDayHeading, formatTime } from '../utils/date';

const NEW_CATEGORY_COLORS = ['#E89A96', '#D7A66F', '#9EAD98', '#91A6B5', '#9B9BB6', '#A39A91'];
const UNDO_SECONDS = 8;

function amountFromMinor(amountMinor: number | null): string {
  if (amountMinor === null) return '';
  return (amountMinor / 100).toFixed(2).replace(/\.00$/, '');
}

function categoryRecommendation(
  note: string,
  type: TransactionType,
  categories: CategoryRow[],
): { rootId: string | null; subcategoryId: string | null } {
  const roots = categories.filter(
    (category) => category.type === type && category.parentId === null,
  );
  if (roots.length === 0) return { rootId: null, subcategoryId: null };

  const preferredId = (() => {
    if (type === 'income') {
      if (/退款|退回/.test(note)) return 'income-refund';
      if (/报销/.test(note)) return 'income-reimburse';
      if (/工资|薪资/.test(note)) return 'income-salary';
      return 'income-other';
    }
    if (/滴滴|打车|出租|高德|曹操|T3/.test(note)) return 'expense-transport';
    if (/美团|饿了么|外卖|餐厅|饭|咖啡|奶茶|便利店/.test(note)) return 'expense-food';
    if (/超市|商城|淘宝|京东|拼多多/.test(note)) return 'expense-shopping';
    if (/药|医院|诊所/.test(note)) return 'expense-health';
    if (/电影|演出|游戏|会员/.test(note)) return 'expense-entertainment';
    return 'expense-other';
  })();

  const root = roots.find((category) => category.id === preferredId) ?? roots[0];
  const children = categories
    .filter((category) => category.parentId === root.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const preferredChild = /滴滴|打车|出租/.test(note)
    ? children.find((category) => /打车/.test(category.name))
    : /外卖/.test(note)
      ? children.find((category) => /外卖/.test(category.name))
      : null;

  return {
    rootId: root.id,
    subcategoryId: (preferredChild ?? children[0])?.id ?? null,
  };
}

function sourceLabel(source: 'wechat' | 'alipay' | 'unknown'): string {
  if (source === 'wechat') return '微信支付';
  if (source === 'alipay') return '支付宝';
  return '当前付款页';
}

function confidenceLabel(extraction: ScreenBillExtraction): string {
  if (extraction.confidence === 'high') return '已识别';
  if (extraction.confidence === 'medium') return '请核对';
  return '需补充';
}

export default function ScreenCaptureScreen() {
  const db = useDatabase();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ demo?: string }>();
  const demo = params.demo === '1';
  const capture = useScreenCapture({ demo });
  const readyState = capture.viewState?.kind === 'ready' ? capture.viewState : null;
  const discardCapture = capture.discard;

  const [categories, setCategories] = useState<CategoryRow[]>(() => listCategories(db));
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [amountSheetVisible, setAmountSheetVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categoryParent, setCategoryParent] = useState<CategoryRow | null>(null);
  const [categoryEditorVisible, setCategoryEditorVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null);
  const [undone, setUndone] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(UNDO_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const initializedCaptureRef = useRef<string | null>(null);
  const amountTouchedRef = useRef(false);
  const noteTouchedRef = useRef(false);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyExtraction = useCallback(
    (
      extraction: ScreenBillExtraction,
      captureId: string,
      replaceFields: boolean,
    ) => {
      if (replaceFields || (!amountTouchedRef.current && extraction.amountMinor !== null)) {
        setAmount(amountFromMinor(extraction.amountMinor));
      }
      if (replaceFields || (!noteTouchedRef.current && extraction.note)) {
        setNote(extraction.note);
      }
      if (replaceFields) {
        setOccurredAt(new Date(extraction.occurredAt));
        const recommendation = categoryRecommendation(extraction.note, extraction.type, categories);
        setType(extraction.type);
        setCategoryId(recommendation.rootId);
        setSubcategoryId(recommendation.subcategoryId);
        initializedCaptureRef.current = captureId;
      }
    },
    [categories],
  );

  const extractedCapture = readyState?.capture ?? null;
  const extraction = readyState?.extraction ?? null;

  useEffect(() => {
    if (!extractedCapture || !extraction) return;
    const firstLoad = initializedCaptureRef.current !== extractedCapture.captureId;
    applyExtraction(extraction, extractedCapture.captureId, firstLoad);
  }, [applyExtraction, extractedCapture, extraction]);

  useEffect(() => {
    return () => {
      void discardCapture();
    };
  }, [discardCapture]);

  const navigateToLedger = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const dismiss = () => {
    if (!saved) void capture.discard();
    navigateToLedger();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => subscription.remove();
  });

  const roots = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            category.type === type && category.parentId === null && !category.isArchived,
        )
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [categories, type],
  );
  const selectedRoot = roots.find((category) => category.id === categoryId) ?? null;
  const subcategories = useMemo(
    () =>
      categories
        .filter((category) => category.parentId === categoryId && !category.isArchived)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [categories, categoryId],
  );
  const suggestedColor =
    selectedRoot?.color ??
    NEW_CATEGORY_COLORS[
      roots.length % NEW_CATEGORY_COLORS.length
    ];
  const displayedAmount = amount ? formatAmountExpression(amount) : '0.00';
  const amountFontSize =
    displayedAmount.length >= 14 ? 31 : displayedAmount.length >= 11 ? 38 : 46;

  const clearTimers = () => {
    if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  const finishReturn = () => {
    clearTimers();
    router.replace('/');
  };

  const enterSavedState = (transactionId: string | null) => {
    setSavedTransactionId(transactionId);
    setSaved(true);
    setRemainingSeconds(UNDO_SECONDS);
    clearTimers();
    countdownTimerRef.current = setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1_000);
    returnTimerRef.current = setTimeout(finishReturn, UNDO_SECONDS * 1_000);
  };

  const save = async () => {
    if (saving || !readyState) return;
    const amountMinor = evaluateAmountExpressionToCents(amount);
    if (!amountMinor) {
      setError('请输入正确金额');
      setAmountSheetVisible(true);
      return;
    }
    if (!categoryId) {
      setError('请选择分类');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (demo) {
        enterSavedState(null);
      } else {
        const transactionId = createScreenTransaction(db, {
          captureId: readyState.capture.captureId,
          type,
          amountMinor,
          categoryId,
          subcategoryId,
          occurredAt: occurredAt.toISOString(),
          note,
        });
        enterSavedState(transactionId);
      }
      await capture.discard().catch(() => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const undo = () => {
    clearTimers();
    if (!demo && savedTransactionId) softDeleteTransaction(db, savedTransactionId);
    setUndone(true);
    undoTimerRef.current = setTimeout(() => router.replace('/'), 650);
  };

  const changeType = (nextType: TransactionType) => {
    const recommendation = categoryRecommendation(note, nextType, categories);
    setType(nextType);
    setCategoryId(recommendation.rootId);
    setSubcategoryId(recommendation.subcategoryId);
    setError(null);
  };

  const selectRoot = (category: CategoryRow) => {
    const children = categories
      .filter((item) => item.parentId === category.id && !item.isArchived)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    setCategoryId(category.id);
    setSubcategoryId(children[0]?.id ?? null);
    setError(null);
  };

  const openCategoryEditor = (parent: CategoryRow | null) => {
    setCategoryParent(parent);
    setCategoryEditorVisible(true);
  };

  const refreshCategories = () => {
    const previousIds = new Set(categories.map((category) => category.id));
    const next = listCategories(db);
    const created = next.find((category) => !previousIds.has(category.id));
    setCategories(next);
    if (!created) return;
    if (created.parentId) {
      setCategoryId(created.parentId);
      setSubcategoryId(created.id);
    } else {
      setCategoryId(created.id);
      setSubcategoryId(null);
    }
  };

  const appendAmount = (key: AmountKey) => {
    amountTouchedRef.current = true;
    setAmount((current) => appendAmountKey(current, key));
    setError(null);
  };

  const renderNonReadyState = () => {
    if (capture.loading || !capture.viewState) {
      return (
        <View style={styles.stateCard}>
          <View style={styles.stateMark}>
            <View style={styles.loadingDot} />
            <View style={[styles.loadingDot, styles.loadingDotMiddle]} />
            <View style={styles.loadingDot} />
          </View>
          <Text style={styles.stateTitle}>正在读取这一页</Text>
          <Text style={styles.stateText}>只在你点击快捷磁贴后读取一次。</Text>
        </View>
      );
    }

    if (capture.viewState.kind === 'ready') return null;

    const unsupported = capture.viewState.kind === 'unsupported';
    const setupRequired = capture.viewState.kind === 'setup_required';
    const title = unsupported
      ? debugRuntimeTitle(capture.viewState.status.platform)
      : setupRequired
        ? '先开启读取服务'
        : '还没有可确认的账单';
    const body = unsupported
      ? capture.viewState.status.reason ?? '当前运行环境不支持付款页快捷记账。'
      : setupRequired
        ? '开启声账的无障碍服务后，点击“声账记账”磁贴才会读取当前付款页。'
        : '请先在微信或支付宝付款成功页，点击控制中心里的“声账记账”。';

    return (
      <View style={styles.stateCard}>
        <View style={styles.stateIcon}>
          <Icon name="ledger" size={24} color={colors.blushDeep} />
        </View>
        <Text style={styles.stateEyebrow}>声账记账</Text>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateText}>{body}</Text>
        <Pressable
          onPress={() => router.replace('/screen-capture-settings')}
          style={styles.statePrimary}
        >
          <Text style={styles.statePrimaryText}>
            {setupRequired ? '前往开启' : '查看设置与预览'}
          </Text>
        </Pressable>
        <Pressable onPress={dismiss} style={styles.stateSecondary}>
          <Text style={styles.stateSecondaryText}>返回账本</Text>
        </Pressable>
      </View>
    );
  };

  const source = readyState ? sourceLabel(readyState.capture.sourceApp) : '付款页';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.background}>
        {capture.screenshotUri ? (
          <Image
            blurRadius={28}
            resizeMode="cover"
            source={{ uri: capture.screenshotUri }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.backgroundWash} />
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="关闭" onPress={dismiss} style={styles.closeButton}>
            <Icon name="close" size={20} color={colors.surface} />
          </Pressable>
          <View style={styles.topBadge}>
            <View style={styles.topBadgeDot} />
            <Text style={styles.topBadgeText}>{demo ? '界面预览' : `${source} · 刚刚读取`}</Text>
          </View>
          <View style={styles.topSpace} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.body}
        >
          {!readyState ? (
            <View style={styles.centerState}>{renderNonReadyState()}</View>
          ) : (
            <View style={[styles.panel, { marginBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.handle} />
              <ScrollView
                contentContainerStyle={styles.panelContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {saved ? (
                  <View style={styles.successContent}>
                    <View style={[styles.successMark, undone && styles.undoneMark]}>
                      <Icon
                        name={undone ? 'back' : 'check'}
                        size={26}
                        color={undone ? colors.inkSecondary : colors.income}
                        strokeWidth={2.2}
                      />
                    </View>
                    <Text style={styles.successTitle}>{undone ? '已撤销' : '已记好这笔'}</Text>
                    <Text style={styles.successAmount}>
                      {type === 'expense' ? '−' : '+'}¥{displayedAmount}
                    </Text>
                    <Text style={styles.successMeta}>{note || selectedRoot?.name || '未填写内容'}</Text>
                    {!undone ? (
                      <>
                        <Pressable accessibilityLabel="撤销这笔账单" onPress={undo} style={styles.undoButton}>
                          <Text style={styles.undoText}>撤销</Text>
                        </Pressable>
                        <Text style={styles.undoHint}>{remainingSeconds} 秒后返回账本</Text>
                      </>
                    ) : null}
                  </View>
                ) : (
                  <>
                    <View style={styles.titleRow}>
                      <View style={styles.titleCopy}>
                        <Text style={styles.eyebrow}>PAYMENT FOUND</Text>
                        <Text style={styles.title}>识别到一笔账单</Text>
                        <Text style={styles.subtitle}>金额和内容都可以直接改，确认后才入账。</Text>
                      </View>
                      <View
                        style={[
                          styles.confidenceBadge,
                          extraction?.confidence === 'high' && styles.confidenceHigh,
                        ]}
                      >
                        <View
                          style={[
                            styles.confidenceDot,
                            extraction?.confidence === 'high' && styles.confidenceDotHigh,
                          ]}
                        />
                        <Text
                          style={[
                            styles.confidenceText,
                            extraction?.confidence === 'high' && styles.confidenceTextHigh,
                          ]}
                        >
                          {extraction ? confidenceLabel(extraction) : '读取中'}
                        </Text>
                      </View>
                    </View>

                    {demo ? (
                      <View style={styles.demoNotice}>
                        <Text style={styles.demoNoticeText}>预览模式不会写入账本，真实磁贴会读取当前付款页。</Text>
                      </View>
                    ) : null}

                    {capture.recognizing ? (
                      <View style={styles.infoNotice}>
                        <Text style={styles.infoNoticeText}>页面文字不够完整，正在本机识别截图…</Text>
                      </View>
                    ) : null}

                    {capture.error || error || extraction?.warnings.length ? (
                      <View style={styles.warningNotice}>
                        <Text style={styles.warningTitle}>请顺手核对</Text>
                        <Text style={styles.warningText}>
                          {error ?? capture.error ?? extraction?.warnings.join('；')}
                        </Text>
                        {capture.error?.includes('识别') ? (
                          <Pressable onPress={capture.retryOcr} style={styles.retryButton}>
                            <Text style={styles.retryText}>重试识别</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.segment}>
                      {(['expense', 'income'] as const).map((value) => (
                        <Pressable
                          key={value}
                          onPress={() => changeType(value)}
                          style={[styles.segmentItem, type === value && styles.segmentActive]}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              type === value && styles.segmentTextActive,
                            ]}
                          >
                            {value === 'expense' ? '支出' : '收入'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Pressable
                      accessibilityLabel={`修改金额，当前 ${displayedAmount} 元`}
                      onPress={() => setAmountSheetVisible(true)}
                      style={({ pressed }) => [styles.amountCard, pressed && styles.pressed]}
                    >
                      <Text style={styles.amountLabel}>
                        {type === 'expense' ? '实付金额' : '收到金额'}
                      </Text>
                      <View style={styles.amountRow}>
                        <Text style={styles.currency}>{type === 'expense' ? '−' : '+'}¥</Text>
                        <Text
                          adjustsFontSizeToFit
                          numberOfLines={1}
                          style={[styles.amountValue, { fontSize: amountFontSize }]}
                        >
                          {displayedAmount}
                        </Text>
                        <View style={styles.editPill}>
                          <Text style={styles.editPillText}>修改</Text>
                        </View>
                      </View>
                      <Text style={styles.amountHint}>点击金额可打开数字键盘</Text>
                    </Pressable>

                    <View style={styles.sectionHeading}>
                      <Text style={styles.sectionLabel}>分类</Text>
                      <Pressable
                        onPress={() => openCategoryEditor(null)}
                        style={styles.addCategoryButton}
                      >
                        <Icon name="plus" size={13} color={colors.blushDeep} strokeWidth={2} />
                        <Text style={styles.addCategoryText}>新建分类</Text>
                      </Pressable>
                    </View>
                    <ScrollView
                      horizontal
                      contentContainerStyle={styles.rootCategories}
                      showsHorizontalScrollIndicator={false}
                    >
                      {roots.map((category) => {
                        const selected = category.id === categoryId;
                        return (
                          <Pressable
                            key={category.id}
                            onPress={() => selectRoot(category)}
                            style={[
                              styles.rootCategory,
                              selected && {
                                borderColor: category.color,
                                backgroundColor: `${category.color}18`,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.categoryIcon,
                                { backgroundColor: `${category.color}20` },
                              ]}
                            >
                              <CategoryIcon
                                color={category.color}
                                icon={category.icon}
                                size={15}
                                strokeWidth={1.7}
                              />
                            </View>
                            <Text
                              style={[
                                styles.rootCategoryText,
                                selected && styles.rootCategoryTextSelected,
                              ]}
                            >
                              {category.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.subcategoryWrap}>
                      {subcategories.map((category) => {
                        const selected = category.id === subcategoryId;
                        return (
                          <Pressable
                            key={category.id}
                            onPress={() => {
                              setSubcategoryId(category.id);
                              setError(null);
                            }}
                            style={[styles.subcategory, selected && styles.subcategorySelected]}
                          >
                            <Text
                              style={[
                                styles.subcategoryText,
                                selected && styles.subcategoryTextSelected,
                              ]}
                            >
                              {category.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                      {selectedRoot ? (
                        <Pressable
                          accessibilityLabel={`在${selectedRoot.name}下新建二级分类`}
                          onPress={() => openCategoryEditor(selectedRoot)}
                          style={styles.subcategoryAdd}
                        >
                          <Icon name="plus" size={12} color={colors.blushDeep} />
                          <Text style={styles.subcategoryAddText}>新建子分类</Text>
                        </Pressable>
                      ) : null}
                    </View>

                    <Text style={styles.sectionLabel}>时间</Text>
                    <Pressable
                      accessibilityLabel="修改账单日期和时间"
                      onPress={() => setDatePickerVisible(true)}
                      style={styles.detailRow}
                    >
                      <View style={styles.detailIcon}>
                        <Icon name="calendar" size={18} color={colors.blushDeep} />
                      </View>
                      <View style={styles.detailCopy}>
                        <Text style={styles.detailTitle}>{formatDayHeading(occurredAt)}</Text>
                        <Text style={styles.detailHint}>点击选择日期和时间</Text>
                      </View>
                      <Text style={styles.detailTime}>{formatTime(occurredAt.toISOString())}</Text>
                      <Icon name="chevron-right" size={15} color={colors.inkTertiary} />
                    </Pressable>

                    <Text style={styles.sectionLabel}>商户 / 内容</Text>
                    <TextInput
                      accessibilityLabel="商户或账单内容"
                      maxLength={40}
                      onChangeText={(value) => {
                        noteTouchedRef.current = true;
                        setNote(value);
                        setError(null);
                      }}
                      placeholder="例如：滴滴出行"
                      placeholderTextColor={colors.inkTertiary}
                      returnKeyType="done"
                      style={styles.noteInput}
                      value={note}
                    />

                    <View style={styles.actions}>
                      <Pressable onPress={dismiss} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>取消</Text>
                      </Pressable>
                      <Pressable
                        disabled={saving}
                        onPress={() => void save()}
                        style={[styles.saveButton, saving && styles.disabled]}
                      >
                        {saving ? (
                          <Text style={styles.saveText}>正在保存…</Text>
                        ) : (
                          <>
                            <Icon name="check" size={18} color={colors.surface} strokeWidth={2.2} />
                            <Text style={styles.saveText}>记好这笔</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                    <Text style={styles.privacy}>截图与原文只在本次确认中使用，保存后立即清理。</Text>
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AnimatedSheetModal
        closeAccessibilityLabel="关闭金额键盘"
        onRequestClose={() => setAmountSheetVisible(false)}
        sheetStyle={styles.amountSheet}
        visible={amountSheetVisible}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.amountSheetHeader}>
          <View>
            <Text style={styles.sheetEyebrow}>EDIT AMOUNT</Text>
            <Text style={styles.sheetTitle}>修改金额</Text>
          </View>
          <Text style={styles.sheetSource}>{source}</Text>
        </View>
        <View style={styles.keypadAmountRow}>
          <Text style={styles.keypadCurrency}>¥</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.keypadAmount}>
            {displayedAmount}
          </Text>
        </View>
        <AmountKeypad onKey={appendAmount} onDelete={() => setAmount(deleteAmountKey)} />
        <Pressable
          onPress={() => setAmountSheetVisible(false)}
          style={[styles.keypadDone, { marginBottom: Math.max(insets.bottom, 14) }]}
        >
          <Text style={styles.keypadDoneText}>完成</Text>
        </Pressable>
      </AnimatedSheetModal>

      <DateTimePickerSheet
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          setOccurredAt(date);
          setDatePickerVisible(false);
        }}
        value={occurredAt}
        visible={datePickerVisible}
      />

      {categoryEditorVisible ? (
        <CategoryEditorSheet
          category={null}
          onChanged={refreshCategories}
          onClose={() => setCategoryEditorVisible(false)}
          parent={categoryParent}
          suggestedColor={suggestedColor}
          type={type}
        />
      ) : null}
    </View>
  );
}

function debugRuntimeTitle(platform: 'android' | 'ios' | 'web') {
  if (platform === 'ios') return 'iPhone 请使用快捷指令';
  if (platform === 'web') return '网页预览不读取付款页';
  return '请安装新版 Android App';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#332D29',
  },
  background: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#3C342F',
  },
  backgroundWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(35, 30, 27, 0.56)',
  },
  glowOne: {
    position: 'absolute',
    top: -110,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(232, 154, 150, 0.27)',
  },
  glowTwo: {
    position: 'absolute',
    bottom: 170,
    left: -130,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(225, 189, 123, 0.18)',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  topBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(37, 31, 28, 0.52)',
  },
  topBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B8D0A9',
  },
  topBadgeText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    fontWeight: '600',
  },
  topSpace: {
    width: 42,
  },
  body: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 80,
  },
  stateCard: {
    width: '100%',
    maxWidth: 430,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    borderRadius: 30,
    backgroundColor: 'rgba(255,253,248,0.96)',
  },
  stateMark: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blush,
  },
  loadingDotMiddle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.blushDeep,
  },
  stateIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.blushSoft,
  },
  stateEyebrow: {
    marginTop: spacing.lg,
    color: colors.blushDeep,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  stateTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 25,
    textAlign: 'center',
  },
  stateText: {
    marginTop: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  statePrimary: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  statePrimaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  stateSecondary: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.lg,
  },
  stateSecondaryText: {
    color: colors.inkTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    alignSelf: 'center',
    paddingTop: spacing.sm,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.canvas,
    shadowColor: '#1E1814',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  panelContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.blushDeep,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    marginTop: 3,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 27,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 5,
    color: colors.inkSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  confidenceBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: '#F7E9D7',
  },
  confidenceHigh: {
    backgroundColor: colors.sageSoft,
  },
  confidenceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.sand,
  },
  confidenceDotHigh: {
    backgroundColor: colors.income,
  },
  confidenceText: {
    color: '#8D6B35',
    fontSize: 9,
    fontWeight: '700',
  },
  confidenceTextHigh: {
    color: colors.income,
  },
  demoNotice: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.blushSoft,
  },
  demoNoticeText: {
    color: colors.blushDeep,
    fontSize: 10,
    lineHeight: 15,
  },
  infoNotice: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.sageSoft,
  },
  infoNoticeText: {
    color: colors.income,
    fontSize: 10,
  },
  warningNotice: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#EFD8C0',
    borderRadius: 14,
    backgroundColor: '#FFF7EB',
  },
  warningTitle: {
    color: '#7F5C2F',
    fontSize: 11,
    fontWeight: '700',
  },
  warningText: {
    marginTop: 3,
    color: '#8C7252',
    fontSize: 10,
    lineHeight: 15,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 4,
  },
  retryText: {
    color: colors.blushDeep,
    fontSize: 10,
    fontWeight: '700',
  },
  segment: {
    height: 42,
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.lg,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surfaceSunken,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.inkTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  amountCard: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  amountLabel: {
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  amountRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  currency: {
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 23,
    fontWeight: '600',
  },
  amountValue: {
    flex: 1,
    color: colors.ink,
    fontFamily: typography.number,
    fontWeight: '600',
    letterSpacing: -1.2,
  },
  editPill: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.blushSoft,
  },
  editPillText: {
    color: colors.blushDeep,
    fontSize: 9,
    fontWeight: '700',
  },
  amountHint: {
    color: colors.inkTertiary,
    fontSize: 9,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    color: colors.inkTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  addCategoryButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.xl,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.blushSoft,
  },
  addCategoryText: {
    color: colors.blushDeep,
    fontSize: 9,
    fontWeight: '700',
  },
  rootCategories: {
    gap: 7,
    paddingRight: spacing.xl,
  },
  rootCategory: {
    minWidth: 74,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  categoryIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  rootCategoryText: {
    color: colors.inkSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  rootCategoryTextSelected: {
    color: colors.ink,
    fontWeight: '700',
  },
  subcategoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: spacing.sm,
  },
  subcategory: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  subcategorySelected: {
    borderColor: colors.blush,
    backgroundColor: colors.blushSoft,
  },
  subcategoryText: {
    color: colors.inkSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  subcategoryTextSelected: {
    color: colors.blushDeep,
    fontWeight: '700',
  },
  subcategoryAdd: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
  },
  subcategoryAddText: {
    color: colors.blushDeep,
    fontSize: 9,
    fontWeight: '600',
  },
  detailRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  detailIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.blushSoft,
  },
  detailCopy: {
    flex: 1,
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  detailHint: {
    marginTop: 2,
    color: colors.inkTertiary,
    fontSize: 9,
  },
  detailTime: {
    color: colors.inkSecondary,
    fontFamily: typography.number,
    fontSize: 13,
    fontWeight: '600',
  },
  noteInput: {
    height: 52,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
  },
  cancelText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1.7,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  saveText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
  privacy: {
    marginTop: spacing.md,
    color: colors.inkTertiary,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  successContent: {
    minHeight: 410,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 34,
  },
  successMark: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.sageSoft,
  },
  undoneMark: {
    backgroundColor: colors.surfaceSunken,
  },
  successTitle: {
    marginTop: spacing.xl,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 28,
  },
  successAmount: {
    marginTop: spacing.md,
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1.4,
  },
  successMeta: {
    marginTop: spacing.sm,
    color: colors.inkSecondary,
    fontSize: 12,
  },
  undoButton: {
    minWidth: 142,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  undoText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  undoHint: {
    marginTop: spacing.md,
    color: colors.inkTertiary,
    fontSize: 10,
  },
  amountSheet: {
    paddingTop: spacing.md,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.canvas,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  amountSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sheetEyebrow: {
    color: colors.blushDeep,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  sheetTitle: {
    marginTop: 2,
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 24,
  },
  sheetSource: {
    color: colors.inkTertiary,
    fontSize: 10,
  },
  keypadAmountRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: spacing.xl,
  },
  keypadCurrency: {
    color: colors.inkSecondary,
    fontFamily: typography.number,
    fontSize: 24,
  },
  keypadAmount: {
    maxWidth: '78%',
    color: colors.ink,
    fontFamily: typography.number,
    fontSize: 44,
    fontWeight: '600',
    letterSpacing: -1.2,
  },
  keypadDone: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  keypadDoneText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
});
