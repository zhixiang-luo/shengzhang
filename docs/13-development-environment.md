# 声账开发环境

## 1. 当前机器状态

检查时间：2026-11-14。

| 项目 | 当前状态 | 结论 |
| --- | --- | --- |
| macOS | 14.5，Apple Silicon | 可开发；Android 构建已在本机完成 |
| 磁盘可用空间 | 约 61 GB | 可继续构建；安装完整 Xcode 仍偏紧 |
| Node.js | nvm 22.19.0；默认 shell 的 `node` 可能是 20.x | 项目要求 `>=22`，命令前先 `nvm use 22` |
| pnpm | 11.25.0 | 满足要求 |
| Homebrew | 已安装 | 可用于安装后续工具 |
| Xcode | 只有 Command Line Tools | 不能本地构建或运行 iOS 模拟器 |
| Java/JDK | Homebrew OpenJDK 17/27 已安装，默认 PATH 未指向 | 需要显式设置 `JAVA_HOME` |
| Android SDK | `$(brew --prefix)/share/android-commandlinetools`，含 platform 35/36/37、build-tools 与 platform-tools | 可执行 `adb` 和完整 Gradle 构建 |
| Android Studio | 未安装 | 不影响 EAS 本地构建；需要模拟器时再装 |
| CocoaPods | 未安装 | iOS 原生构建前需要安装 |
| GitHub CLI | 已安装 | 可用于 PR、Issue 和 Release 操作 |

当前已验证 `pnpm typecheck`、`pnpm test`、Expo Doctor、iOS/Android JavaScript bundle 导出、Android 完整 Gradle 构建、APK 签名校验和 ADB 真机安装。iOS 原生编译、模拟器和微信 SDK 联调仍需安装完整 Xcode；Android 模拟器需要 Android Studio 或独立 emulator 镜像。

## 2. 推荐安装顺序

### 2.1 Node.js 22 LTS

当前已通过 nvm 安装 Node 22.19.0，无需重复安装。默认 shell 可能仍指向 20.x，先切换再验证：

```bash
nvm use 22
node --version
pnpm --version
pnpm install
```

如果换机器或 Node 主版本低于 22，再使用 nvm 或 Homebrew 安装 Node 22 LTS。

### 2.2 Xcode

从 Mac App Store 安装 **Xcode**，不要只安装 Command Line Tools。

安装后执行：

```bash
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

然后在 Xcode 的 Settings → Platforms 中安装目标 iOS Simulator。

注意：

- macOS 14.5 可能无法安装最新版 Xcode。先在 App Store 查看兼容性；若不兼容，需要先升级 macOS。
- 完整 Xcode 通常占用 20–40 GB，当前约 61 GB 可用空间安装后可能偏紧；建议至少保留 15 GB 余量。
- 仅做 Expo Go 界面预览时可以先不安装 Xcode；真机测试、微信 SDK 和商店构建必须安装。

### 2.3 Android Studio、JDK 与模拟器

只做 EAS 本地构建、ADB 真机安装和日志调试时，可以不安装 Android Studio。Homebrew 方案：

```bash
brew install --cask android-commandlinetools
brew install openjdk@17

export ANDROID_HOME="$(brew --prefix)/share/android-commandlinetools"
export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

adb version
java -version
sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"
```

需要 Android 模拟器或图形化 SDK 管理时，再安装 Android Studio，并使用其自带 JDK：

```bash
brew install --cask android-studio
```

首次打开后安装：

- Android SDK Platform（选择与 Expo SDK 58 兼容的最新稳定版）
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator
- 一个 Pixel 模拟器镜像

验证：

```bash
adb --version
java -version
```

如果 `adb` 不在 PATH，将以下目录加入 shell 配置：

```bash
export ANDROID_HOME="$(brew --prefix)/share/android-commandlinetools"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

不要在项目中写入个人绝对路径。

### 2.4 可选工具

```bash
brew install watchman gh
brew install --cask expo-orbit
```

- Watchman：文件监听更稳定。
- GitHub CLI：后续创建远程仓库、PR 和 Actions 检查。
- Expo Orbit：可选，用于安装和启动 Expo 构建。

如果暂时不使用 Hermes 原生构建，可以不单独安装 CocoaPods；Expo 预构建会自动提示。

## 3. 手机与账号准备

### 3.1 开发测试

- 一台 iPhone 和一台 Android 真机，安装 Expo Go，用于早期真机预览。
- 微信 SDK、正式微信登录和自定义原生模块需要 Expo development build，Expo Go 无法验证。
- 测试微信登录时，测试手机必须安装微信，并使用开放平台登记的测试账号。

### 3.2 外部账号

