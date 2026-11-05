# App 更新与发布

## 1. 当前能力

App `0.1.3` 及更高版本已接入 EAS Update；`0.1.6` 预览版在兼容更新之外增加了原生安装包更新策略：

- `expo-updates` 原生更新客户端
- 启动自动检查
- 回到前台时每 15 分钟最多检查一次
- 下载完成后的应用内提示
- “立即重启”与“稍后”操作
- 设置页手动检查更新
- preview / production 独立更新通道
- `runtimeVersion` 使用 `appVersion`
- 安装包最低支持版本与推荐更新由 `GET /v1/app/update-policy` 下发

Expo Go 会直接加载 Metro，不支持应用内更新；设置页会显示“Expo Go 预览”。

## 2. 更新边界

可以 OTA 更新：

- JS/TS 业务逻辑
- React Native 页面和组件
- 文案、颜色、图标组件和普通图片
- 分类、语音、统计和 Prompt 客户端逻辑
- API 地址以外的纯 JS 配置

必须重新构建安装包：

- 增加或升级原生依赖
- Android/iOS 原生代码和权限
- Bundle ID、包名、签名
- 桌面图标和原生启动配置
- 不支持旧 runtime 的破坏性原生变更

## 3. 用户流程

1. App 启动后并行检查 EAS channel 与服务端安装包策略。
2. 有兼容的 JS/TS 更新时后台自动下载；下载完成后提示立即重启或稍后生效。
3. 当前安装包低于最低支持版本时，显示不可关闭的原生更新门禁，并提供官网 APK 或商店入口。
4. 当前安装包仍受支持、但低于最新稳定版时，显示可稍后处理的安装包更新提示。
5. Android 不允许普通 App 静默安装 APK，因此原生更新仍需要用户下载并确认覆盖安装；本地 SQLite 账本会保留。
6. 检查、下载或策略接口失败时继续使用当前版本，不影响离线记账。

## 4. 首次切换要求

当前用户安装的旧 APK 不包含 `expo-updates`，无法事后补上 OTA 能力。

必须先构建并安装一次 `0.1.3` 或更高版本的新 APK。该版本保留原包名和 EAS Android 签名，可覆盖安装并保留 SQLite 账本。

## 5. 发布 OTA

Preview：

```bash
cd apps/mobile
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=https://bigai.xin \
  npx eas-cli@latest update --channel preview --environment preview \
  --message "修复：更新说明"
```

Production：

```bash
cd apps/mobile
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=https://bigai.xin \
  npx eas-cli@latest update --channel production --environment production \
  --message "版本说明"
```

首次发布前需要登录 EAS，并确认项目 `04dd154b-655a-4b0e-bd3f-f3fafd76ab3d` 已创建对应分支和 channel。
构建 profile 已在 `apps/mobile/eas.json` 提供预览变量。若本机 Node/Expo 环境在 `.env` 解析时报 `parseEnv`，使用 `EXPO_NO_DOTENV=1` 跳过 dotenv，不要把真实密钥写进仓库。

## 6. 原生新版

原生依赖或权限变化时：

1. 修改 `app.json` 的 `version`。
2. 重新构建对应 profile。
3. 为用户提供新 APK、TestFlight 或商店更新。
4. 新 runtime 的 JS 更新需要重新发布到同一 channel。

```bash
cd apps/mobile
npx eas-cli@latest build --platform android --profile preview
```

## 7. 回滚

- JS 紧急回滚：重新发布上一个稳定提交到同一 channel。
- 原生回滚：发布包含修复的新二进制，不依赖 OTA 降级原生代码。
- 安装包最低支持版本由服务端环境变量 `APP_UPDATE_ANDROID_MINIMUM_VERSION` / `APP_UPDATE_IOS_MINIMUM_VERSION` 控制；只有存在有效官方下载地址时才允许强制更新。

## 8. 版本展示与分发策略

- 官网主文案不展示版本号；下载链接使用版本化 OSS 对象和 `?download=latest`，并追加当前发布版本查询参数，由 CDN 分发。
- GitHub Releases 继续使用语义化 Tag，作为版本历史和回滚依据；面向用户的 Release 标题优先描述这次更新，不把版本号当作主标题。
- 纯 JS/TS 更新通过 EAS Update 推送，GitHub Release 只需记录更新内容，不必每次附 APK。
- 原生依赖、权限、桌面图标、原生启动图或 runtimeVersion 变化时，必须构建新 APK，并同步更新官网稳定下载文件与 GitHub Release 附件。
- 发布说明必须写清本版是“仅 OTA”还是“需要重新安装”，避免用户误以为所有 GitHub Release 都有安装包。
- GitHub 网页端上传大于 100 MiB 的安装包可能不稳定；失败时应改用已认证的 GitHub API/CLI 上传，不要把 APK 提交进 Git 历史。

