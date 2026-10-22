# App 更新与发布

## 1. 当前能力

App `0.1.3` 已接入 EAS Update：

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
EXPO_PUBLIC_API_BASE_URL=http://8.152.201.57 \
  npx eas-cli@latest update --channel preview --message "修复：更新说明"
```

Production：

```bash
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=https://正式域名 \
  npx eas-cli@latest update --channel production --message "版本说明"
```

首次发布前需要登录 EAS，并确认项目 `04dd154b-655a-4b0e-bd3f-f3fafd76ab3d` 已创建对应分支和 channel。

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
