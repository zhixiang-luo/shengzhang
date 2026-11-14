# 贡献指南

感谢你关注声账。提交代码前，请先确认改动符合产品的本地优先、语音优先和隐私边界。

## 开始之前

1. 先搜索现有 Issue，避免重复讨论。
2. 较大的功能或架构调整，请先创建 Issue 说明目标和边界。
3. 不要提交真实账单、录音、密钥、Token、手机号或微信身份信息。

## 本地开发

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm dev:mobile
pnpm dev:api
```

提交 Pull Request 前，请确保：

- TypeScript、Lint 和测试全部通过；
- 新业务规则有对应测试；
- UI 改动说明验证过的设备或视口；
- 数据、契约或架构变化同步更新文档；
- 没有提交 `.env`、签名文件、构建产物或日志。

## Android 原生与快捷记账

涉及 `packages/screen-capture`、Android Manifest、Kotlin 或付款页快捷记账时，还必须：

- 说明是否改变原生权限、runtime、数据库 schema 或 OTA 兼容性；
- 跑完整 Android Gradle 构建，不用 Expo Go、JS bundle 或旧 runtime OTA 代替；
- 在 Android 11+ 真机验证微信/支付宝、磁贴/系统动作、连续多笔、保存后刷新和无障碍关闭提示；
- 不提交真实账单、截图、金额、商户、设备序列号或 `adb` 原始 UI dump；
- 原生日志只保留固定错误码、窗口结构、来源种类和尺寸/字节；
- 更新 [付款页快捷记账规格](docs/35-payment-screen-capture.md)、[真机闭环记录](docs/44-quick-accounting-device-verification.md) 和 `docs/HANDOFF.md`。

只改 JS/TS 时使用 Fast Refresh 即可；Kotlin、权限或 Manifest 变化必须重新编译安装。

## 提交信息

建议使用以下前缀：

- `feat:` 新能力
- `fix:` 缺陷修复
- `docs:` 文档
- `design:` 视觉与交互
- `test:` 测试
- `chore:` 工程维护

## Pull Request

请在描述中写清楚：

- 解决了什么问题；
- 采用的关键方案；
- 如何验证；
- 是否影响数据、接口、隐私或旧版本兼容。
