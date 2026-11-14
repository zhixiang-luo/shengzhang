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
3. 当前安装包低于最低支持版本时，显示不可关闭的版本更新弹窗，并列出服务端下发的更新要点。
4. 当前安装包仍受支持、但低于最新稳定版时，显示可稍后处理的版本更新弹窗；点“下载并退出”会打开官网安装包，并在 Android 上关闭应用。
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

发布时仍必须显式传入生产 API；移动端的兜底默认值同样是 `https://bigai.xin`，禁止把 `127.0.0.1` 或开发机局域网 IP 作为发布包默认值。

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

官网直接分发 APK 时使用 `production-apk` profile，它保持 production 更新通道并输出 APK：

```bash
cd apps/mobile
npx eas-cli@latest build --platform android --profile production-apk --local \
  --non-interactive --output build-production.apk
```

Google Play 或需要 AAB 的分发仍使用 `production` profile。

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

2026-11-05 完成 `0.2.1` Android 原生构建，2026-11-06 完成官网、CDN、服务端更新策略、GitHub Pre-release 和 preview OTA。本版修改了 Android 原生启动图，因此必须重新构建安装包，不能只靠 `0.2.0` OTA。

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
- GitHub Pre-release `v0.2.1-preview.1` 已发布并附带同名 APK，公开 API 返回附件状态 `uploaded`、大小 107,723,132 字节。

安装后仍需在 Android 真机验收原生字标与 React 首帧无跳变、首装/进程冷启动/后台恢复三档策略，以及从官网、CDN 和 GitHub 三处下载同一哈希的 APK 覆盖安装后本地账本是否保留。

## 19. Runtime `0.2.1` Preview OTA

2026-11-06 已为 `0.2.1` runtime 发布 preview OTA：

| 项目 | 记录 |
| --- | --- |
| Channel / Environment | `preview` / `preview` |
| Runtime Version | `0.2.1` |
| Platform | Android、iOS |
| Update Group | `5ee8d355-e8a9-465e-bd52-3e1b6d3c3edb` |
| Android Update | `01a1ac78-a9ed-7882-b262-fc1b0995adfb` |
| iOS Update | `01a1ac78-a9ed-7263-9dde-2a7c67132e87` |
| 源码提交 | `9bb75e98ab449fdfcef1dbf3158955247fd77916` |
| EAS Dashboard | `https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/updates/5ee8d355-e8a9-465e-bd52-3e1b6d3c3edb` |

本次第一次上传在 Expo 资产存储建立 TLS 连接时中断，Bundle 已成功生成；复用同一 `apps/mobile/dist` 产物并通过 `--skip-bundler` 重试后上传完成，没有重新打包或改变提交。

OTA 只负责后续兼容的 JS/TS 更新与在线更新清单。原生启动图已经固化在 APK 内，因此新用户或旧版用户仍需先覆盖安装 `0.2.1 (18)` APK，之后才能接收 runtime `0.2.1` 的后续 OTA。

## 20. Runtime `0.2.1` 匿名反馈 OTA

2026-11-07 已为现有 `0.2.1 (18)` 安装发布仅 OTA 的匿名反馈更新。本版没有新增原生依赖、权限、图标或 runtime 变化，因此不需要重新下载 APK；设置页会新增“帮助与反馈 → 改进与反馈”。

| 项目 | 记录 |
| --- | --- |
| Channel / Environment | `preview` / `preview` |
| Runtime Version | `0.2.1` |
| Platform | Android、iOS |
| Update Group | `64610999-a11e-4684-8147-3d62561286d7` |
| Android Update | `01a1b64f-b332-7e7a-aac9-13843c7ce961` |
| iOS Update | `01a1b64f-b332-7424-8f34-2166216d1df3` |
| Source Base Commit | `6c0b223c`（发布时工作区变更尚未提交） |
| EAS Dashboard | `https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/updates/64610999-a11e-4684-8147-3d62561286d7` |

该 OTA 已由 21 节的修复版取代。上一版发布时使用的工作区默认 API 回退值只适合本地开发；用户测得语音或反馈请求可能无法连接正式服务。

公网验收覆盖匿名提交、同 ID 幂等重试、非法内容、16 KiB 请求上限、安装 ID 哈希、日志隐私和日报计数。测试反馈在验证后从私有收件箱删除，没有保留用户内容。