## 9. Android `0.1.3` 预览构建

2026-10-22 已完成 `0.1.3` 的 Android 预览 APK 构建：

| 项目 | 记录 |
| --- | --- |
| EAS Build | `fb5ac32c-d8ca-40a3-bf98-5750b4aec28d` |
| 源码提交 | `65cfb1fa8279d2bf7b22cf43d93e52bf8bb7e520` |
| Profile / Channel | `preview` / `preview` |
| App Version / Version Code | `0.1.3` / `13` |
| Runtime Version | `0.1.3` |
| 包名 | `com.shengzhang.ledger` |
| 构建完成时间 | 2026-10-22 20:27:09（Asia/Shanghai） |
| 构建耗时 | 约 23 分 5 秒 |
| APK 大小 | 109,854,465 字节（约 105 MiB） |
| APK SHA-256 | `89db26c0d314dde5800368c947aa74d501bfa42d329de90f465f5377366dfecf` |

构建页：

```text
https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/fb5ac32c-d8ca-40a3-bf98-5750b4aec28d
```

下载地址：

```text
https://expo.dev/artifacts/eas/sYrly_C992T0uG5i4CZT0BuwLcThK7v-i2g1otTQ_c4.apk
```

发布前验证：

- `pnpm typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm test` 通过，共 53 项。
- Expo Doctor `20/20` 通过。
- APK `unzip -t` 完整性检查通过，无压缩包错误。
- APK 内已确认包含 `0.1.3` 版本标记。

这是首个带 OTA 客户端的 Android 安装包。已安装 `0.1.2` 的用户无法通过 OTA 获得这项原生能力，必须覆盖安装本次 `0.1.3` APK；安装后本地账本会保留。

2026-10-22 21:10（Asia/Shanghai）官网下载入口已由 `0.1.2` 原子替换为 `0.1.3`。服务器文件大小和 SHA-256 与上方构建记录一致；旧包备份在 `/opt/shengzhang/releases/shengzhang-0.1.2-preview.apk`。

2026-10-22 21:29（Asia/Shanghai）已创建 GitHub Pre-release `v0.1.3-preview.1`，上传 APK 附件 `shengzhang-0.1.3-preview.apk`。GitHub API 与公开下载响应均确认附件大小为 109,854,465 字节，状态为 `uploaded`。

## 10. Android `0.1.4` 预览构建

2026-10-23 已完成 `0.1.4` 的 Android 原生预览构建。本版包含原生启动图与 runtimeVersion 更新，不能只靠 `0.1.3` OTA。

| 项目 | 记录 |
| --- | --- |
| EAS Build | `b623433e-835c-4e80-9c51-adcb74bb61a7` |
| 源码提交 | `a04bbb62c294f12ac1ca9b31961a16117a44f45b` |
| Profile / Channel | `preview` / `preview` |
| App Version / Version Code | `0.1.4` / `14` |
| Runtime Version | `0.1.4` |
| 包名 | `com.shengzhang.ledger` |
| 构建完成时间 | 2026-10-23 10:34:04（Asia/Shanghai） |
| APK 大小 | 109,914,393 字节（约 105 MiB） |
| APK SHA-256 | `6f5cd3c9d873b0e70e33070f8b1a9433ed87c5111866e14698a32519be52002b` |

构建页：

```text
https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/b623433e-835c-4e80-9c51-adcb74bb61a7
```

发布状态：

- APK 已下载并通过 `unzip -t` 完整性检查。
- 官网稳定下载文件已原子替换为 `0.1.4`，公网 `Content-Length` 与构建产物一致。
- 官网首页已改为无版本号文案和 `?download=latest` 固定链接。
- GitHub Pre-release `v0.1.4-preview.1` 已发布，包含完整更新说明、EAS 构建页、官网下载入口和 APK 附件。
- GitHub 公开 API 已确认附件 `shengzhang-0.1.4-preview.apk` 状态为 `uploaded`，大小 109,914,393 字节，digest 与本地 SHA-256 一致；公开下载响应 `200` 且 `Content-Length` 相同。

## 11. 正式 HTTPS 域名 OTA

2026-10-29 已将 preview 通道的 API 地址从临时 IP 切换为 `https://bigai.xin`：

