# 当前交接

> 2026-11-14 晚。`main` 当前为 `f5ee0cd`，官网、更新策略和正式 APK 已切到 `0.3.3 (41)`；公网接口验证 `0.2.1 → optional`、`0.3.3 → none`、`0.1.3 → required`。旧 `0.2.1` 用户会看到覆盖安装弹窗，账本保留。CDN 仍是旧包，正式包暂走 `bigai.xin` 直连。

## 当前状态

快捷记账主链路已闭环：微信付款详情页连续 3 次快捷键各生成一笔，随后语音 2 笔正常入账；首页 ¥8→¥61 自动刷新，搜索页 9 笔立即可见，冷启动仍为 ¥61，日志无 `Error code 10`。根因是 framework SQLite 与 expo-sqlite 共用 WAL，关闭短连接时触发 `SQLITE_IOERR`；现统一 rollback journal、串行化读取，并让关闭失败不覆盖已成功结果。详见 [44](./44-quick-accounting-device-verification.md)。

设备当前安装 0.3.3(41)，无障碍服务已开启并连接。HyperOS 在强行停止或覆盖安装后会清掉无障碍开关；App 无法静默恢复，首页提示会引导用户重新开启，可忽略。从多任务划掉或系统回收不会清掉开关。

M5/M6 内测与 0.3.3 真机反馈修复。用户确认云端直识别、无障碍原页面浮层、一次“确定收好了”写现有本地账本；本轮按 0.3.2(23) 实际反馈修微信来源、金额校验、键盘、磁贴勾选并删除多余入口。语音、本地账本、统计、分类、备份导出、搜索、回顾及反馈延续既有行为。

当前事实入口：[35规格](./35-payment-screen-capture.md)、[39决策](./39-cloud-overlay-and-shortcuts.md)、[40平台调研](./40-shortcut-platform-support.md)、[42反馈记录](./42-quick-accounting-device-feedback.md)、[44真机闭环与上线清单](./44-quick-accounting-device-verification.md)。0.3.2 构建保留 [41](./41-cloud-overlay-validation.md)，0.3.1 保留 [38](./38-quick-accounting-validation.md)，发布历史见 [30](./30-app-updates.md)。

## 本轮改动

- 磁贴主动先收起控制中心；来源按 windowId/包名/revision 追踪，缺正文不跳过截图。SystemUI、IME、自身浮层短暂遮挡保留同 ID 映射；真正移除/换 App 清除。同包同窗口的新页面状态也取消旧卡，延迟检查绑定具体 task 和完整来源，旧检查不影响新任务。
- API34+ 对已确认窗口截图，API30–33 使用显示截图；安全窗口不能绕过。固定阶段错误码帮助区分窗口、截图、网络、模型未读金额与核验失败，不记录图片/正文/金额/商户/库路径。
- 编辑金额/内容等待 View attach、input focus 和 window focus 后自动请求原生键盘；退出编辑或关闭取消待执行请求。分类/日期直接选择，编辑页适配 IME 高度并把完成按钮置于滚动区外。默认主卡仍无滚动。
- 删除边缘窗口及升级前 true 偏好，兼容 setter 恒 false；设置删除“添加快捷动作”按钮，仅保留无障碍/磁贴两步、云开关及简短厂商手势提示。
- TileService 添加/移除/listening/click 与 API33 添加结果保存 true/false/unknown，取消添加不等于移除。设置在 AppState active、Android focus 及添加结束时刷新，只有明确 true 才打勾。
- 云端金额不再运行旧 OCR 候选评分；保留无符号顶部小数、负号支出/正号收入及分行金额。明确状态标签只承认成功，失败/待付/退款/转账/外币证据不能被 success/CNY 枚举覆盖。金额未知仍 null，不恢复服务端拒绝证据。
- 新可选 amountIssue 通过 X-Screen-Bill-Diagnostics:1 协商；默认旧 strict 响应不加字段，新 JS/native 仍能读旧响应。
- 延续原页面 TYPE_ACCESSIBILITY_OVERLAY、同 SQLite v3 事务/幂等/backup pending、关闭取消与五分钟失效、手动编辑保护、一次保存后收起，无 SYSTEM_ALERT_WINDOW、无快捷撤销。语音撤销未改。
- 本轮修复 `Error code 10`：账本统一 `journal_mode=DELETE`，原生不再请求 WAL；短连接读取串行化并设置 `busy_timeout=5000`、`query_only=ON`；关闭失败不覆盖已成功读取，IO 错误等待 150ms 重试一次。
- 首页新增“快捷记账被系统关闭了 / 重新开启”提示，仅在曾开启、当前关闭且未忽略时出现；点击跳系统无障碍设置，返回自动消失，`×` 持久忽略，重新开启后再次关闭会重新提醒。

## 验证与 APK

Node22.19.0：410 项全仓测试通过（domain137/mobile122/API151），lint/typecheck/API build、Android+iOS 单独 Expo export 通过；原生51JUnit和API35编译通过（排除Expo Module/MLKit两类）。独立审查无未解决P1/P2。实际设置组件在RNWeb390×844/320×568检查了添加打勾、模拟移除恢复、无横向溢出及入口删除；不是真机系统回调证据。六张程序生成虚构布局的模型原始JSON重放，金额/空值6/6符合，部分时间证据仍无法通过，标默认采集时间；不能当生产准确率。