官网下载区已同步说明本版能力；GitHub `v0.2.1-preview.1` 发布说明也已更新，并明确“已安装 `0.2.1 (18)` 的设备不需要重新下载 APK”。APK 文件、Tag 和附件均保持不变。

## 21. Runtime `0.2.1` 反馈提交修复 OTA

2026-11-07 发布反馈修复版，现有 `0.2.1 (18)` 安装可直接通过 OTA 更新，不需要重装 APK。

| 项目 | 记录 |
| --- | --- |
| Channel / Environment | `preview` / `preview` |
| Runtime Version | `0.2.1` |
| Platform | Android、iOS |
| Update Group | `810cd59c-0666-4c9e-b4e7-c5d4402b230a` |
| Android Update | `01a1b65e-cc48-75e7-8652-1d0b97002255` |
| iOS Update | `01a1b65e-cc48-741f-b8d8-93d1b6f1c870` |
| 源码提交 | `5130e2f62d9795a6d2bd845f914f2c652e0d8d0d` |
| EAS Dashboard | `https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/updates/810cd59c-0666-4c9e-b4e7-c5d4402b230a` |

本版修复：

- 生产 Bundle 在未注入环境变量时也默认连接 `https://bigai.xin`，不再包含 loopback 或开发机局域网 API 地址。
- “功能建议”等反馈在网络失败时显示可重试的人话提示，服务端结构化错误仍然保留。
- 详细描述示例改为“语音说‘昨天午饭 25’，但账单日期显示成了今天”，并提示用户说明实际发生什么、原本期望怎样。
- 为“昨天午饭 25”增加服务端日期锚定和移动端时间戳保留回归测试。

同一版本发布前门禁为 typecheck、lint、API build、Android/iOS Expo export 和 `git diff --check` 全部通过；domain 34、mobile 68、API 60，共 162 项测试通过。Android/iOS 发布 Bundle 均已确认只包含正式 API 域名 `https://bigai.xin`。

## 22. Android `0.3.0` 付款页快捷记账内测构建

2026-11-12 完成 `0.3.0` Android 原生内测构建。本版新增 Quick Settings Tile、AccessibilityService、ML Kit 中文 OCR、SQLite migration v3 和新的 `minSdkVersion=30`，因此不能通过 Expo Go 或 `0.2.1` 的同 runtime OTA 获得，Android 11+ 测试机必须安装新的 APK。

| 项目 | 记录 |
| --- | --- |
| EAS Build | `231be593-8f86-498f-b950-dd3753bcdb60` |
| Profile / Channel | `preview` / `preview` |
| 源码提交 | `45f7bfb44e18c7ce75781f78fdb21344e3490bc0` |
| App Version / Version Code | `0.3.0` / `19` |
| Runtime Version | `0.3.0` |
| APK 大小 | 155,748,548 字节 |
| APK SHA-256 | `f08d85b016aae9397de44ccea9a64dbe6ee970de8ac40c216b1fbb273134967a` |
| 签名证书 SHA-256 | `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955` |
| EAS Dashboard | `https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/231be593-8f86-498f-b950-dd3753bcdb60` |

本地 APK 位于 `dist/releases/shengzhang-0.3.0-preview.apk`，不提交 Git。包名 `com.shengzhang.ledger`、版本 `0.3.0 (19)`、`minSdkVersion=30`、`targetSdkVersion=36`、ZIP 完整性、Signature v2 和签名证书连续性均检查通过。Manifest 已包含 `BillCaptureTileService`、`BillCaptureAccessibilityService` 和对应绑定权限，DEX 已确认包含自研屏幕采集模块与 ML Kit 中文 OCR 依赖。

当前只完成构建与包级校验，尚未完成 Android 真机验收。官网、OSS/CDN、服务端更新策略和 GitHub Pre-release 仍以 `0.2.1` 为公开稳定版本。真机通过前不把该 APK 替换为公开下载，也不宣称付款页快捷记账已经发布。APK 声明了 `android.permission.SYSTEM_ALERT_WINDOW`，产品没有常驻悬浮窗，正式发布前需查来源并移除不必要权限。

### 22.1 Runtime `0.3.0` 隐私文案修正 OTA

