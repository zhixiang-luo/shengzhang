# 付款页快捷记账 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Android 11+ 交付一个可安装的付款页快捷记账首版：快捷设置磁贴读取当前付款结果页，经文本/OCR 解析后进入可编辑确认卡并安全写入本地账本。

**Architecture:** 使用本地 Expo 原生模块承载 Quick Settings Tile、AccessibilityService、短期草稿和端侧 OCR；React Native 负责统一确认、编辑、保存和撤销界面。纯金额与页面文本解析放在 `@shengzhang/domain`，SQLite 通过前向迁移新增 `screen` 来源并以 captureId 保证幂等。

**Tech Stack:** Expo 58、React Native 0.88、TypeScript 6、Expo Modules API、Kotlin、Android AccessibilityService 与 TileService、ML Kit 中文 OCR、SQLite/Drizzle、Vitest。

**Spec:** `docs/superpowers/specs/2026-11-12-screen-bill-capture-design.md`

## Global Constraints

- Android 首发版本最低 API 30；iOS 首版只展示快捷指令兼容说明，不执行静默读屏。
- 原始截图不进入相册、账本、JSON 备份、CSV、日志或服务端；临时文件最长保留 5 分钟。
- 金统一使用整数分，不引入浮点持久化。
- 只读取微信、支付宝白名单页面的无障碍节点，且只在用户点击磁贴后读取。
- 保存必须由用户确认；保存成功后在同一个浮层提供撤销，不再弹第二个确认框。
- 同一 captureId 只能写入一笔账单。
- 不修改已发布的 SQLite migration；新增 migration v3。
- 保留工作区现有语音缺金额修复、统计和文档改动。
- 新原生能力不能依赖 Expo Go，最终验证必须覆盖 Android export 或 APK 构建。

---

### Task 1: 页面文本结构化与金额候选规则

**Files:**
- Create: `packages/domain/src/screen-bill.ts`
- Create: `packages/domain/src/screen-bill.test.ts`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- Produces: `extractScreenBill(input: ScreenBillTextInput): ScreenBillExtraction`
- Produces: `normalizeScreenAmount(text: string): number | null`
- Produces: `selectBestAmountCandidate(candidates: AmountCandidate[]): AmountCandidate | null`

- [ ] **Step 1: 写金额和页面语义失败测试**

```ts
it('prefers actual paid amount over original and discount', () => {
  const result = extractScreenBill({
    text: '支付成功\n原价 35.00\n优惠 9.00\n实付 ¥26.00\n收款方：滴滴出行',
    now: '2026-11-12T10:30:00.000Z',
    sourceApp: '微信支付',
  });
  expect(result.amountMinor).toBe(2600);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @shengzhang/domain test -- screen-bill`
Expected: FAIL because module and functions do not exist.

- [ ] **Step 3: 实现最小解析器**

规范全角数字、千分位、人民币符号和“元”，按关键词权重选出实付候选；从支付成功、收款方和支付时间文本提取语义字段。金额通过已有的元转分逻辑输出整数分。

- [ ] **Step 4: 增加歧义和去噪测试**

```ts
it('rejects phone order and balance numbers as payment amount', () => {
  expect(normalizeScreenAmount('订单号 202611120001')).toBeNull();
  expect(normalizeScreenAmount('余额 ¥9999.00')).toBeNull();
});
```

- [ ] **Step 5: 运行 domain 测试**

Run: `pnpm --filter @shengzhang/domain test -- screen-bill`
Expected: all screen-bill tests pass.

### Task 2: `screen` 来源与 SQLite 幂等写入

**Files:**
- Modify: `packages/domain/src/transaction.ts`
- Modify: `packages/domain/src/data-portability.ts`
- Modify: `packages/domain/src/data-portability.test.ts`
- Modify: `apps/mobile/src/db/schema.ts`
- Modify: `apps/mobile/src/db/migrations.ts`
- Modify: `apps/mobile/src/db/transactionRepository.ts`
- Create: `apps/mobile/src/db/transactionRepository.screen.test.ts`

**Interfaces:**
- Consumes: `TransactionSource`, `TransactionInput`
- Produces: `createScreenTransaction(db, input: ScreenTransactionInput): string`
- Produces: `ScreenTransactionInput = TransactionInput & { captureId: string }`

- [ ] **Step 1: 写备份来源测试**

```ts
it('round trips a screen-captured transaction', () => {
  const document = buildBackupDocument({
    exportedAt: '2026-11-12T10:30:00.000Z',
    appVersion: '0.3.0',
    data: { ...data, transactions: [{ ...transaction, source: 'screen' }] },
  });
  expect(parseBackupDocument(document).data.transactions[0]?.source).toBe('screen');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @shengzhang/domain test -- data-portability`