| 项目 | 记录 |
| --- | --- |
| Channel / Environment | `preview` / `preview` |
| Runtime Version | `0.1.4` |
| Platform | Android、iOS |
| Update Group | `a2f27f47-d1fb-49ed-8529-cfd26ea0957c` |
| Android Update | `01a18527-f8c0-791a-be2b-dfc7dfaf82e5` |
| iOS Update | `01a18527-f8c0-73eb-9dd6-845222567dd4` |
| 源码提交 | `9c2a8cb` |

本地 Android 与 iOS Hermes bundle 均已确认包含 `https://bigai.xin`，且不再包含 `http://8.152.201.57`。正式域名以 HTTPS 提供 `/v1/` 与 `/health`，`wss://bigai.xin/v1/voice/stream` 握手验证通过。临时 IP 的 `/v1/` 与 `/health` 暂时保留，供尚未收到 OTA 的旧安装兼容。

## 12. Android `0.1.5` 预览候选构建

2026-10-29 已完成 `0.1.5` 的 Android 原生预览候选构建。本版包含完整圆形启动图、首启与冷启动分档、月度摘要卡装饰和分类独立图标，因此不能通过 `0.1.4` OTA 获得；需要安装新的原生 APK。

| 项目 | 记录 |
| --- | --- |
| EAS Build | `250250ce-0722-40a7-af4e-d276ae4b61b9` |
| 源码提交 | `9c39483eca20c68475fd3e0413a841aab711f832` |
| Profile / Channel | `preview` / `preview` |
| App Version / Version Code | `0.1.5` / `15` |
| Runtime Version | `0.1.5` |
| 包名 | `com.shengzhang.ledger` |
| 构建完成时间 | 2026-10-29 10:59:44（Asia/Shanghai） |
| APK 大小 | 109,937,553 字节（约 104.8 MiB） |
| APK SHA-256 | `0be61cd6aa907cac3ea563ae95dd860cfeefcbac0ce6dd88c543d178871f539b` |

构建页：

```text
https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/250250ce-0722-40a7-af4e-d276ae4b61b9
```

候选包下载地址：

```text
https://expo.dev/artifacts/eas/1aU4s3uYxQBdl0a-G2cH09Unpe0YdNFWVOPpa7I3v5A.apk
```

发布前状态：

- `pnpm typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm test` 通过，共 71 项。
- 本地 APK 下载完成，`unzip -t` 完整性检查通过。
- `assets/app.config` 已确认版本为 `0.1.5`，runtime 为 `0.1.5`，包名为 `com.shengzhang.ledger`。
- 当前仅完成候选构建；官网稳定下载文件和 GitHub Release 仍保留 `0.1.4`，待 Android 真机确认首装入场、冷启动策略、分类图标选择器和摘要卡装饰后再替换。

## 13. 双轨更新实现

2026-11-05 已完成双轨更新代码、部署与公网验证：

- EAS Update：兼容 JS/TS 更新继续自动下载，支持“立即重启”和“稍后”。
- 原生安装包策略：服务端按平台和当前版本返回 `none / optional / required`。
- `optional` 显示可关闭的顶部提示；`required` 显示不可关闭的整页更新门禁。
- 下载入口统一使用官网稳定 APK；iOS 未配置官方商店地址时不下发原生更新，避免死锁。
- 更新检查异常不再直接展示底层 Java、网络或 Expo 错误；客户端会提示重试或从官网覆盖安装。
- 首次安装入场动画改为在实际播放完成后才写入“已看过”；首次启动中途退出时，下次仍会播放。
- `GET /v1/app/update-policy` 已部署到 `https://bigai.xin`；`0.1.6` 发布后公网验证 `0.1.4` 返回 `optional`、`0.1.3` 返回 `required`，iOS 在未配置商店地址时返回 `none`。

服务端 Android latest 已切到 `0.2.1`，minimum 保留 `0.1.4`；下载地址使用
`https://download.bigai.xin/releases/shengzhang-0.2.1-preview.apk?download=latest&version=0.2.1`。

## 14. Android `0.1.6` 官网发布

2026-11-05 已将有效 EAS 构建发布到官网稳定下载入口：

| 项目 | 记录 |
| --- | --- |
| EAS Build | `4f19c618-5644-451e-98bf-3abb46897efe` |
| 源码提交 | `bbbb0244a103608164b955c84dec65da285390f8` |
| Profile / Channel | `preview` / `preview` |
| App Version / Version Code | `0.1.6` / `16` |
| Runtime Version | `0.1.6` |
| 包名 | `com.shengzhang.ledger` |
| APK 大小 | 107,798,948 字节 |
| APK SHA-256 | `7289f328eff65b20235328c7b9c69d7016defe6c02096a35bfecb6a4b29c9a93` |