0.3.3(36)/(37) 均为 EAS preview 本地构建，使用线上发布证书，签名 SHA-256 `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955`。36 大小155,841,260字节，SHA256 `81dc40dde99b2b07d9967a7aef1ec82dee641e9bedaf4928f862b215347f83f1`，embedded update `d4474ed4-621e-482f-9de2-6761ca4436d0`；37 大小155,848,796字节，SHA256 `7b3045c101dd967c41d63e3f940a8e9e7318f34bd66b96a73ddb085e730cfb07`，embedded update `1a8c1619-d4b2-4d55-a1f7-f5e42130272b`。两包均通过完整 Gradle `assembleRelease`、`apksigner verify --print-certs`；真机日志确认 `NoUpdatesAvailable`，未被旧 preview OTA 覆盖。APK 不进入 Git，记录见 [44](./44-quick-accounting-device-verification.md)。

## 服务端与发布边界

线上当前为 `/opt/shengzhang/releases/20261114-wechat-overflow-fix`，模型为 `deepseek-flash`，基址 `https://api.deepseek.com`；图片按既有供应商条款处理，不能宣传全链路零留存。前版 `/opt/shengzhang/releases/20261114-deepseek-flash` 和 `/opt/shengzhang/releases/20261113-quick-accounting-031-time` 保留用于回滚。

2026-11-14 真实微信账单触发的 503 已修复：模型把超长商品说明写入 `item`，超过 40 字后被 Zod 拒绝，路由再统一映射为“云端识别暂不可用”。现在超长 `item` 安全置空、超长商户名截断到 40 字，金额证据、状态、币种、时间及未知字段仍严格校验；路由只记录脱敏后的 Zod 字段路径和稳定 provider 错误码。公网同一真实截图复测 HTTP 200、93.60 元、`item=null`、`amountIssue=null`、`no-store`，约 1.7 秒。证据见 [wechat-overflow-api-smoke.json](../design/exports/quick-accounting-033/wechat-overflow-api-smoke.json)。

四文件窄补丁已在隔离 `/opt/shengzhang/releases/20261113-quick-accounting-033` 准备：screen-vision.js、screen-vision-amount.js、screen-bill route.js、contracts/src/screen-bill.ts。旧release通过硬链接复制后原子替换各文件，确认旧哈希未改变。localhost8791健康及两张虚构图真实模型smoke通过：无单位金额正确、失败交易强阻断、旧strict格式兼容；隔离进程已停止，结果见 design/exports/quick-accounting-033/api-stage-smoke.json。

**线上切换已执行**：2026-11-14 已在预发布目录补齐 `packages/contracts/src/screen-bill.ts` 的 `amountIssue`，localhost 完整路由和公网 `https://bigai.xin/v1/screen-bill/parse` 均用合成图通过：HTTP 200、2658 分、页面时间正确、`amountIssue=null`、`Cache-Control: no-store`，约 1.0–1.2 秒。`shengzhang-api` 重启后 active，生产 current 已指向新 release；回滚只需把 current 切回前版并重启。证据见 [deepseek-flash-production-smoke.json](../design/exports/quick-accounting-033/deepseek-flash-production-smoke.json)。

代码、官网和文档已整理，等待最终提交与推送。官网/CDN/稳定更新策略仍为 0.2.1，无 OTA 或新公开 APK；完成 [44 号上线清单](./44-quick-accounting-device-verification.md) 后再切换公开发布。

## 下一步

1. 删除服务器 `/opt/shengzhang/shared/.env` 中 `TEST ONLY` 的额度覆盖，恢复 `20/天、10/分钟`，重启 `shengzhang-api` 并确认进程环境。
2. 部署包含“可直接填写金额和分类后保存”的友好 429 文案，跑 API 测试与公网 smoke。
3. 用本轮代码生成 production 渠道安装包，核对 versionCode、证书连续性、Manifest、Bundle 和 embedded update。
4. 确认 runtime `0.3.3` 的 preview/production OTA 不会用旧 JS 覆盖新包；如发布 OTA，先验证内嵌包与 OTA 组优先级。
5. 覆盖安装 production 包，再回归微信/支付宝、磁贴/系统动作、连续多笔、语音接续、刷新、冷启动和无障碍关闭提示。
6. 切换官网下载、CDN、服务端更新策略和 GitHub Release；公开文案不展示内部 versionCode、测试额度、内网 IP 或构建路径。

真机失败时记录型号、系统/微信/支付宝版本、页面类型和固定阶段错误码；不要把单次失败扩展成所有详情页均不可用。iOS App Intent、银行安全页和其他视觉模型实测仍待单独推进。
4. 手机通过后才决定公开发布；此前官网、CDN、稳定更新策略和公开 APK 仍保持 0.2.1。

候选包记录与下载链接见 [30 号发布记录](./30-app-updates.md) 的 `25.1`；机器校验见 `design/exports/quick-accounting-033/eas-build-release-25.json`。