首版 APK 构建后发现付款页设置中的隐私文案过度承诺“完全不读取订单号和余额”。原生层会在点击磁贴后遍历目标付款页的无障碍节点并临时收集整页文字，因此页面文字中可能包含这些字段；解析器不会把它们写入账单、备份或日志，原始文字和截图最长保留 5 分钟。源码与 UI 文案已改为准确表述，并通过 preview OTA 只更新 Android JS，不需要重新下载 APK。

| 项目 | 记录 |
| --- | --- |
| Channel / Environment | `preview` / `preview` |
| Runtime Version | `0.3.0` |
| Platform | Android |
| Update Group | `7dbde641-2a72-4dc1-98f0-62cdfc12d3ed` |
| Android Update | `01a1d044-bee2-7011-ab1f-34c71343e68a` |
| 源码提交 | `cdffc69b1d02face73e89a3aeebd83f5ac09dc70` |
| EAS Dashboard | `https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/updates/7dbde641-2a72-4dc1-98f0-62cdfc12d3ed` |

安装 `0.3.0 (19)` APK 并联网启动后，现有 `expo-updates` 检查会下载并应用该 OTA。APK 内嵌版本仍保留构建时文案，离线首启在看到 OTA 前可能暂时显示旧文案；这不影响屏幕识别、确认和写入逻辑。该 OTA 不改变公开稳定下载，也不替代 Android 真机验收。

## 23. Android 0.3.1 快捷记账重做内测

0.3.1 包含单张截图分享 Activity、图片导出、采集生命周期和权限变更，runtime 为 0.3.1，必须安装新 APK；没有发布旧 runtime OTA。EAS `dc219c41-7eb5-4359-83f3-b80b492c7d3d` 已成功构建 0.3.1(22)，profile/channel=preview；基线 HEAD 219ae1d，加本轮未提交实现快照。完整验证、下载、签名与哈希统一见 [38 号记录](./38-quick-accounting-validation.md)。