构建页：

```text
https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/4f19c618-5644-451e-98bf-3abb46897efe
```

发布状态：

- 安装包 ZIP 完整性检查通过，1384 个条目可读取。
- `assets/app.config` 已确认版本为 `0.1.6`，runtime 为 `0.1.6`，包名为 `com.shengzhang.ledger`。
- 官网稳定下载文件已原子替换，`0.1.4` 备份在 `/opt/shengzhang/releases/shengzhang-0.1.4-preview.apk`。
- 公网 `Content-Length` 与构建产物一致。
- GitHub Pre-release 和 runtime `0.1.6` 的 preview OTA 尚未发布。

## 15. Android `0.2.0` 原生发布

2026-11-05 已完成 `0.2.0` Android 原生构建，并同步发布到官网、服务端更新策略和 GitHub Pre-release：

| 项目 | 记录 |
| --- | --- |
| EAS Build | `986291b4-9975-40cd-ac7b-da1be3a94f49` |
| 源码提交 | `31c95c57b54ccab29f7ab90762115148dba3b88a` |
| Profile / Channel | `preview` / `preview` |
| App Version / Version Code | `0.2.0` / `17` |
| Runtime Version | `appVersion` → `0.2.0` |
| 包名 | `com.shengzhang.ledger` |
| APK 大小 | 107,955,328 字节 |
| APK SHA-256 | `684e0cf5b56099332664f158aa6752bf766e15571224315855363e93be988321` |

构建页：

```text
https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/986291b4-9975-40cd-ac7b-da1be3a94f49
```

发布状态：

- typecheck、lint 和 130 项自动化测试通过。
- EAS Build 内 Expo Doctor 20/20 通过，Android 原生编译完成。
- APK ZIP 完整性检查通过。
- `assets/app.config` 已确认版本为 `0.2.0`，runtime policy 为 `appVersion`，包名为 `com.shengzhang.ledger`。
- APK DEX 内已确认包含 `ExpoDocumentPicker` 与 `RNViewShot` 原生模块，证明两项新增原生依赖进入安装包。
- 官网稳定 APK 已上传到阿里云 OSS 版本化目录 `releases/`，CDN 响应大小与本地 SHA-256 一致；服务器旧路径和 `0.1.6` 原包只保留作短时兼容。
- API 已切换发布目录 `/opt/shengzhang/releases/20261105-1845`，Android latest 为 `0.2.0`，minimum 保持 `0.1.4`。
- 公网策略验证：`0.2.0 → none`、`0.1.6/0.1.4 → optional`、`0.1.3 → required`。
- CDN APK 返回 `200`，`Content-Type` 为 `application/vnd.android.package-archive`，`Content-Length` 为 107,955,328 字节。
- GitHub Pre-release `v0.2.0-preview.1` 已附带 APK。

本版新增 `expo-document-picker` 与 `react-native-view-shot`，因此必须覆盖安装新的原生包。安装后应继续在 Android/iOS 真机验证 JSON 导出与恢复、CSV 导出、清空本机、文件选择、回顾 PNG 清晰度、系统分享和取消分享。

## 16. Runtime `0.2.0` 启动动画 OTA

2026-11-05 已为 `0.2.0` runtime 发布 preview OTA：

| 项目 | 记录 |
| --- | --- |
| Channel / Environment | `preview` / `preview` |
| Runtime Version | `0.2.0` |
| Platform | Android、iOS |
| Update Group | `da443e24-6536-41fa-8f6c-6027a5a8736d` |
| Android Update | `01a1abef-539a-7a4a-a70b-7b95d851006f` |
| iOS Update | `01a1abef-539a-71f1-b952-55e88b2bcd50` |
| 源码提交 | `12ea82c2c88ac808510e117e3a79c84c04e7d50a` |

本版只改变 JS/React Native 启动体验，不增加原生依赖，因此不需要重新构建 APK：

- 首次安装播放完整 2.72 秒入场。
- App 进程结束后再次启动播放 1.2 秒快速入场。
- 仅从后台恢复不播放动画。
- 完整入场播放结束后才持久化“已看过”；首次中途退出不会误跳过。
- 移除了启动阶段每 50ms 更新一次计时的常驻状态，减少无意义重渲染。

发布前门禁：typecheck、lint、build、`git diff --check`、Android/iOS Expo export 全部通过；domain 34、mobile 56、API 38，共 128 项测试通过。待 Android/iOS 真机验证首次安装、进程冷启动、后台恢复和 OTA 下载重启闭环。

