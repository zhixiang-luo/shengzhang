# 声账设计与品牌资产索引

## 1. 资产状态

| 资产 | 当前文件 | 状态 | 后续动作 |
| --- | --- | --- | --- |
| 小猪品牌标记 | `assets/piggy-mark.svg` | 可用 | 与 App 内 `BrandMark` 保持同一矢量结构 |
| 横向品牌标志 | `assets/brand-lockup.svg` | 可用 | 用于官网、商店介绍和分享图 |
| App 图标 | `assets/app-icon.svg` | 可用 | 满版不透明底，由系统负责圆角裁切 |
| Android 自适应前景 | `assets/adaptive-icon.svg` | 可用 | 安全区内主体，透明底 |
| Android 单色图标 | `assets/monochrome-icon.svg` | 可用 | 透明底，由系统主题着色 |
| 原生启动图 | `assets/splash-mark.svg` | 可用 | 1024 圆形底盘，2048 PNG 用于 iOS/Android 原生启动 |
| 声波装饰 | `assets/sound-wave.svg` | 可用 | 9 根圆角音量柱，表达语音输入 |
| 原型小猪 | `../prototype/assets/pig.svg` | 仅原型 | 不进入正式商店资产 |
| 设计令牌 | `tokens/design-tokens.json` | 基线 | 与 `apps/mobile/src/theme/tokens.ts` 同步 |
| CSS 令牌 | `tokens/tokens.css` | 基线 | 仅原型/网页预览使用 |
| 高保真页面 | `screens/` | 待制作 | 14 个核心页面与关键异常态 |

## 2. 命名

页面导出：

```text
01-onboarding.png
02-ledger-empty.png
03-ledger-normal.png
04-voice-recording.png
04-voice-recording-cancel.png
05-voice-parsing.png
06-voice-result-multi.png
07-voice-needs-amount.png
08-manual-entry.png
09-stats-normal.png
10-stats-empty.png
11-date-detail.png
12-categories.png
13-wechat-login.png
14-cloud-backup.png
15-restore-conflict.png
16-settings.png
17-errors.png
```

状态图使用同一编号加状态后缀，例如：

```text
03-ledger-normal-delete-undo.png
08-manual-entry-edit.png
16-settings-delete-confirm.png
```

组件命名使用 PascalCase，与 React Native 组件一致：

- `VoiceButton`
- `RecordingLayer`
- `ResultSheet`
- `TransactionRow`
- `MonthHeader`
- `StatsBarChart`
- `CategoryDonut`
- `ConfirmSheet`

## 3. 导出规格

### 页面稿

- 基准视口：390 × 844pt。
- 导出：3× PNG，1170 × 2532px。
- 背景不透明，带系统安全区示意。
- 同时保存可编辑源文件；源文件不得只存在于个人云盘。

### App 图标

| 平台 | 尺寸 | 要求 |
| --- | --- | --- |
| iOS | 1024 × 1024 | 不透明，无圆角遮罩，无文字 |
| Android foreground | 1024 × 1024 | 安全区内主体，透明底 |
| Android background | 由 Expo 配置纯色 | `#FAF7F0` |
| Android monochrome | 1024 × 1024 | 透明底，单色轮廓 |
| 商店 | 1024 × 1024 | 与 App 图标一致 |

Splash 使用 `splash-mark.svg` 导出 2048 × 2048 透明 PNG。主体必须是完整圆形底盘，不旋转、不使用菱形遮罩、不使用缺省侧弧，也不把带圆角方块的 App 图标直接放大。
品牌横向组合导出为 2400px 宽透明 PNG，供官网和分享场景使用。

### 插画与图标

- 优先 SVG，`viewBox` 固定，避免内联样式。
- 同一组图标使用 24 × 24 viewBox、1.75 或 2pt 线宽、圆端点。
- 装饰图不携带文字；文案由界面层提供，方便本地化。
- 小猪只使用品牌色 `ink`、`blush`、`blushSoft`，不使用渐变和阴影。

## 4. 代码映射

| 设计资产 | 代码位置 |
| --- | --- |
| 颜色、字号、间距、圆角 | `apps/mobile/src/theme/tokens.ts` |
| 品牌 SVG | `apps/mobile/assets/brand/` |
| App 图标 | `apps/mobile/assets/` 与 `app.json` |
| 页面组件 | `apps/mobile/src/components/` |
| 图表 | `apps/mobile/src/features/stats/components/` |

任何新增颜色或字号先改 `design-tokens.json`，再同步代码令牌；不允许只在单个页面硬编码。

## 5. 设计验收

- 390 × 844、375 × 812 和常见 Android 窄屏均无横向溢出。
- 1.3× 字体下主按钮和金额不截断。
- 触控目标 ≥ 44 × 44pt。
- 正文对比度 ≥ 4.5:1。
- 一屏最多一个腮红实心按钮。
- 空、加载、成功、失败和权限拒绝状态均有独立稿。
- 页面编号、文件命名和文档索引一致。