这些不是立即开发本地账本的阻塞项，但必须在发布前准备：

| 账号/材料 | 用途 | 备注 |
| --- | --- | --- |
| Apple Developer Program | TestFlight、App Store、推送与签名 | 个人或公司主体，年费以 Apple 当前价格为准 |
| 微信开放平台移动应用 | 微信一键登录 | 需应用审核与认证，AppID/AppSecret 只放服务端 |
| Android 各商店开发者账号 | 国内安卓分发 | 各商店资质不同，通常需要软著、备案和隐私材料 |
| 域名与 ICP 备案 | API、隐私政策 | 中国内地服务器必须完成备案 |
| 隐私政策与服务条款 | 双端商店审核 | 必须描述录音、转写、备份和删除方式 |
| 软件著作权 | 部分安卓商店 | 建议尽早申请 |
| 商标检索/注册 | 品牌保护 | “声账”需在上线前复核 |

不要购买来源不明的“代办账号”或共享证书。签名密钥应由项目所有者保管。

## 4. 项目初始化

在 `声账/` 根目录：

```bash
node --version
pnpm --version
pnpm install
pnpm typecheck
pnpm test
```

启动移动端：

```bash
pnpm dev:mobile
```

启动 API：

```bash
pnpm dev:api
```

当前 API 使用 mock 语音提供者，不需要真实模型密钥。

## 5. 环境变量

复制模板：

```bash
cp .env.example .env
```

本地默认值足以运行 mock 服务。真实值只放 `.env` 或部署平台密钥管理，不提交 Git。

| 变量 | 用途 | 何时需要 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 连接 | 接入登录和备份时 |
| `JWT_SECRET` | 访问令牌签名 | 接入登录时 |
| `WECHAT_APP_ID` | 微信移动应用 ID | 微信登录 |
| `WECHAT_APP_SECRET` | 微信密钥 | 仅服务端 |
| `VOICE_PROVIDER` | `mock` 或真实供应商 | 接入 ASR 时 |
| `ALIYUN_ACCESS_KEY_ID` | ASR 访问 | 真实语音识别 |
| `ALIYUN_ACCESS_KEY_SECRET` | ASR 密钥 | 仅服务端 |
| `DEEPSEEK_API_KEY` | 结构化解析 | 真实语音解析 |
| `ANALYTICS_ENABLED` | 是否接收匿名产品事件 | 默认开启 |
| `ANALYTICS_DATA_DIR` | 统计 JSONL 私有目录 | 生产必须指向持久目录 |
| `ANALYTICS_HASH_SALT` | 匿名 ID 哈希盐 | 生产必须配置且只放服务端 |
| `FEEDBACK_DATA_DIR` | 反馈 JSON 私有目录 | 生产使用 `/opt/shengzhang/shared/reports/.feedback` |
| `FEEDBACK_HASH_SALT` | 反馈安装 ID 哈希盐 | 生产必须配置且只放服务端 |
| `EXPO_PUBLIC_API_BASE_URL` | 移动端 API 地址 | 真机测试 |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | 构建时统计总开关 | 默认开启 |
| `SCREEN_VISION_ENABLED` | 服务端截图视觉总开关 | 本地默认 `false`；生产由服务端配置 |
| `SCREEN_VISION_BASE_URL` | 视觉模型 OpenAI 兼容地址 | 当前生产为 `https://api.deepseek.com` |
| `SCREEN_VISION_MODEL` | 视觉模型名 | 当前生产为 `deepseek-flash` |
| `SCREEN_VISION_API_KEY` | 视觉专用 Key | 可选；未配置时按地址复用 `DEEPSEEK_API_KEY` |
| `SCREEN_VISION_DAILY_LIMIT` | 单安装每日额度 | 生产默认 20 |
| `SCREEN_VISION_GLOBAL_DAILY_LIMIT` | 全局限额 | 生产默认 500 |
| `SCREEN_VISION_IP_MINUTE_LIMIT` | 单 IP 每分钟额度 | 生产默认 10 |
| `SHENGZHANG_LOCAL_ANDROID_PACKAGE` | 本地构建包名覆盖 | 可选，用于与正式包并存调试 |

`EXPO_PUBLIC_*` 会进入客户端包，禁止放入任何密钥。

首次运行先 `nvm use 22`，再执行 `pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm test`。默认 shell 的 `node` 可能仍是 20.x，版本不符时 pnpm 会直接报错。

## 5.1 Android 真机与快捷记账调试

