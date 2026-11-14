# 0.3.3 真机反馈修复与验证

2026-11-13，针对用户安装 0.3.2 (23) 后的真实反馈。本文件以本轮证据为准，41 号文档保留上一版构建记录。公开稳定版仍为 0.2.1；先交新 APK 安装验收，不发 OTA 或替换稳定下载。

> 后续结果：本文件的窗口/键盘/磁贴修复已在 0.3.3(36)/(37) 真机完成回归，`Error code 10`、列表刷新和无障碍恢复提示也已闭环。当前事实与上线清单以 [44](./44-quick-accounting-device-verification.md) 为准；本文保留当时的反馈、诊断和修复过程。

## 用户反馈及验收目标

- 微信付款详情页无法触发：区分窗口来源、控制中心、系统安全截图、上传和模型阶段。
- 支付宝弹卡但经常缺金额：检查图片与结构化结果，不能仅以换模型或换提示词作结。
- 编辑金额或内容：点一次字段后立即聚焦并请求原生键盘；分类和日期直接进入选择器。
- 删除边缘按钮及“添加快捷动作”设置，不留下旧偏好控制的边缘窗口。仅保留简短机型手势提示。
- 磁贴添加有系统确认后打勾，移除后恢复；未知状态不能伪装已添加。
- 原页面确认卡继续一次“确定收好了”写账、提示并关闭，不新增第二次确认或快捷撤销。

## 已找到的代码问题

1. 原生窗口判断优先使用任何非空 root；控制中心事件会覆盖之前付款页的单一来源记录。微信 root 不可用时可能丢失来源，底层 root 仍为付款页时也可能没收起控制中心。不能据此认定某次用户失败一定是截图安全限制。
2. `requestQuickSettingsTile` 仅返回布尔值，未保存添加确认，也未实现 TileService 添加/移除生命周期状态，因此设置页不会自动完成第二步。
3. 输入框在更新浮层焦点 flags 后立即 `post(showSoftInput)`，没有等待窗口获得焦点；真机反馈已证明该实现不足。
4. 服务端把模型选中的金额证据再交给旧本地 OCR 打分器。`-26.58` amountText、无货币符号的大号 `26.58` 及“实际付款”分行样式会被清空；带正号的收入还缺乏与收支类型的冲突检查。新增测试先出现 6 个行为失败。
5. 真实调用同款 8B 的虚构布局评测发现，模型会把自己引用的“交易关闭”分类为 success。只看分类枚举会允许手工补金额绕过，需按明确失败原文强阻断。

## 截图限制调研

**可确认事实**：Android 的 `FLAG_SECURE` 可禁止窗口截图；API 34 的无障碍截图错误 `ERROR_TAKE_SCREENSHOT_SECURE_WINDOW` 为 6。无障碍不能保证截取安全内容，也不应绕过。

