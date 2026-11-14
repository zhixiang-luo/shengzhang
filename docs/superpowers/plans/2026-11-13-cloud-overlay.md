# Cloud Overlay Implementation Plan

> **For agentic workers:** 按 superpowers:executing-plans 顺序执行；原生子任务与只读平台调研可由互不重叠的 Agent 完成。用户已明确批准实施，不再询问执行方式。

**Goal:** 原页面无障碍浮层云端直接识别，一次确认写入现有账本，并提供系统可绑定的快捷动作。

**Architecture:** Kotlin 无障碍服务承载浮层及原生网络/数据库任务，不依赖主 React 页面存活。React Native 负责首次授权、配置和应用内分享确认，服务端使用独立可配置视觉供应商。

**Tech Stack:** Expo 58、React Native 0.88.1、TypeScript 6、Android API 30+、Kotlin、SQLite v3、Fastify/Zod。

**Spec:** [已批准规格](../../39-cloud-overlay-and-shortcuts.md)。

## Global Constraints

- 不创建或编辑 apps/mobile/android；不申请 SYSTEM_ALERT_WINDOW。
- 金额整数分；原生与 JS 读写同一个 shengzhang.db，schema 版本 3。
- 不改语音主路径，不切官网稳定版，不提交密钥或 APK。
- 浮层原生实现由单独 Agent 独占 packages/screen-capture/android；主 Agent 维护 TS、API 与文档。
- 当前 feature 分支有连续任务未提交修改，保留现场就地执行，不丢弃或移动旧修改。

## Task 1: 云端直接识别及授权配置桥

**Files:** apps/mobile/src/features/screenCapture/useScreenCapture.ts、screenBillDraft.ts 及测试；services/screenBillApi.ts 及测试；packages/screen-capture/src/index.ts。

**Interfaces:** configureScreenOverlay({apiBaseUrl,databasePath,installationId,cloudEnabled})；setScreenFloatingButtonEnabled(boolean)；requestCaptureShortcut()；状态新增 overlaySupported/floatingButtonEnabled/overlayCloudEnabled。

- [x] 增加云端结果不被旧本地阻断、缺金额保持 null 的红测。
  ```ts
  expect(mergeVisionExtraction(blockedLocal, cloudSuccess)).toMatchObject({ amountMinor: 2658, blockingReason: null });
  ```
- [x] 增加云端授权已关闭时不发图片、关闭期间不继续上传、配置桥传真实库路径的行为回归，观察预期失败。
- [x] hook 加载截图时直接 runCloud，不调用 recognizeCaptureImage；构造无金额的初始草稿，关闭/过期取消逻辑沿用。
- [x] 配置桥在 DB 初始化后及授权开关变更时同步；旧版 native 方法缺失返回清晰更新提示，不影响其他页面。
- [x] 针对性测试转绿，检查已有回归仍通过。

## Task 2: 原生浮层与同账本写入

**Files:** packages/screen-capture/android/src/main/java/com/shengzhang/screencapture/ 下新增 OverlayConfiguration、OverlayLedger、OverlayCloudClient、BillOverlayController、CaptureShortcutActivity 与规则测试；修改既有 Service/Module/Manifest/resources。

**Interfaces:** 与 Task 1 的方法/状态完全一致；POST /v1/screen-bill/parse 保持已有共享契约。

- [x] 原生纯业务金额/日期/响应规则先写 JUnit 失败用例，再实现验证。
- [x] 配置仅接受私有数据库路径与 HTTPS API；未授权无上传。
- [x] 原生浮层紧凑布局，字段可编辑；关闭/新任务/服务销毁取消 HTTP，丢弃旧回调。截图前先隐藏浮层，截图后才显示识别中卡。
- [x] 同库 v3、有效分类和事务写入、captureId 幂等；成功即关闭，失败保留。
- [x] 活动窗口只取目标应用，增加有限等待及明确分阶段错误；不因节点正文缺失阻断图片识别。
- [x] 实现标准磁贴、可选可移动边缘按钮、固定 shortcut 与立即结束的独立入口。
- [x] 主 Agent 已复核代码及20项JUnit/API35编译；EAS完整编译FINISHED，设备行为单独记未验证。

## Task 3: 应用内确认与设置

**Files:** apps/mobile/src/app/screen-capture.tsx、screen-capture-settings.tsx；新增配置初始化组件。

- [x] 应用内截图分享继续直走云端，未知金额不可保存。
- [x] 删除快捷页保存后成功/撤销页面，成功直接退出并短提示，保留保存幂等及失败提示。
- [x] 设置说明首用云端、一次授权、无障碍浮层及可绑定入口；提供边缘按钮和固定快捷方式设置。iOS 不展示 Android 原生开关。
- [x] 用实际组件渲染检查默认无滚动、未知金额禁用、只写一笔、修改后保存及失败保留。

## Task 4: 官方千问与平台调研

**Files:** services/api/src/config.ts、providers/screen-vision.ts、相关测试/.env.example；docs/40-shortcut-platform-support.md。

- [x] 查实际官方 API/模型、非思考/JSON 调用方式及密钥可用性，不输出配置秘密。
- [x] 增加供应商请求配置与禁用错误回归；专用 Key，禁止跨供应商复用。
- [x] 无官方凭证：完成适配并明确待服务端配置，未调用官方Plus，不把线上硅基8B称为Plus。
- [x] 只读 Agent 给出官方 Android/Apple/厂商证据；主 Agent 核对并形成入口支持表，未确认机型不承诺。

## Task 5: 验证、构建及交付

- [x] pnpm typecheck、pnpm lint、pnpm test（343）、API build 与 Android/iOS Expo export。
- [x] 独立只读 code review，修复有证据的重要问题；原生20项JUnit/API35编译通过。
- [x] EAS preview 0.3.2(23) FINISHED；ZIP/Manifest/DEX/v2签名及0.2.1/0.3.0/0.3.1同证书连续性检查通过。
- [x] 同步 35/39、PRD、隐私/架构/接口、README/HANDOFF 和41号验证记录；构建/签名结果完成后补全。
- [x] git diff --check、本地链接及本地密钥值检查通过；安装包与平台调研见41/40号，真机待用户安装验收。
