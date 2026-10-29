# App 更新与发布

## 1. 当前能力

App `0.1.4` 已接入 EAS Update：

- `expo-updates` 原生更新客户端
- 启动自动检查
- 回到前台时每 15 分钟最多检查一次
- 下载完成后的应用内提示
- “立即重启”与“稍后”操作
- 设置页手动检查更新
- preview / production 独立更新通道
- `runtimeVersion` 使用 `appVersion`

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

1. App 启动后检查当前 channel 是否有兼容更新。
2. 有更新时后台下载。
3. 下载完成后显示“新版本已准备好”。
4. 用户可立即重启，或稍后继续使用。
5. 已下载更新最迟在下次冷启动时生效。
6. 检查或下载失败时继续使用当前版本，不影响本地账本。

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
- `minimumVersion` API 强制升级将在公网 API 域名确定后接入。

## 8. 版本展示与分发策略

- 官网主文案与下载链接不展示版本号，固定使用 `/downloads/shengzhang-android-preview.apk?download=latest`。
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