- [Android 安全窗口](https://developer.android.google.cn/security/fraud-prevention/activities?hl=en#flag_secure)
- [AccessibilityService 截图 API 与安全错误](https://developer.android.google.cn/reference/android/accessibilityservice/AccessibilityService?hl=en#ERROR_TAKE_SCREENSHOT_SECURE_WINDOW)
- [API 34 按窗口截图](https://developer.android.google.cn/reference/android/accessibilityservice/AccessibilityService?hl=en)：`takeScreenshotOfWindow` 可避免无障碍浮层遮住目标窗口，不能绕过安全限制。

**微信相关证据及限制**：[荣耀俱乐部《优化手机微信支付体验》](https://club.honor.com/cn/thread-29769701-1-1.html)中，2025-10-23 一位 Magic6 Pro 用户反馈微信支付完成后不能截屏，2025-10-24 标注为“MagicOS 产品经理”的账号回复该支付界面由 App 设为安全界面。它证明部分机型/页面确有此情况，不能外推为所有微信账单详情都禁止截图，也不是用户当前手机的复现证据。[微博客服的账单截图指引](https://kefu.weibo.com/faqdetail?id=21415)包含微信钱包账单详情截图，但文章针对 Apple IAP，不能证明本次 Android 页面可截。

**本轮判断**：安全限制和我们的窗口缺陷都可能存在。新代码应给出对应阶段的固定错误提示；安全限制时建议尝试钱包的单笔账单详情或手动记账。仍需用户手机型号、系统/微信版本及新版错误码，才能确定其具体情况。

## 实现约束与验证口径

- Android 11+；API 34+ 优先对已确认的付款窗口截图，仍检查活动系统面板及来源稳定性。旧系统使用显示截图，确认控制中心收起；不读取节点正文。
- 添加状态结合 `onTileAdded/onTileRemoved/onStartListening/onClick` 和 API 33 系统添加结果保存；取消添加不代表移除。首次旧安装未知状态需系统回调确认，不读取隐藏 QS 设置。官方依据：[磁贴生命周期](https://developer.android.google.cn/develop/ui/views/quicksettings-tiles?hl=en)。
- 输入法在 View 已附着、输入焦点与窗口焦点都就绪后请求；编辑结束/关闭取消待执行请求。官方依据：[键盘显示时序](https://developer.android.google.cn/develop/ui/views/touch-and-input/keyboard-input/visibility?hl=en)。
- 金额仍只来自云端读图。确定性检查只核对模型所报数字、符号、证据和交易状态；不先 OCR，也不从服务端已拒绝的证据在客户端恢复金额。
- `VisionBill.amountIssue` 为可选 `not_read/unverified/null`，便于区分模型未读出与校验未通过；它不允许客户端绕过校验。服务端仅向请求头 `X-Screen-Bill-Diagnostics: 1` 返回该字段，旧客户端不声明时保持原 strict 响应；新客户端仍兼容旧响应。
- 原生只存固定阶段/错误码、来源种类及尺寸/字节等诊断，不保存截图、金额、商户、正文、证据、身份或库路径。设置页只在上次出错时显示说明，不增加日常流程步骤。
- 合成布局/自动测试、API 编译、RNWeb 组件检查、EAS APK 构建和真实支付页面验收分别记录；任何一种都不能代替其他。

## 本轮执行记录

- 金额校验首轮回归：6 项预期失败后通过。新增同一模型响应中的扁平证据与错误状态回归：2 项预期失败后通过。
- 详细评测固定输入与原始输出仅包含程序生成的虚构账单，位于 `services/api/testdata/screen-bill/layouts-033/`；不接收用户截图。最终测试、构建与待设备验收结果随本轮交付补充。

### 源码与组件检查

- 最终全仓 `pnpm test`：394 项通过（domain 137、mobile 112、API 145）；`pnpm lint`、`pnpm typecheck`、API build 通过。
- 原生规则：51 项 JUnit 通过；Android API35 编译通过。编译检查排除 Expo Module/ML Kit 两类，完整原生编译由后续 EAS APK 构建确认；兼容 API 有弃用警告。
- Android、iOS 分别 Expo export 通过。`--platform all` 首次包含非目标 Web 平台，因未安装 react-native-web 失败；改为实际双端导出，未为检查增加生产依赖。
- RNWeb harness 编译实际设置组件，仅原生/DB/router 边界使用虚构状态。390×844 已添加状态、320×568 未完成状态无横向溢出；点击添加更新为勾选，模拟系统移除并发送 Android focus 后恢复。边缘按钮和添加快捷动作入口均不存在。画面位于 `design/exports/quick-accounting-033/`。这不证明 Android 系统回调或原生键盘真机通过。
- 独立最终审查无未解决 P1/P2；其复核了金额符号/状态/外币、旧 strict 响应协商、来源 revision、遮挡映射与异步任务绑定。复核范围不含真实支付页面准确率。
- 对此前六张虚构布局的同一模型原始响应重放最终 validator，6/6 金额或空值吻合，失败交易阻断。原在线调用耗时约 6.69–11.68 秒；部分模型 ISO 时间与原文不一致，仍保持未知并回退采集时刻，未宣称时间精度解决。重放记录 `design/exports/quick-accounting-033/layout-replay.json`，不能当生产准确率。

### 测试服务与构建

0.3.3 原生/runtime 需要新 APK，EAS preview build `84a7566b-b38f-463f-a473-debfc776386c` 已于 2026-11-13 18:41:46（Asia/Shanghai）FINISHED，versionCode 24、runtime 0.3.3。完整 Gradle 已覆盖 Expo Module/ML Kit；上传指纹的 TLS 警告没有阻止构建。没有 OTA、稳定 APK 替换或 Git commit/push。

- [下载 0.3.3(24) 测试 APK](https://expo.dev/artifacts/eas/2EAlVQ2hsuIF_D0upXIIYr-f8goRxd6-AiKUgsgQ7U8.apk)；[EAS 构建页](https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/84a7566b-b38f-463f-a473-debfc776386c)。
- 本机：`dist/releases/shengzhang-0.3.3-preview.apk`，155,819,440 字节（约148.60 MiB）。本机直连下载慢，服务器仅临时下载后SCP传回；两端SHA256相同，官网文件未改。
- SHA256：`f519ea3f1ed50bd6aa23ac1ebc4bbefa23a8022ec4b4db1f701be0c24b07465c`。
- ZIP完整、包 `com.shengzhang.ledger`、version/runtime0.3.3、code24、minSdk30/targetSdk36；分享/磁贴/原生确认卡、同库写入、磁贴状态及固定错误诊断标记通过。
- APK v2验签通过；证书SHA256 `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955`，与0.2.1、0.3.0、0.3.1、0.3.2一致，可覆盖安装。无SYSTEM_ALERT_WINDOW、READ_MEDIA_IMAGES或READ_MEDIA_VISUAL_USER_SELECTED；仍有Expo继承的旧外部存储声明，截图分享不请求这些权限。
- 包级结果见 `design/exports/quick-accounting-033/apk-validation.json` 和 `eas-build.json`；没有连接设备，不能当手机安装、微信或IME通过。

API 先从现有 release 复制隔离副本 `/opt/shengzhang/releases/20261113-quick-accounting-033`，仅原子替换 screen-vision、screen-vision-amount、screen-bill route 编译产物与 screen-bill 契约。硬链接旧文件未被原地写入，原 release 哈希复核不变；localhost:8791 健康及两张虚构图真实模型 smoke 通过（无单位顶部金额、失败强阻断与旧strict响应兼容，分别约3.714/6.538秒），记录见 `design/exports/quick-accounting-033/api-stage-smoke.json`。隔离进程已停止。自动审批拒绝线上切换：开发/构建授权不包含手机安装验收前切换共享生产API；命令未执行，current仍为031-time旧目录，未重启线上服务。新金额校验待用户明确批准启用后才对APK生效。模型仍为硅基 `Qwen/Qwen3-VL-8B-Instruct`，未切官方千问或更大模型。

### 待用户手机验收

1. 覆盖安装后打开一次声账，确认无障碍服务与云端开关就绪；原有账本记录仍在。
2. 支付宝单笔详情点磁贴：控制中心收起、原页面出现卡、金额可读；金额/内容一次点开即弹原生键盘，分类和日期直接选择。
3. 微信分别尝试付款完成页与钱包单笔账单详情；若失败，查看设置中的固定错误码。安全页面不能截图时应明确提示，不能声称绕过。
4. 系统添加/移除磁贴后返回设置检查第二步；未知状态须等系统确认，不假勾。旧边缘开关即使曾开启也不再显示窗口。
5. 改完只点一次“确定收好了”，卡收起，回到账本已有同笔记录；无第二次确认或快捷撤销。取消、切页、锁屏或关闭云端不应留下可保存旧卡。
