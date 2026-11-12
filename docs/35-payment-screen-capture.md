# 付款页快捷记账规格

## 1. 状态与结论

- 状态：`0.3.0` Android 首版已实现，待原生 APK 真机验收
- 平台：Android 11（API 30）及以上
- 触发方式：控制中心快捷设置磁贴“声账记账”
- 主路径：用户主动点击磁贴后，读取当前微信/支付宝付款结果页，生成可编辑确认卡
- iOS：系统不允许普通 App 静默读取其他 App 的屏幕，后续通过“用户运行快捷指令截屏 → App Intent/确认卡”兼容

iOS 与 Android 不承诺相同的静默读屏体验。Android 首版也不会后台持续监听、自动判断付款完成或在用户未触发时读取窗口。

## 2. 用户流程

```text
微信/支付宝付款成功页
  -> 下拉控制中心
  -> 点击“声账记账”
  -> 收起控制中心并等待付款页回到前台
  -> 读取白名单应用的无障碍文本
  -> 文本已有可信实付金额：直接进入确认页
  -> 文本不足：临时截图 + 本机中文 OCR
  -> 用户修改金额/收支/分类/时间/商户
  -> 点击“记好这笔”
  -> 本地 SQLite 写入一笔 screen 来源账单
  -> 同一张卡展示“已记好”和 8 秒撤销
```

保存后不弹第二个确认框。撤销直接软删除本次 `captureId` 对应的账单，并返回账本。

## 3. 首次启用

1. 安装包含 `@shengzhang/screen-capture` 原生模块的 APK；Expo Go 只能预览界面，不能读取其他 App。
2. 打开“设置 → 付款页快捷记账”。
3. 点击“开启声账快捷记账”，在系统无障碍设置中启用服务。
4. 下拉控制中心，点击编辑并添加“声账记账”磁贴；Android 13+ 可在设置页尝试自动添加。
5. 回到微信/支付宝付款结果页，点击磁贴。

服务开启后仍只在磁贴被点击时读取当前窗口。应用不会注册支付通知监听、不会读取剪贴板、不会调用支付平台接口。

## 4. 支持边界

首版支持：

- 微信支付和支付宝常见付款成功/付款详情页；
- 单笔支出；
- 固定金额、页面时间、收款方/商户和备注提取；
- 支出/收入切换；
- 一级/二级分类选择与新建；
- 月历时间选择和金额计算键盘；
- 低置信度人工修正；
- 保存后原地撤销；
- 同一 `captureId` 幂等写入。

首版不支持：

- 后台自动记账；
- 多笔订单拆分、退款、转账、分账；
- 银行账单批量导入；
- 所有支付 App、所有 WebView 页面或所有系统版本；
- 未确认直接写入账本；
- 原始截图上传云端；
- iOS 静默读屏。

无障碍节点缺失、支付页使用自绘/WebView、系统限制截图或 OCR 失败时，确认页保持可编辑，并提示用户手动补充金额。

## 5. 确认卡

标题固定为“识别到一笔账单”。字段包括：

| 字段 | 默认值 | 修改方式 |
| --- | --- | --- |
| 金额 | 最可信实付候选，整数分 | 复用 `AmountKeypad`，支持四则运算 |
| 收支 | 支出 | Segmented Control |
| 分类 | 关键词保守推荐，无法判断落“其他” | 一级分类横向选择、二级分类 Chips、新建分类 Sheet |
| 时间 | 页面文本优先，否则设备当前时间 | 复用 `DateTimePickerSheet` |
| 商户/内容 | 收款方、商户、付款给、商品名 | 单行输入，最多 40 字 |

状态：

```text
loading
  -> ready_editing
  -> saving
  -> saved_with_undo
  -> undone / auto_return

loading
  -> unsupported / setup_required / empty

ready_editing
  -> ocr_running
  -> ready_editing
  -> parse_low_confidence
```

识别置信度：

- `high`：有支付成功/实付语义且只有一个可信金额；
- `medium`：有金额但存在多个候选或支付语义不完整；
- `low`：没有可信金额，必须人工补充。

低置信度不会阻止用户确认；金额无效、分类无效或数据库写入失败才会阻止保存。

## 6. 页面文本识别规则

纯解析位于 `packages/domain/src/screen-bill.ts`：

- 全角数字、全角标点规范化为半角；
- 支持 `¥/￥/元`、千分位和两位小数；
- 输出整数分，不持久化浮点金额；
- “实付/实际支付/支付金额/付款金额/交易金额/消费金额”优先；
- “原价/优惠/余额/订单号/手机号/卡号/尾号”不作为实付金额；
- 提取“今天/昨天/前天 + 时间”、绝对日期和支付时间；
- 提取“收款方/商户/付款给/商品名称/付款说明”；
- 文本不足时由端侧 OCR 补充，再把两条文本去重合并后重跑同一解析器。

Android 原生层先做一次轻量判断：无障碍文本已出现可信实付金额时，不再截图，直接交给 React Native 解析。只有文本不足且 API 30+ 允许截图时才走 OCR。

## 7. 原生模块

路径：`packages/screen-capture`

