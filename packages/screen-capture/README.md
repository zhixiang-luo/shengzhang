# @shengzhang/screen-capture

声账 Android 付款页快捷记账的原生 Expo Module。只有用户主动触发时才读取当前微信/支付宝付款详情页，在原页面显示可编辑卡，确认一次写入主 App 的本地 SQLite 账本。

## 能力边界

- Android 11+（API 30），必须安装包含本模块的新 APK/runtime；Expo Go 和 Web 不支持真实采集。
- 入口包括 Quick Settings Tile、系统无障碍按钮/已分配动作、独立 `CaptureShortcutActivity` 和单张图片分享。
- 使用 `AccessibilityService` 观察窗口来源，使用 `TYPE_ACCESSIBILITY_OVERLAY` 在原页面显示确认卡；不申请 `SYSTEM_ALERT_WINDOW`。
- 不后台遍历正文、不监听支付通知、不读取剪贴板或相册。
- 微信、支付宝单笔付款详情页为白名单；银行和安全窗口不支持，`FLAG_SECURE` 不能绕过。

## 数据流

```text
磁贴/系统动作/分享
  -> 校验来源窗口
  -> 内存截图（最长边 1600、JPEG、≤2MB）
  -> /v1/screen-bill/parse
  -> 原页面可编辑卡
  -> 确定收好了
  -> filesDir/SQLite/shengzhang.db
  -> onScreenBillSaved
```

首次云端识别前必须单独征得同意；关闭后立即拦截待上传任务并取消在途请求。手机不持有供应商 Key，历史账本不会随截图上传。

## 关键文件

| 文件 | 职责 |
| --- | --- |
| `android/.../BillCaptureAccessibilityService.kt` | 任务、窗口、截图、取消与系统按钮 |
| `android/.../BillOverlayController.kt` | 原页面浮层、编辑、阻断与保存交互 |
| `android/.../OverlayCloudClient.kt` | 内存图到声账网关、超时与取消 |
| `android/.../OverlayConfiguration.kt` | 私有配置、云端授权与数据库路径 |
| `android/.../OverlayLedger.kt` | 打开既有 SQLite、分类复核、事务写入与幂等 |
| `android/.../BillCaptureTileService.kt` | 控制中心磁贴 |
| `android/.../ShareBillActivity.kt` | 单张 `ACTION_SEND image/*` 分享入口 |
| `android/.../PendingCaptureStore.kt` | 分享副本与 metadata 的短期发布/清理 |
| `src/index.ts` | JS 能力、状态、配置、磁贴与图片导出桥 |

## 账本约束

- 只打开主 App 的 `filesDir/SQLite/shengzhang.db`，不创建第二份数据库。
- 写入前校验 `user_version=3`、外键、分类类型和 `captureId`；同一浮层重复点击幂等，不同次触发各记一笔。
- 账本统一使用 rollback journal；不要把 framework SQLite 与 expo-sqlite 混用 WAL，否则跨实现 checkpoint 可能触发 `SQLITE_IOERR(10)`。
- `busy_timeout=5000`；原生写入后通过 `onScreenBillSaved` 通知 RN 重新读取。

## 构建与验证

本包没有独立 Gradle wrapper，Kotlin 源码由 Expo autolinking 进入完整 Android 构建：

```bash
pnpm --filter @shengzhang/mobile exec expo export --platform android
cd apps/mobile
npx eas build --profile preview --platform android --local
```

`expo export` 只验证 JS bundle，不能替代 APK。原生改动必须重新构建安装，并记录 versionCode、签名证书、APK 哈希和 embedded update。

现场只读诊断：

```bash
python3 packages/screen-capture/scripts/device_diagnostics.py --seconds 30
adb logcat -s ShengzhangCapture ReactNativeJS
```

诊断脚本只读取 ADB 状态、安装版本、无障碍启用列表和窗口结构；不采集截图、UI 树、正文、金额、账户或设备序列号。

## 相关文档

- [付款页快捷记账规格](../../docs/35-payment-screen-capture.md)
- [云端浮层与快捷入口决策](../../docs/39-cloud-overlay-and-shortcuts.md)
- [快捷入口与系统手势支持](../../docs/40-shortcut-platform-support.md)
- [Android 现场调试](../../docs/43-android-device-debugging.md)
- [0.3.3 真机闭环与上线清单](../../docs/44-quick-accounting-device-verification.md)
