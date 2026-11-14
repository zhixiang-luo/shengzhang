# Redmi K60 窗口诊断 Implementation Plan

> **For agentic workers:** 在当前会话按步骤执行，不委派、不提交。此工具是临时诊断探针，不能作为产品修复或真机验收结论。

**Goal:** 直接观察与声账相同配置的无障碍接口及实际窗口规则，在不重打完整 RN App 的情况下定位窗口确认失败。

**Architecture:** 独立包名 `com.shengzhang.windowprobe`，复用现有 `CaptureWindowRules.kt` 和其纯 Kotlin 类型。单独原生服务在 shell 主动请求后只采样六秒；输出有限来源标签、窗口数值、服务能力和规则结果。探针与正式 App 的服务实例不同，因此结果仅证明相同配置/规则的接口行为，不能替代正式进程内部轨迹。

**Tech Stack:** Android API 35、Java 17、已缓存的 Kotlin 2.2.21 编译器、aapt2/D8/apksigner、ADB；无 Expo/RN API 变更。

**Spec:** `docs/43-android-device-debugging.md` 与本次 USB 现场排查。

## Global Constraints

- 不覆盖、卸载、清除 `com.shengzhang.ledger`，不访问其私有文件。
- 不截图、不读取节点文字/标题/子节点、不联网、不保存账单。
- 不修改线上 API、稳定包、系统安全设置或现有无障碍启用列表。
- 使用独立临时签名；密钥与构建中间文件只放系统临时目录，APK放忽略的 `dist/device-debug/`。
- 接收器要求 `android.permission.DUMP`，只响应 shell/system 主动请求；停止采样后不输出页面事件。
- 如手机需要用户批准安装或手动启用新服务，先交付已构建的具体工具及明确操作，不能自动改设置。

## Task 1: 构建并验证临时探针

**Files:** `packages/screen-capture/tools/window-probe/` 下的 Manifest、两个资源 XML、三个 Java 源文件和 `build.py`；记录保留 `docs/43-android-device-debugging.md`。

**Interfaces:** `WindowProbeService.startProbe(boolean dismissShade)`；受 DUMP 权限约束的 `com.shengzhang.windowprobe.SAMPLE` broadcast；logcat tag `SZWindowProbe`。来源仅 `wechat/alipay/shengzhang/systemui/probe/other/null`。

- [ ] 用真实项目规则源码与 Android 35 编译探针，所有失败只输出有限原因，不输出原始异常正文。
- [ ] 构建脚本只在临时目录创建调试密钥，执行 aapt2、Kotlin、javac、D8、zipalign 和 apksigner。
- [ ] 检查 APK 包名、权限、服务 XML、签名；复跑共享规则现有原生测试与诊断脚本九项回归。
- [ ] ADB 安装独立 APK；由用户手动开启临时服务。记录安装/启用是否实际完成。
- [ ] 在微信/支付宝停留时使用 `am broadcast -a com.shengzhang.windowprobe.SAMPLE -n com.shengzhang.windowprobe/.WindowProbeReceiver --ez dismiss false`，读取限定 tag 的结构日志。
- [ ] 对比应用窗口、active root 和实际 `CaptureWindowSelection`，根据证据决定产品最小修复；不能以静态编译成功称功能已修复。
- [ ] 同步43与HANDOFF，停止探针采样，不提交、不发布。
