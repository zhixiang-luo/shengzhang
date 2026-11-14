# 测试与发布

## 1. 测试层级

| 层级 | 工具 | 内容 |
| --- | --- | --- |
| 单元 | Vitest | 金额、日期、统计、语音解析后处理、备份 schema |
| 契约 | Vitest + Zod | API 请求/响应、错误码、备份兼容 |
| 组件 | React Native Testing Library | 账本列表、编辑面板、结果卡、错误态 |
| 集成 | Vitest | repository + SQLite、Fastify inject |
| E2E | Maestro | 首次记账、语音、编辑、统计、登录、恢复 |
| 原型 | 现有 CDP 脚本 | 交互与布局回归 |

## 2. 每次提交

```bash
pnpm typecheck
pnpm lint
pnpm test
```

涉及移动端依赖：

```bash
pnpm run doctor
pnpm --dir apps/mobile exec expo export --platform android --output-dir /tmp/shengzhang-export-android
pnpm --dir apps/mobile exec expo export --platform ios --output-dir /tmp/shengzhang-export-ios
```

涉及原型：

```bash
cd prototype
node qa.mjs
```

## 3. 语音固定评测集

- 至少 200 条，版本化在 `services/api/testdata/voice/`。
- 包含金额、中文数字、多笔、收入、相对日期、自定义分类、噪声、缺金额。
- 更换 ASR、模型、提示词、分类映射时全量重跑。

| 指标 | 门槛 |
| --- | --- |
| 金额准确率 | ≥98% |
| 收支类型 | ≥95% |
| 一级分类首选 | ≥90% |
| 多笔完整性 | ≥95% |
| P50 | ≤3 秒 |
| P95 | ≤5 秒 |

失败样例要脱敏保存为 fixture，不记录真实账户信息。

## 4. 真机矩阵

- 小屏 iPhone（如 SE 三代）。
- 主流 iPhone 刘海/灵动岛机型。
- 主流 Android（包含低端或三年以上设备）。
- 微信已安装/未安装。
- 网络正常/弱网/断网。
- 麦克风允许/拒绝/运行中撤回。
- 系统字体标准/放大。

## 5. 数据与恢复测试

- 空库、上一 schema 版本、5000 笔账单。
- 月份边界、闰年、跨时区旅行。
- 分类归档后历史账单显示。
- 语音多笔事务原子性。
- JSON 导出后清空再导入。
- 损坏 JSON、未知版本、数量不一致、非法分类引用和 checksum 错误必须被拒绝。
- 恢复 SQL 中途失败时，上一笔账单仍完整保留。
- CSV 中文 BOM、引号/逗号转义和公式注入防护。
- 搜索关键词、收支类型、两级分类、日期和金额范围的 AND 组合。
- 搜索条件非法、搜索无结果和离线读取路径。
- 月度回顾总额与 `summarizeAmounts` 一致。
- 当前月/历史月日均、上月无基准、最高支出日并列规则和空月份。
- 分享摘要不含金额、备注、商户、分类名称和精确日期。
- 云备份 checksum 错误、版本未知、网络中断。
- 恢复失败后原库保持不变。

## 6. 隐私与安全检查

- 日志中不出现录音、转写、账单正文、token、微信标识。
- 音频请求结束后本地与服务端临时文件均删除。
- 备份对象不可公开访问，只能通过账号下载。
- 未同意隐私条款前不初始化第三方采集。
- 密钥只存在环境变量或密钥管理服务。
- 删除全部数据后不会重新上传旧快照。

## 7. 付款页快捷记账专项验收

自动化之外，快捷记账必须走真机矩阵；Expo Go、JS bundle、单张合成图或 Kotlin 规则单测都不能替代真机。

| 层级 | 当前覆盖 |
| --- | --- |
| 领域与契约 | 金额/符号/小数/拒识/分类/时间证据；`packages/domain/src/screen-bill.test.ts` |
| API | `/v1/screen-bill/parse` 请求校验、图头/尺寸/额度/并发、供应商错误映射、`amountIssue` 协商 |
| 移动端 | 草稿合并、人工编辑保护、授权切换、刷新、错误态与幂等保存 |
| Kotlin 规则 | 窗口来源、截图回退、浮层字段/阻断、云端响应、同库规则；0.3.3(37) 完整 Gradle 构建通过 |
| 真机 | 微信/支付宝、磁贴/系统动作、连续多笔、语音接续、刷新、冷启动、无障碍关闭提示 |

本轮基线：410 项 JS/TS 测试通过（domain 137、mobile 122、API 151），Kotlin 规则 51 项通过，`0.3.3 (37)` 在 Redmi K60 / HyperOS 完成微信、支付宝和语音回归。证据见 [44](./44-quick-accounting-device-verification.md)。

真机清单至少覆盖：

- 微信、支付宝单笔付款详情页，磁贴和系统快捷动作分别触发；
- 同一页面连续 3 次触发各生成一笔，同一浮层重复点击只写一次；
- 保存后首页/统计/搜索/月回顾自动刷新，冷启动仍存在；
- 快捷记账后立即语音记账，不出现 `Error code 10`；
- 金额缺失、失败/待付款/退款/转账/外币、云端关闭、离线、429、供应商失败；
- 安全窗口/`FLAG_SECURE` 明确失败；
- 强行停止或覆盖安装后无障碍被关闭，首页提示可进入系统设置并持久忽略。

构建与签名：

- 原生变更必须走完整 Android Gradle/EAS 构建，不用旧 runtime OTA；
- 记录 versionCode、证书 SHA-256、APK 大小、SHA-256 和 embedded update；
- 签名证书必须与已安装版本连续，覆盖安装后本地账本保留。

## 8. 发布门禁

- `typecheck`、`test`、Expo Doctor 全部通过。
- iOS 与 Android production build 均可安装。
- 核心 E2E 全通过。
- 语音基准达到门槛。
- 本地 JSON 导出、清空和恢复流程通过。
- 账单搜索在 iOS/Android 真机可完成关键词、分类、日期和金额组合筛选。
- 月度回顾在 iOS/Android 真机可打开空/非空月份，生成清晰 PNG 并调起系统分享。
- `react-native-view-shot` 必须进入原生构建；双端 Expo export 不能替代安装包验收。
- 付款页快捷记账按第 7 节完成微信、支付宝、磁贴、系统动作、连续多笔、语音接续和刷新验收。
- `0.3.3` production 渠道安装包已生成，签名证书连续；preview/production OTA 优先级已确认不会用旧 JS 覆盖新包。
- 服务器测试额度覆盖已删除，恢复 `20/天、10/分钟`；友好 429 文案已部署并通过公网 smoke。
- 隐私政策、用户协议、权限说明与备案完成。
- 商店图标、启动页、截图、描述完成。
- 无测试入口、模拟数据、调试菜单和硬编码密钥。

## 9. 发布与回滚

- EAS production 构建生成版本号和构建号。
- 先 TestFlight/安卓内测，再逐步放量。
- OTA 只用于 JS 修复，不绕过原生版本和商店规则。
- 更新通道和首次安装要求见 [App 更新与发布](./30-app-updates.md)。
- 服务端 API 保持向后兼容；数据库迁移只前进。
- 出问题时优先关闭新语音供应商或备份写入，保留本地记账。
- 每次发布记录版本、变更、已知问题和回滚方式到 HANDOFF。