Expected: FAIL because `screen` is rejected.

- [ ] **Step 3: 扩展来源并更新 CSV 标签**

将来源枚举和备份校验扩展为 `voice | manual | screen`，CSV 来源列显示“屏幕识别”。

- [ ] **Step 4: 写迁移与幂等 repository 测试**

```ts
it('creates one row when the same capture id is submitted twice', () => {
  const first = createScreenTransaction(db, input);
  const second = createScreenTransaction(db, input);
  expect(second).toBe(first);
  expect(countTransactions(db)).toBe(1);
});
```

- [ ] **Step 5: 运行 mobile 测试确认失败**

Run: `pnpm --filter @shengzhang/mobile test -- transactionRepository.screen`
Expected: FAIL because function is missing.

- [ ] **Step 6: 追加 migration v3 并实现 screen 写入**

重建 `transactions` 表以更新 `source` CHECK；复制原数据、索引和外键后替换，再把 `PRAGMA user_version` 设为 3。`createScreenTransaction` 使用 captureId 作为主键，捕获主键冲突时返回已有 id，确保同一草稿只入账一次。

- [ ] **Step 7: 运行相关测试**

Run: `pnpm --filter @shengzhang/domain test -- data-portability && pnpm --filter @shengzhang/mobile test -- transactionRepository.screen`
Expected: PASS.

### Task 3: 本地 Expo 原生模块与 Android 权限配置

**Files:**
- Create: `packages/screen-capture/package.json`
- Create: `packages/screen-capture/expo-module.config.json`
- Create: `packages/screen-capture/tsconfig.json`
- Create: `packages/screen-capture/src/index.ts`
- Create: `packages/screen-capture/src/index.web.ts`
- Create: `packages/screen-capture/android/build.gradle`
- Create: `packages/screen-capture/android/src/main/AndroidManifest.xml`
- Create: `packages/screen-capture/android/src/main/res/xml/screen_capture_accessibility_service.xml`
- Create: `packages/screen-capture/android/src/main/java/com/shengzhang/screencapture/ScreenCaptureModule.kt`
- Create: `packages/screen-capture/android/src/main/java/com/shengzhang/screencapture/PendingCaptureStore.kt`
- Create: `packages/screen-capture/android/src/main/java/com/shengzhang/screencapture/BillCaptureTileService.kt`
- Create: `packages/screen-capture/android/src/main/java/com/shengzhang/screencapture/BillCaptureAccessibilityService.kt`
- Create: `packages/screen-capture/android/src/main/java/com/shengzhang/screencapture/ScreenOcrProcessor.kt`
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-workspace.yaml` only if workspace resolution requires an explicit module path

**Interfaces:**
- Produces: `getScreenCaptureStatus(): Promise<ScreenCaptureStatus>`
- Produces: `openAccessibilitySettings(): Promise<void>`
- Produces: `requestQuickSettingsTile(): Promise<boolean>`
- Produces: `consumePendingCapture(): Promise<PendingCapture | null>`
- Produces: `recognizeCaptureImage(captureId: string): Promise<string>`
- Produces: `clearCapture(captureId: string): Promise<void>`

- [ ] **Step 1: 创建模块声明和 TypeScript 包装测试桩**

先定义 status、pending capture、OCR 和清理接口；在 Expo Go/Web 上返回 `supported: false`，不得抛未捕获异常。

- [ ] **Step 2: 添加 Android manifest 与服务声明**

声明 `BillCaptureTileService`、`BillCaptureAccessibilityService`、`BIND_ACCESSIBILITY_SERVICE`、`BIND_QUICK_SETTINGS_TILE` 和 `canRetrieveWindowContent/canTakeScreenshot`。

- [ ] **Step 3: 实现私有草稿存储**

使用 `noBackupFilesDir/screen-capture` 写入 `capture.json` 和 `screen.png`；JSON 只含 captureId、来源、页面文本和时间，不把截图路径写进日志。读取前检查 5 分钟 TTL。

- [ ] **Step 4: 实现磁贴和无障碍服务**

磁贴调用服务收集当前窗口；服务先关闭快捷设置，等待付款页重新成为前景应用，再读取文本节点。允许列表为微信 `com.tencent.mm` 和支付宝 `com.eg.android.AlipayGphone`。

- [ ] **Step 5: 实现截图 OCR 兜底**

API 30+ 使用无障碍截图；将 HardwareBuffer 复制为 ARGB_8888 Bitmap，ML Kit 中文识别返回按行文本。截图失败时仍保存无障碍文本。

- [ ] **Step 6: 通过 deep link 打开确认页**

草稿写入后启动 `shengzhang://screen-capture`，React Native 路由读取并消费待处理草稿。