## 17. 下载 CDN 的 HTTPS 正式切换

2026-11-05 已完成 `download.bigai.xin` 的 HTTPS 上线，并把官网与服务端更新策略切换为 CDN 下载地址：

- 使用云盾证书 `cert-95qrl`，没有把私钥保存到仓库、环境变量或普通日志；
- HTTPS、HTTP/2、OCSP Stapling 和 HTTP → HTTPS 跳转均已启用；
- 完整 APK 下载的 SHA-256 为
  `684e0cf5b56099332664f158aa6752bf766e15571224315855363e93be988321`，与本地构建一致；
- Range 请求返回正确字节数，重复请求命中 CDN 缓存；
- 官网、服务端 `.env` 和 `GET /v1/app/update-policy` 均返回 CDN 地址；
- API 已切换到发布目录 `/opt/shengzhang/releases/20261105-2202`；
- 公网回归确认 `0.2.0 → none`、`0.1.6/0.1.4 → optional`、`0.1.3 → required`。

服务器旧 `/downloads/` 路径只作短时兼容，后续可依据旧安装升级率下线。所有公开发行文件必须走版本化对象路径，避免覆盖缓存后的同一 URL。

## 18. Android `0.2.1` 启动体验原生发布

2026-11-05 完成 `0.2.1` Android 原生构建，2026-11-06 完成官网、CDN、服务端更新策略和 GitHub 发布记录同步。本版修改了 Android 原生启动图，因此必须重新构建安装包，不能只靠 `0.2.0` OTA。

| 项目 | 记录 |
| --- | --- |
| EAS Build | `e0c11c47-ae73-46ae-88c8-474168672227` |
| 源码提交 | `e979a05883c10f32db9e16af0f1d7c1712625a96` |
| Profile / Channel | `preview` / `preview` |
| App Version / Version Code | `0.2.1` / `18` |
| Runtime Version | `appVersion` → `0.2.1` |
| 包名 | `com.shengzhang.ledger` |
| 构建完成时间 | 2026-11-05 23:50:51（Asia/Shanghai） |
| APK 大小 | 107,723,132 字节（约 102.73 MiB） |
| APK SHA-256 | `dbbf5f3f8657895ea2fa2ef9c686b959023a0a6bd56ed57056e17dac1b5fe084` |

构建页：

```text
https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/e0c11c47-ae73-46ae-88c8-474168672227
```

发布状态：

- 原生启动图已替换为奶油背景、横向“声账”字标和淡粉色声波；不再出现粉色圆盘、小猪、图标块或菱形缺陷。
- React `BootScreen` 从相同字标展开光晕、品牌主张和本地账本状态；首次安装完整播放约 2.72 秒，后续进程冷启动快速播放约 1.2 秒，从后台恢复不播放。
- 小猪 `BrandMark` 保留在空状态、引导、反馈和分享等品牌场景，但不再进入原生启动图或 React 首帧。
- `pnpm typecheck`、`pnpm lint`、`pnpm test`（domain 34、mobile 58、API 38，共 130 项）和 `git diff --check` 均通过。
- APK `unzip -t`、`aapt2 dump badging` 和包内 `assets/app.config` 检查通过，确认版本 `0.2.1`、versionCode `18`、runtime `0.2.1`、包名 `com.shengzhang.ledger`。
- APK Signature v2 验证通过；签名证书 SHA-256 为 `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955`，与 `0.2.0` 相同，可直接覆盖安装并保留本地账本。
- APK 已上传到阿里云 OSS `shengzhang-releases`，对象为 `releases/shengzhang-0.2.1-preview.apk`，通过 `download.bigai.xin` CDN 分发。
- CDN 完整下载返回 `200`、`application/vnd.android.package-archive`、107,723,132 字节并支持 Range；下载文件 SHA-256 与本地构建逐字节一致。
- 官网 `https://bigai.xin/shengzhang/` 已切换下载链接，主文案不突出展示版本号。
- API 已切换发布目录 `/opt/shengzhang/releases/20261106-000115`，服务以 systemd 自动拉起并保持 `active`。
- 公网更新策略验证：`0.2.1 → none`、`0.2.0 → optional`、`0.1.6 → optional`、`0.1.4 → optional`、`0.1.3 → required`。
- 公网 `/health` 返回 `200` 且 `status=ok`。

安装后仍需在 Android 真机验收原生字标与 React 首帧无跳变、首装/进程冷启动/后台恢复三档策略，以及从官网、CDN 和 GitHub 三处下载同一哈希的 APK 覆盖安装后本地账本是否保留。