| 文件/能力 | 作用 |
| --- | --- |
| `BillCaptureTileService.kt` | 控制中心磁贴；无服务时打开设置页 |
| `BillCaptureAccessibilityService.kt` | 用户触发后读取当前窗口和白名单文本 |
| `PaymentPageTextHeuristics.kt` | 判断无障碍文本是否已有可信实付金额，避免多余截图 |
| `ScreenOcrProcessor.kt` | ML Kit 中文端侧 OCR |
| `PendingCaptureStore.kt` | 应用私有目录中的短期草稿和截图 |
| `ScreenCaptureModule.kt` | Expo Modules API：状态、设置、磁贴、OCR、清理 |

白名单：

```text
com.tencent.mm
com.eg.android.AlipayGphone
```

跨进程草稿写入 `noBackupFilesDir/screen-capture/capture.json`，截图写入同一私有目录。草稿最长保留 5 分钟；读取、确认、取消、保存或服务再次启动时删除。新抓取会先移除上一份草稿及截图，过期或损坏的 JSON 与没有 JSON 的孤儿截图也会按文件时间清理，避免连续触发后残留旧画面。

控制中心收起采用保守策略：只有当前活动窗口仍属于 System UI 时才发送返回键；随后在约 1.8 秒内轮询微信/支付宝是否回到前台。超时仍未命中白名单时只提示用户，不读取其他应用正文，也不生成空账单草稿。

TypeScript 接口位于 `packages/screen-capture/src/index.ts`。在 Expo Go/Web 中 `supported=false`，不会抛未捕获异常。

## 8. 数据写入

`TransactionSource` 扩展为：

```ts
type TransactionSource = 'voice' | 'manual' | 'screen';
```

SQLite migration v3 重建 `transactions` 表，把 `source` CHECK 扩展为三者兼容，并保留原数据、外键和索引。

屏幕识别写入规则：

- `captureId` 直接作为账单 `id`；
- 同一 `captureId` 重复提交只返回已有 ID，不新增第二笔；
- `source='screen'`；
- `amount_minor > 0` 且为安全整数；
- 备注自动 trim；
- 与语音/手动账单共用分类有效性和 `backup_state=pending` 逻辑；
- 原始文本、截图路径和 OCR 正文不进入账单、JSON 备份或 CSV。

CSV 的来源列显示“屏幕识别”。JSON 备份可往返 `screen` 来源，旧版备份仍可导入。

## 9. 隐私与安全

- 只读取白名单中的微信、支付宝；
- 只在用户点击磁贴后读取；
- 不读取订单号、余额、手机号、银行卡尾号等字段作为账单内容；
- 不把截图写入相册；
- 不上传原始截图或 OCR 全文；
- 不把金额、商户、OCR 正文写入日志；
- 不后台持续监听，不监听支付通知，不读取剪贴板；
- 草稿使用应用私有目录并最长保留 5 分钟；
- 用户确认前不落账；
- 保存后立即清理草稿和截图，撤销只操作已写入账单。

Android 无障碍权限会让系统提示该服务“可以查看屏幕内容”。产品内必须说明触发边界、白名单和临时数据策略，不能把它描述为“无需权限的后台识别”。

## 10. 失败处理

| 状态 | 用户看到的处理 |
| --- | --- |
| 非 Android 11+ / Expo Go | 说明需要新版 Android APK；提供界面预览 |
| 无障碍未开启 | 引导到系统设置开启服务 |
| 没有待处理草稿 | 引导使用磁贴或打开示例 |
| 非微信/支付宝页面 | 有限等待后提示“没有识别到微信或支付宝付款页”，不读取其他应用正文，也不生成空草稿 |
| 截图失败 | 保留无障碍文本，允许手动补金额 |
| OCR 失败/空文字 | 保留可编辑确认卡，提示重试或手填 |
| 低置信度 | 黄色提示“请顺手核对” |
| 保存失败 | 保持确认卡，账本不变，可重试 |
| 草稿过期 | 原生层清理，返回重新触发 |

## 11. 代码位置

```text
apps/mobile/src/app/screen-capture-settings.tsx
apps/mobile/src/app/screen-capture.tsx
apps/mobile/src/features/screenCapture/
apps/mobile/src/db/screenTransaction.ts
packages/domain/src/screen-bill.ts
packages/screen-capture/
```

设置入口位于 `apps/mobile/src/app/settings.tsx` 的“效率 → 付款页快捷记账”。演示路由为 `/screen-capture?demo=1`，只预览交互，不写入账本。

## 12. 验证与发布

必须通过：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @shengzhang/mobile exec expo export --platform android
git diff --check
```

由于新增 AccessibilityService、TileService、ML Kit 和 Android `minSdkVersion=30`，必须重新执行 EAS Android 原生构建；不能通过 Expo Go 或同 runtime OTA 获得真实读屏能力。API 30 由 `expo-build-properties` 注入；可用 `expo config --type introspect` 检查 `gradleProperties` 中是否存在 `android.minSdkVersion=30`。

真机验收至少覆盖：

1. 开启无障碍和添加磁贴；
2. 微信付款成功页读取金额、时间、商户；
3. 支付宝付款成功页读取；
4. 文本足够时不截图；
5. 文本不足时 OCR 兜底；
6. 修改金额/类型/一级/二级分类/时间/备注后保存；
7. 同一草稿重复确认只入账一次；
8. 保存后同卡撤销；
9. 取消、保存或超时后私有草稿被清理；
10. 旧 SQLite 账本升级到 v3 后仍完整。