## 2026-11-14 快捷记账“点收好不入账 / 列表不刷新”修复

- 现场实测 0.3.3(33)：点“确定收好了”后卡片关闭，但既没有 `save` 原生日志，数据库也没有新行，冷启动仍是旧条数。最符合现有代码的路径是窗口变化检测（含浮层自身、SystemUI、IME 的空包名 `TYPE_WINDOWS_CHANGED`）在保存前静默 `cancelCurrent()`；该路径不弹 toast，所以用户只看到卡片消失。
- 原生加固：用户点“确定收好了”即视为确认，保存不再依赖后续窗口状态；`saving` 期间窗口事件不得取消任务；display fallback 分支忽略自身包、SystemUI、IME 与空包名的窗口变化。新增仅含结构信息的常驻日志 `ShengzhangCapture: save requested / save result=ok|error / cancelled reason=...`，不含金额、商户、正文或截图。
- 刷新加固：原生写入走 Android framework SQLite，`SQLiteProvider` 的长连接会持续返回旧快照（同进程、同文件，冷启动后才更新）。`PRAGMA wal_checkpoint` 与空写事务都不能可靠解除，现改为每次刷新用 `openDatabaseAsync('shengzhang.db', { useNewConnection: true })` 新建短连接读取后关闭；首页、搜索、月回顾统一走该路径。
- 2026-11-14 18:30 现场回归发现 `Error code 10: disk I/O error`：日志为 expo-sqlite 在关闭短连接/终结语句时触发 `SQLITE_IOERR`；现场还出现热刷新停留在旧列表、刚保存的快捷记账未出现在首页。当前判断根因是 framework SQLite 与 expo-sqlite 两套实现对同一账本使用 WAL，cross-build checkpoint 不稳定；这是高度可疑根因，需新包真机闭环确认。修复为账本统一使用 rollback journal（`journal_mode=DELETE`，原生不再请求 `ENABLE_WRITE_AHEAD_LOGGING`），新连接读取串行化、设置 `busy_timeout=5000`、失败重试一次，且关闭失败不能覆盖已成功读取的结果。该修复需要新的原生包，不能只靠 OTA。
- 2026-11-14 18:55–18:57 真机闭环（0.3.3(36)，EAS preview 本地包 `apps/mobile/build-1794653390614.apk`，embedded update `d4474ed4-621e-482f-9de2-6761ca4436d0`，签名 SHA-256 与 35 一致）：同一微信付款详情页连续 3 次快捷键各生成 1 笔（`save result=ok` ×3，generation 2/5/8），随后语音记 2 笔（打车 ¥18、午饭 ¥25）也同时入账；首页 ¥8→¥61 自动刷新，搜索页 9 笔立即可见，全程无需重启；日志无 `expo-sqlite` 警告、无 `Error code 10`。冷启动后仍为 ¥61，`onBackgroundUpdateFinished: No update available`，确认运行内嵌新 bundle 而非旧 preview OTA。
- 覆盖安装后 HyperOS 会关闭无障碍服务，本次已用 ADB 重新开启 `com.shengzhang.ledger/com.shengzhang.screencapture.BillCaptureAccessibilityService`；正式升级流程需保留“升级后检查并引导重新开启”的提示，否则用户会误判为快捷键失效。
- 2026-11-14 19:25 真机闭环 0.3.3(37)（`apps/mobile/build-1794655330782.apk`，embedded update `1a8c1619-d4b2-4d55-a1f7-f5e42130272b`）：首页在摘要卡片下方增加低调提示“快捷记账被系统关闭了 / 重新开启”，仅在安装曾观察到无障碍已开启、之后被系统关闭且用户未忽略时出现；点击跳转系统无障碍设置，返回后自动消失；右侧 `×` 会持久忽略，重新开启过服务后再次关闭会重新提醒。首次开启、被强制停止后提示、点击跳转、返回自动隐藏、忽略后不再出现均已实测。状态存放在 `app_settings` 的 `quick_capture_ever_enabled` / `quick_capture_reminder_dismissed`，新用户不会看到与自己无关的提示。
- 真机闭环（Redmi K60 / HyperOS）：17:49 保存 ¥2 后冷启动 12→13 笔；17:53 保存 ¥3 首页 ¥24→¥29；17:58 同一会话再保存 ¥1 首页 ¥30→¥31，均无需重启。原生日志与 JS 刷新均命中。
- 已知边界：服务端有识别额度（`SCREEN_VISION_DAILY_LIMIT` 默认 20 次/安装/天，`SCREEN_VISION_GLOBAL_DAILY_LIMIT` 默认 500 次/天）。2026-11-14 现场测试期间在 `/opt/shengzhang/shared/.env` 临时覆盖为 200 次/天、60 次/分钟，并在文件内标注 TEST ONLY；上线前必须删除这两行覆盖值并重启 `shengzhang-api`，release 自带配置会恢复为 20/10。额度用尽时提示“云端识别暂时受限，可直接填写金额和分类后保存，稍后再试”，仍可手动保存。