最终 APK 已完整下载并通过 ZIP、Manifest、DEX 和 Signature v2 校验，155,764,580 字节；证书与 0.2.1/0.3.0 一致，支持覆盖安装。Manifest 不含悬浮窗权限，分享 Activity 接收单张 image/*；这些是包级证据，实际安装与账本完整性仍由设备验收确认。用户已明确先在自己的手机测试，通过后再上线。

0.3.1(20) 首次因 Kotlin Coroutine 泛型声明失败；修正后启动的 (21) 因随后独立审查修复而取消；仅 (22) 为最终候选。未将失败/取消包交付，也不把JS导出当原生构建。

服务端已先隔离验证，再切换到 `/opt/shengzhang/releases/20261113-quick-accounting-031-time`，前版 `20261113-quick-accounting-031`、原版 `20261107-215526` 保留。新目录 .env 仅包含视觉开关、模型和额度；共享服务端密钥未改。健康200，公网合成图金额2658分与页面时间通过，响应no-store；最初一次时间安全降级仍保留在评测记录。手机端默认关闭，用户单独授权后才发送当前图。

回滚 API 可把 current 原子切回前版并让 systemd 重启；只需停用视觉时修改当前发布目录 SCREEN_VISION_ENABLED=false 再重启，语音/本地账本继续可用。计数为单进程内存，重启清零；推广前需预算告警与持久化额度。

公开稳定下载、CDN、GitHub Pre-release 和 Android 更新策略继续为0.2.1，未切换。新内测包需 Android 11+ 设备验收后再决定发布。


## 24. Android 0.3.2 云端原页面浮层内测

用户批准TYPE_ACCESSIBILITY_OVERLAY原页面卡、云端直接截图识别和一次确认入账；移除快捷记账保存后八秒撤销/二次“收好”，语音不改。新增原生网络/同库写入及系统动作，runtime=0.3.2，不能旧包OTA获得。EAS preview 0.3.2(23)已FINISHED：54e6df65-1b99-4b3d-be1e-1f8348c3ba7c；155,821,768字节，ZIP/Manifest/DEX/v2签名及与0.2.1/0.3.0/0.3.1证书连续性通过。最终包级结果见 [41](./41-cloud-overlay-validation.md)。

官网/CDN/稳定策略仍0.2.1，未发OTA或公开发布。官方千问适配与专用Key隔离完成，但尚无官方凭证；线上视觉 API 后续于 2026-11-14 切到 DeepSeek Flash，见第 25 节。先用户安装测试，真机通过后再上线。


## 0.3.3 真机反馈修复测试包（2026-11-13）

0.3.3(24) 为独立测试 APK/runtime，修正窗口来源、原生编辑键盘焦点、磁贴状态及设置入口；需要覆盖安装，不发旧runtime OTA。EAS完整构建与APK版本、权限、签名连续性均通过，证据及下载见 [42号记录](./42-quick-accounting-device-feedback.md)。官网/CDN/稳定更新策略仍0.2.1，没有Git commit/push。

金额证据校验和 DeepSeek Flash 已随 `20261114-deepseek-flash` 发布到生产；合成图在预发布和公网均通过。手机调试包不需要重新安装即可调用新模型，但微信/支付宝真实付款页验收仍需用户执行。窗口/键盘/磁贴/设置修正可先测，用户手机通过后再决定稳定 APK/OTA/官网发布。

## 25. 视觉 API 切换 DeepSeek Flash（2026-11-14）

生产视觉识别已从硅基 `Qwen/Qwen3-VL-8B-Instruct` 切到 `deepseek-flash`，基址 `https://api.deepseek.com`，当前发布目录 `/opt/shengzhang/releases/20261114-deepseek-flash`。这是服务端配置与适配器变更，不涉及 APK/runtime，不需要 OTA。

同日后续 `current` 已切到 `/opt/shengzhang/releases/20261114-wechat-overflow-fix`，修复超长商品说明导致的 503；模型仍为 `deepseek-flash`。当前线上目录以 [HANDOFF](./HANDOFF.md) 为准。

- 12 张合成账单金额/拒识：DeepSeek Flash 12/12，平均约 1.06 秒；千问 3.8 27B 12/12，平均约 2.81 秒。只覆盖金额和拒识，不代表真实页面全字段准确率。
- 预发布 localhost 完整路由：HTTP 200、2658 分、页面时间正确、`no-store`，1191ms。
- 公网生产完整路由：HTTP 200、2658 分、页面时间正确、`no-store`，1030ms。
- 预发布首次失败已修复：旧 contracts 缺少 `amountIssue`，同步 `packages/contracts/src/screen-bill.ts` 后 Zod 校验通过。
- 回滚：将 `/opt/shengzhang/current` 切回 `/opt/shengzhang/releases/20261113-quick-accounting-031-time`，重启 `shengzhang-api` 即可。

验收证据见 [deepseek-flash-production-smoke.json](../design/exports/quick-accounting-033/deepseek-flash-production-smoke.json)。

### 25.1 正式渠道候选包 0.3.3 (25)（未发布）

2026-11-14 已生成可直接安装的正式渠道候选 APK，尚未替换官网、CDN、OTA 或公开更新策略。

- EAS Build：`9af3b571-661f-412b-a0b5-7b49b1fc3927`；包 `com.shengzhang.ledger`，版本 `0.3.3`，versionCode `25`，runtime `0.3.3`。
- 下载地址：`https://expo.dev/artifacts/eas/VXOEDhqRnXTXFIrI4v3COTpYFFJfBeG3ZnISJqi0j3M.apk`；本机副本 `dist/releases/shengzhang-0.3.3-25-release.apk`。
- 大小 155,835,824 字节；SHA-256 `b9b7e71ffd208e08b6c65fa8bb8d571aaa50a148ca7f95bb44be0700a59ed29d`。
- APK ZIP 完整性、包名、版本、Bundle 内 `https://bigai.xin`、v2 签名、证书连续性均通过；签名证书 SHA-256 为 `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955`，可覆盖旧正式包。
- Manifest 无 `SYSTEM_ALERT_WINDOW`，未标记 debuggable；仍保留 Expo 继承的 Android 12 及以下旧外部存储权限声明，截图分享流程不请求相册权限。
- 生成该包前已将本机 `apps/mobile/android` 调试工程移出构建输入；否则 EAS 会误用 `com.shengzhang.ledger.debug` 和 debug versionCode。`.easignore` 已加入 `apps/mobile/android/`、`apps/mobile/ios/`。
- 手机侧调试包已卸载，开发者选项/USB 调试已关闭；候选包等待用户下载安装和微信/支付宝真机验收。未通过前不上线。

## 26. 0.3.3(36)/(37) 真机闭环内测构建（2026-11-14）

这两个包用于修复真机反馈的 `Error code 10: disk I/O error`、保存后列表不刷新和无障碍被系统关闭后的恢复提示，均为 **preview 本地构建**，没有替换 production 渠道、官网下载或公开更新策略。

| 项目 | 0.3.3 (36) | 0.3.3 (37) |
| --- | --- | --- |
| 构建时间 | 2026-11-14 18:49 CST | 2026-11-14 19:25 CST |
| 本机文件 | `apps/mobile/build-1794653390614.apk` | `apps/mobile/build-1794655330782.apk` |
| 大小 | 155,841,260 B | 155,848,796 B |
| SHA-256 | `81dc40dde99b2b07d9967a7aef1ec82dee641e9bedaf4928f862b215347f83f1` | `7b3045c101dd967c41d63e3f940a8e9e7318f34bd66b96a73ddb085e730cfb07` |
| Embedded update | `d4474ed4-621e-482f-9de2-6761ca4436d0` | `1a8c1619-d4b2-4d55-a1f7-f5e42130272b` |
| 签名证书 SHA-256 | `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955` | 同左 |

36 修复：账本统一 rollback journal（`journal_mode=DELETE`），原生不再请求 `ENABLE_WRITE_AHEAD_LOGGING`；短连接读取串行化、设置 `busy_timeout=5000` 与 `query_only=ON`；关闭连接失败不覆盖已成功读取，`Error code 10` 等待 150ms 重试一次；原生保存事件与 AppState/focus 共同触发列表刷新，下拉刷新显示刷新态。

37 增加：首页低调提示“快捷记账被系统关闭了 / 重新开启”，仅在安装曾开启过、当前被系统关闭且用户未忽略时出现；点击跳转系统无障碍设置，返回后自动消失；`×` 持久忽略，重新开启后再次关闭会重新提醒。

真机（Redmi K60 / HyperOS）：同一微信付款详情页连续 3 次快捷键均 `save result=ok` 并生成 3 笔；随后语音 2 笔正常入账；首页 ¥8→¥61 自动刷新，搜索页 9 笔立即可见；冷启动仍为 ¥61，无 `expo-sqlite` 警告或 `Error code 10`；`NoUpdatesAvailable` 确认运行内嵌新 bundle。完整证据和上线清单见 [44号记录](./44-quick-accounting-device-verification.md)。

仍待办：删除服务器测试额度覆盖（200/天、60/分钟）、部署友好 429 文案、生成 production 包、确认 runtime 0.3.3 OTA 优先级、切换官网与 GitHub Release。两个 APK 已加入 `.gitignore`，不进入 Git 仓库。

## 27. 安装包更新弹窗与更新说明（2026-11-14）

纯 JS/TS 的兼容更新继续走 EAS OTA：后台下载，只显示轻量“新版本已准备好”提示，不打断记账。

需要覆盖安装的 Android 安装包更新改为真正的弹窗：

- 标题显示目标版本，正文说明更新性质。
- 展示服务端 `releaseNotes` 下发的主要变化，最多 6 条。
- 明确提示“需要覆盖安装，本机账本会保留”。
- 可选更新提供“稍后”；强制更新不能关闭，只能下载或重新检查。
- 点“下载并退出”会先打开官网安装包地址，再在 Android 上退出应用；系统仍负责最终下载和覆盖安装确认。
- 同一会话内“稍后”会按目标版本忽略；设置页仍可通过“安装包更新”重新打开弹窗。
- 原生更新弹窗优先于 OTA 轻提示，避免安装包更新被小横幅遮住。

`GET /v1/app/update-policy` 新增：

```json
{
  "releaseNotes": ["微信、支付宝付款详情页可用快捷记账"],
  "requiresReinstall": true
}
```

更新说明通过服务端环境变量维护，使用 JSON 字符串数组：

```bash
APP_UPDATE_ANDROID_LATEST_VERSION=0.3.3
APP_UPDATE_ANDROID_MINIMUM_VERSION=0.1.4
APP_UPDATE_ANDROID_DOWNLOAD_URL="https://download.bigai.xin/releases/shengzhang-0.3.3-preview.apk?download=latest&version=0.3.3"
APP_UPDATE_ANDROID_RELEASE_NOTES='["微信、支付宝付款详情页可用快捷记账","控制中心磁贴或系统快捷动作可直接触发","在原页面核对金额、时间与分类，一次确认入账","同一付款页可以连续记多笔","保存后账单自动刷新，语音记账可继续使用","修复快捷记账被系统关闭后的恢复提示"]'
```

客户端对新字段做了兼容：服务端尚未返回 `releaseNotes` / `requiresReinstall` 时，分别按空数组和“需要覆盖安装”处理，不会让旧策略接口导致检查更新失败。

### 27.1 已安装 `0.2.1` 用户的覆盖范围

公开稳定版 `0.2.1 (18)` 的 `UpdateProvider` 与仓库 Tag `v0.2.1-preview.1` 完全一致，当前只显示旧版小横幅，不展示更新要点。新弹窗代码进入 `0.3.3` 后，只有在用户完成一次覆盖安装后才会生效。

若要让现有 `0.2.1` 用户立即看到新弹窗，必须另发一次 runtime `0.2.1` 的 preview OTA，仅更新更新提示组件与契约字段；不能把 `0.3.3` 的 bundle 发到旧 runtime。EAS 已确认 preview 分支存在 runtime `0.2.1` 历史组 `810cd59c-0666-4c9e-b4e7-c5d4402b230a`，具备该补丁通道。该 OTA 尚未发布。

## 28. Android `0.3.3 (41)` 正式发布（2026-11-14）

0.3.3(41) 已从内测包切换为公开 Android 正式版。本版包含微信/支付宝付款详情页快捷记账、控制中心无耳圆脸小猪磁贴、同一页面连续记账、保存后账单刷新、语音接续和无障碍被系统关闭后的恢复提示。

| 项目 | 值 |
| --- | --- |
| App Version / Version Code | `0.3.3` / `41` |
| Runtime Version | `0.3.3` |
| Channel | `production` |
| 包名 | `com.shengzhang.ledger` |
| 文件大小 | 155,851,496 字节 |
| SHA-256 | `4c84fd68003048b12c634a43f8b47eec13dc0087c76c4ab8db320657eb495c3b` |
| 签名证书 SHA-256 | `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955` |
| Embedded update | `77cf919e-d0cf-4e46-805b-378b0b5dc3e3` |
| 正式下载 | `https://bigai.xin/shengzhang/downloads/shengzhang-0.3.3-preview.apk?download=latest&version=0.3.3` |
| GitHub Release | `https://github.com/zhixiang-luo/shengzhang/releases/tag/v0.3.3` |

服务端 `APP_UPDATE_ANDROID_LATEST_VERSION=0.3.3`，minimum 保持 `0.1.4`，`releaseNotes` 为 6 条，`requiresReinstall=true`。公网验收：

- `0.2.1 → optional`；
- `0.3.3 → none`；
- `0.1.3 → required`；
- 所有返回的 `downloadUrl` 均指向上述正式直连地址。

GitHub `v0.3.3` Release 已发布并标记为 Latest，不是 Pre-release，附件名为 `shengzhang-0.3.3.apk`。GitHub API 返回 `size=155851496`、`digest=sha256:4c84fd68003048b12c634a43f8b47eec13dc0087c76c4ab8db320657eb495c3b`，与本地正式包和官网直连包一致；Release 下载地址最终返回 `HTTP 200`、`content-length=155851496`。

`SCREEN_VISION_DAILY_LIMIT=200` 与 `SCREEN_VISION_IP_MINUTE_LIMIT=60` 两行测试覆盖已从 `/opt/shengzhang/shared/.env` 删除，API 新进程环境已确认不再包含这两项，恢复默认 `20/天、10/分钟`。

本轮没有发布 0.3.3 OTA。runtime `0.2.1` 的更新提示 OTA 已于此前发布（update group `6b933730-412d-4e9a-9c99-4760c3fdd30d`，Android update ID `01a1da1f-7c46-7747-af2a-267cd9768f54`），老用户会看到 0.3.3 的覆盖安装弹窗。

`download.bigai.xin` 仍是 OSS + CDN 上的 0.2.1 旧包；本轮本机和服务器均没有 OSS 凭据，因此正式下载改用 `bigai.xin` 服务器直连。恢复 OSS 凭据后，把同一 APK 上传为 `releases/shengzhang-0.3.3-preview.apk`，再把官网和服务端 URL 切回 CDN。