1. 手机开启开发者选项和 USB 调试，连接后在手机上接受这台电脑的授权。
2. 确认设备：`adb devices -l`。
3. 安装本轮 APK：`adb install -r apps/mobile/build-<timestamp>.apk`；覆盖安装会保留本地账本，仍建议先导出 JSON 备份。
4. 只看快捷记账结构日志：`adb logcat -s ShengzhangCapture ReactNativeJS`。日志不应出现金额、商户、正文、截图或数据库路径。
5. 需要窗口/无障碍现场证据时，运行只读诊断：

```bash
python3 packages/screen-capture/scripts/device_diagnostics.py --seconds 30
```

JS 页面和提示可以通过 Metro/Fast Refresh 迭代；Kotlin 窗口识别、截图、磁贴和原生浮层必须重新编译安装。完整方法、脚本边界和本轮真机结果见 [43](./43-android-device-debugging.md)、[44](./44-quick-accounting-device-verification.md)。

EAS preview 本地构建使用 `apps/mobile/eas.json` 的 `preview` profile，产物为 `apps/mobile/build-<timestamp>.apk`。`production` profile 尚未用于公开发布；在正式切换前不要把它与 preview 包混用。

生产部署、对象存储和客服/支付资源的详细取舍见 [生产基础设施与上线清单](./26-production-infrastructure.md)。

## 6. iOS 开发流程

### Expo Go 阶段

```bash
pnpm dev:mobile
```

用 iPhone 相机扫描终端二维码。适合验证布局、导航和本地数据，不支持微信原生 SDK。

### Development Build 阶段

安装 Xcode 后：

```bash
pnpm --filter @shengzhang/mobile exec expo run:ios
```

若原生依赖有变化：

```bash
pnpm --filter @shengzhang/mobile exec expo prebuild --clean
```

注意：`prebuild --clean` 会重建原生工程，执行前确认没有手写且未纳入配置插件的原生修改。

### 真机

1. 用数据线连接 iPhone 并在设备上信任电脑。
2. 在 Xcode 中选择开发团队。
3. 第一次安装需要在 iOS 设置中信任开发者。
4. 确保手机与开发机在同一网络，或使用 EAS 构建。

## 7. Android 开发流程

```bash
pnpm --filter @shengzhang/mobile exec expo run:android
```

启动模拟器前：

```bash
adb devices
```

如果设备列表为空，在 Android Studio Device Manager 中启动一个模拟器。真机需要打开开发者选项和 USB 调试。

国内 Android 真机可能默认限制后台网络或安装未知来源应用，测试时逐项确认。

## 8. 微信登录准备

在微信开放平台创建“移动应用”后：

1. 填写 iOS Bundle ID 和 Android 包名。
2. 配置应用签名。
3. 等待审核通过。
4. 将 AppID 和 AppSecret 放入服务端环境变量。
5. 在 Expo config plugin 或 development build 中配置微信 SDK。
6. 使用微信开放平台提供的测试账号完成授权、取消和未安装测试。

AppSecret 不得写入 `app.json`、`EXPO_PUBLIC_*`、移动端代码或 GitHub Actions 日志。

## 9. 常见问题

### `Unsupported engine` 或 Expo 启动失败

Node 版本过低。升级到 22 LTS 后删除旧依赖并重装：

```bash
pnpm install
pnpm typecheck
```

不要直接删除整个项目；只清理 `node_modules` 和构建缓存。

### `xcodebuild requires Xcode`

只安装了 Command Line Tools。安装完整 Xcode 后执行 `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`。

### Android 找不到设备

检查 `adb devices`、USB 调试授权和模拟器是否启动。不要依赖未展开的 `$HOME` 路径写死配置。

### 真机无法访问 API

`localhost` 在手机上指向手机自身。把 `EXPO_PUBLIC_API_BASE_URL` 改为开发机局域网 IP，例如 `http://192.168.1.20:8787`，并确保 API 监听 `0.0.0.0`。

### 微信登录一直失败

依次检查包名/Bundle ID、签名、AppID、开放平台审核状态、服务端密钥、手机是否安装微信。不要把 AppSecret 放到客户端排查。

### 磁盘空间不足

Xcode、Android SDK 和模拟器镜像占用较大。优先清理旧模拟器镜像和构建缓存，不要删除用户账单或项目源文件。

## 10. 环境验收

完成以下命令并通过后，环境才算可用：

```bash
node --version                 # v22.x
pnpm --version                 # 11.x
xcodebuild -version            # 有完整 Xcode
java -version                  # Android Studio JDK
adb devices                    # 至少一个设备/模拟器
pnpm typecheck
pnpm test
```

Android 已完成本地 Gradle 构建、APK 签名和 ADB 真机调试；当前下一项环境任务是在需要 iOS 原生构建或模拟器时安装完整 Xcode。