- [ ] **Step 7: 验证模块解析**

Run: `pnpm install --offline && pnpm --filter @shengzhang/mobile typecheck`
Expected: package resolves; Expo Go fallback typechecks.

### Task 4: 设置入口与统一确认页

**Files:**
- Create: `apps/mobile/src/app/screen-capture-settings.tsx`
- Create: `apps/mobile/src/app/screen-capture.tsx`
- Create: `apps/mobile/src/features/screenCapture/useScreenCapture.ts`
- Create: `apps/mobile/src/features/screenCapture/useScreenCapture.test.ts`
- Create: `apps/mobile/src/features/screenCapture/demoCapture.ts`
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: `apps/mobile/src/app/settings.tsx`
- Modify: `apps/mobile/src/theme/tokens.ts` only if a reusable token is missing

**Interfaces:**
- Consumes: native module functions from `@shengzhang/screen-capture`
- Consumes: `extractScreenBill` and `createScreenTransaction`
- Produces: confirmation screen with editable amount/category/time/note and in-place undo state

- [ ] **Step 1: 写无权限、无草稿和解析失败状态测试**

```ts
expect(buildCaptureViewState({ status: unsupportedStatus, pending: null }).kind).toBe('unsupported');
expect(buildCaptureViewState({ status: readyStatus, pending: null }).kind).toBe('empty');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @shengzhang/mobile test -- useScreenCapture`
Expected: FAIL because state builder is missing.

- [ ] **Step 3: 实现设置页**

展示 Android 11+ 支持状态、开启无障碍、添加磁贴、白名单和隐私说明；提供“预览确认卡”入口，使用内置微信支付示例，不访问真实屏幕。

- [ ] **Step 4: 实现确认页**

使用临时截图作为弱化背景；金额复用 `AmountKeypad`，时间复用 `DateTimePickerSheet`，分类使用现有分类目录。展示低置信度提示并允许全部字段编辑。保存后在同一卡片切换为成功 + 8 秒撤销。

- [ ] **Step 5: 接入设置和导航**

设置页新增“付款页快捷记账”；`_layout.tsx` 注册设置页和 `screen-capture` 路由。

- [ ] **Step 6: 运行类型与交互测试**

Run: `pnpm --filter @shengzhang/mobile test -- useScreenCapture && pnpm --filter @shengzhang/mobile typecheck`
Expected: PASS.

### Task 5: 文档、版本与构建验收

**Files:**
- Modify: `docs/01-prd.md`
- Modify: `docs/09-technical-architecture.md`
- Modify: `docs/10-data-model.md`
- Modify: `docs/16-decision-log.md`
- Modify: `docs/18-ui-handoff.md`
- Modify: `docs/README.md`
- Modify: `docs/HANDOFF.md`
- Modify: `README.md`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`

**Interfaces:**
- Produces: version `0.3.0` and documented Android-first scope
- Produces: reproducible release and test notes

- [ ] **Step 1: 更新产品和技术事实源**

PRD 把 Android 快捷付款页识别移入当前能力，明确 iOS 快捷指令兼容；技术架构记录原生模块、权限、临时文件和 `screen` 来源；数据模型记录 migration v3。

- [ ] **Step 2: 更新 UI 交付和决策记录**

记录确认卡字段、状态、隐私文案、低置信度、重复提示和保存后同卡撤销；新增 ADR 说明为什么文本优先、OCR 兜底、为什么不在后台常驻监听。

- [ ] **Step 3: 提升版本**

将 mobile/root 相关版本和 Expo config 提升到 `0.3.0`，保持 runtimeVersion 为 appVersion 策略；在 HANDOFF 写明必须重新构建原生包。

- [ ] **Step 4: 运行全仓验证**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @shengzhang/mobile exec expo export --platform android`
Expected: all pass.

- [ ] **Step 5: 生成或触发 Android 安装包**

使用现有 EAS 配置构建 preview APK；若云端凭据或网络不可用，保留可直接重试的构建命令并在 HANDOFF 记录阻塞原因。

- [ ] **Step 6: 检查最终 diff**

Run: `git diff --check && git status --short --branch`
Expected: no whitespace errors；只包含本功能和既有未提交改动的预期文件。
