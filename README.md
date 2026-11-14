<p align="center">
  <img src="design/exports/brand-lockup.png" alt="声账：说一句，就记好。" width="620" />
</p>

<p align="center">
  <a href="https://github.com/zhixiang-luo/shengzhang/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/zhixiang-luo/shengzhang/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Expo 58" src="https://img.shields.io/badge/Expo-58-292624?logo=expo&logoColor=white" />
  <img alt="React Native 0.88" src="https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=111111" />
  <img alt="TypeScript 6" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tests 410" src="https://img.shields.io/badge/tests-410_passed-63795E" />
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-E89A96" /></a>
</p>

<p align="center">
  一款面向中国内地年轻个人用户的语音优先记账应用。<br />
  按住说一句，账单自动生成。
</p>

## 为什么做声账

我平时会记账，也用过一些记账工具。但每次付款后，仍然需要打开应用、选择分类、输入商品和金额。记账这件事本身不复杂，麻烦的是它总在打断正在发生的生活。

我想要的工具更简单：**不用整理句式，不用逐项点击，一句话就能把账记好。**

所以有了声账。

它不是要成为功能最多的记账软件，而是想成为从付款到记账之间最短的一条路。应用坚持语音优先、本地优先和克制的视觉表达，让记录足够快、界面足够安静、数据边界足够清楚。

这个项目也是我作为独立开发者完成的第一个完整应用。从产品定义、交互设计、React Native 客户端、Fastify 语音网关到服务器部署，由我负责整体设计与实现；开发过程中使用 AI 编程工具辅助编码、测试和文档整理。

## 产品截图

以下前三张截图来自已评审的交互原型；付款页快捷卡由当前 RNWeb 组件以合成数据渲染，不是原生浮层真机截图。正式 App 截图会随内测版本持续更新。

| 一句话多笔记账 | 月度统计 | 手动记账兜底 |
| :---: | :---: | :---: |
| <img src="prototype/screenshots/voice-result.png" alt="语音记账结果" width="250" /> | <img src="prototype/screenshots/stats.png" alt="月度统计" width="250" /> | <img src="prototype/screenshots/manual-entry.png" alt="手动记账" width="250" /> |

### 付款页快捷记账

Android 11+ 在微信、支付宝单笔付款详情页，通过控制中心磁贴或系统快捷动作触发。金额、商户、时间和分类生成一张可编辑卡，点一次“确定收好了”写入本地账本，不跳转主页面。

<p align="center">
  <img src="deploy/site/assets/screens/quick-capture.png" alt="声账付款页快捷记账确认卡" width="300" />
</p>

## 为谁而做

声账主要面向 **18–35 岁的学生和年轻职场人**：他们有日常消费，也愿意了解自己的钱花在哪里，但不想维护复杂表格，不愿意为了记一笔账经过多层页面。

典型使用场景：

- 午餐后说一句“午饭 25，咖啡 18”；
- 打车后说一句“打车 32”；
- 收到工资后说一句“今天工资到账 8000”；
- 忘记分类或金额时，再通过手动记账补齐。

## 核心体验

1. 按住底部“记账”按钮开始说话。
2. 火山流式 ASR 实时返回文字。
3. 松手后由 DeepSeek 提取金额、收支类型、分类、日期和备注。
4. 多笔账单自动写入本地 SQLite，并展示合并结果。
5. 保存后 8 秒内可以整批撤销。

语音是主路径，手动记账是稳定兜底。首次启动不要求登录，网络或云服务失败也不会阻塞本地账本。

## 当前能力

| 模块 | 状态 |
| --- | --- |
| 语音流式录音与实时字幕 | ✅ 已接入真实火山 ASR |
| 一句话多笔、自动分类与时间解析 | ✅ 已接入 DeepSeek 结构化 |
| 语音结果自动入账、8 秒撤销 | ✅ 已完成 |
| 语音缺金额逐笔补齐后整批入账 | 🚧 代码与自动化完成，待真机验收 |
| 手动记账、金额计算键盘、备注 | ✅ 已完成 |
| 两级自定义分类、拖拽排序、归档 | ✅ 已完成 |
| 月度统计、分类下钻、每日明细 | ✅ 已完成 |
| 本地 SQLite 与删除撤销 | ✅ 已完成 |
| Android 正式 APK | ✅ `0.3.3 (41)` 已发布 |
| OTA 增量更新 | ✅ 已接入 EAS Update，需安装含更新客户端的版本 |
| 官网与移动端下载入口 | ✅ 已部署到 `https://bigai.xin/shengzhang/` |
| 匿名产品统计与用户开关 | ✅ 已完成 |
| 匿名改进与反馈 | ✅ 设置入口、私有收件箱和每日统计已完成 |
| 本地 JSON 备份/恢复与 CSV 导出 | ✅ 已完成 |
| 离线账单搜索与组合筛选 | ✅ 已完成 |
| 确定性月度回顾与隐私分享卡 | ✅ 代码与双端导出完成，待真机验收 |
| Android 11+ 付款页快捷记账 | ✅ `0.3.3 (41)` 已发布；微信、支付宝真机通过，连续多笔、语音接续、列表自动刷新与冷启动已验证 |
| 30–50 条真人语音与双端真机矩阵 | 🚧 进行中 |
| 隐私中心 | 🚧 进行中 |
| 微信登录、云备份、会员与支付 | 🧭 外部依赖就绪后再启动 |

项目当前处于 **M5/M6 正式发布阶段**。快捷记账由主动截图直接走云端，在当前微信/支付宝页面显示可编辑卡，点一次“确定收好了”写现有本地账本并收起。保留单图分享；不先 OCR，不把未知金额伪装 0 元，不增加快捷记账二次确认或撤销页。410 项测试、类型检查、Lint、API build 及双端 bundle 通过；原生规则 51 项通过，`0.3.3(41)` 完整 Gradle 构建通过。公开稳定已切到 `0.3.3`，详见 [真机闭环记录](docs/44-quick-accounting-device-verification.md)。

线上视觉模型已切到 DeepSeek Flash。0.3.3(36) 真机完成同一微信详情页连续 3 次快捷键、随后 2 笔语音、首页/搜索自动刷新和冷启动验证；0.3.3(37) 增加“快捷记账被系统关闭”的低调恢复提示；0.3.3(41) 将控制中心磁贴改为无耳圆脸小猪并正式发布。HyperOS 在强行停止或覆盖安装后会关闭无障碍，App 只能引导用户重新开启，不能静默恢复。

## 技术亮点

- **语音优先状态机**：录音、实时转写、取消、手动切换、结构化、自动保存和撤销都有明确状态。
- **本地优先**：账单首先写入 SQLite，网络、登录和云备份不是记账前置条件。
- **共享领域模型**：金额统一使用整数分，客户端、服务端和测试共用 Zod 契约与领域函数。
- **流式语音链路**：手机 PCM → Fastify WebSocket → 火山双向流式 ASR → DeepSeek 结构化。
- **主动截图快捷记账**：Android 磁贴/兼容系统动作 → 内存截图直接云端 → 原页面无障碍简卡 → 一次确认写同库。首次同意后直接识别，可关闭；金额未知不伪装，晚到结果不覆盖编辑。分享单图也可用，供应商处理见隐私设计。
- **原生写入与 JS 读取隔离**：账本统一使用 rollback journal，短连接读取串行化；关闭连接失败不覆盖已成功结果，避免跨 SQLite 实现的 WAL checkpoint 把“保存成功”变成“账本读取失败”。
- **持续更新**：兼容修复通过 EAS Update 自动 OTA；原生变化由服务端版本策略提示覆盖安装，必要时可阻断已停止支持的旧版。
- **隐私边界明确**：录音仅用于本次识别，服务端不长期保存音频；语音模型不接收历史账单。
- **隐私优先产品观测**：匿名统计激活、留存、功能渗透、语音时延与失败原因，不含金额、分类、备注、录音和转写正文。
- **匿名反馈闭环**：站内反馈不要求登录，支持选填联系方式；正文进入私有收件箱，日报只统计数量和类型。
- **确定性月度回顾**：所有回顾事实由本地账单聚合生成，不让模型编造金额、分类或趋势；分享卡默认隐藏具体账目。
- **可验证质量**：200 条中文 TTS 语音基线全部通过，当前仓库包含 410 项自动化测试。

### 架构概览

```mermaid
flowchart LR
  A[Expo / React Native] -->|本地数据| B[(SQLite)]
  A -->|实时 PCM| C[Fastify 语音网关]
  A -->|Android 主动触发| S[磁贴 / 兼容系统动作]
  S -->|首次同意后当前图| V[截图视觉网关]
  V --> O[原页面确认卡]
  O --> B
  A -->|主动分享单图| V
  V --> Q[可替换视觉模型]
  C --> D[火山流式 ASR]
  C --> E[SiliconFlow 备用 ASR]
  C --> F[DeepSeek 结构化]
  A -->|云备份：规划中| G[(PostgreSQL)]
  G --> H[(私有对象存储)]
```

详细设计见 [技术架构](docs/09-technical-architecture.md)、[语音记账规格](docs/05-voice-accounting.md)、[AI 供应商配置](docs/19-ai-providers.md) 和 [App 更新与发布](docs/30-app-updates.md)。

## 工程质量

| 验证项 | 当前结果 |
| --- | --- |
| TypeScript 严格检查 | 通过 |
| ESLint | 通过 |
| 自动化测试 | 410 / 410 通过（domain 137 / mobile 122 / API 151） |
| Expo Doctor | 18 / 20；2 项在线检查受当前网络环境限制 |
| 中文 TTS 语音评测 | 200 / 200 通过 |
| 松手到结构化完成 | P50 1.68s / P95 2.20s |
| Android 正式构建 | `0.3.3 (41)` 完整 Gradle 构建、v2 签名及旧证书连续性通过 |
| iOS / Android Bundle 导出 | `0.3.3` 通过 |

`0.3.3 (41)` 为 production 渠道本地构建，`versionCode=41`，签名 SHA-256 `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955`，与 0.2.1–0.3.3(35) 连续；本机文件不进入 Git，构建记录、真机证据和上线记录见 [44号记录](docs/44-quick-accounting-device-verification.md)。上一版0.3.2(23)保留在 [41号记录](docs/41-cloud-overlay-validation.md)，0.3.1(22)及合成模型评测保留在 [38号记录](docs/38-quick-accounting-validation.md)。

200 条语音结果来自合成的中文 TTS 基线，不等同于真人噪声、口音和弱网环境。项目仍在补充真人语料与双端真机矩阵。

## 快速开始

环境要求：Node.js 22+、pnpm 11+。

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

启动移动端：

```bash
pnpm dev:mobile
```

手机安装 Expo Go，并与电脑保持在同一局域网，然后扫描终端二维码。

启动本地语音网关：

```bash
pnpm dev:api
```

复制 `.env.example` 为 `.env`，按需填写：

```text
DEEPSEEK_API_KEY=your_key
VOLCENGINE_ASR_API_KEY=your_key
VOLCENGINE_ASR_RESOURCE_ID=your_resource_id
SILICONFLOW_API_KEY=your_backup_key
```

真实密钥只允许存在于本地或服务端环境变量中，不要提交到仓库。

## 可点击原型

原型不依赖构建工具：

```bash
cd prototype
python3 -m http.server 4173
```

打开 `http://localhost:4173`，或直接查看 [原型截图](prototype/screenshots/) 和 [原型预览总览](preview/prototype-contact-sheet.png)。

## 项目结构

```text
声账/
├── apps/mobile/       Expo + React Native 双端应用
├── services/api/      语音、账号与备份网关
├── packages/
│   ├── contracts/     Zod 接口契约与共享 DTO
│   ├── domain/        金额、分类、排序、统计与付款页文本纯函数
│   └── screen-capture/ Android 无障碍浮层、快捷入口、同库写入与单张分享
├── docs/              产品、技术、隐私、评测与部署文档
├── design/            品牌资产、设计令牌与导出资源
├── prototype/         可点击交互原型与关键页面截图
├── deploy/            Nginx、systemd 与服务器初始化配置
└── preview/           GitHub 浏览用预览资源
```

## 文档导航

- [项目上下文：5 分钟了解声账](docs/00-project-context.md)
- [产品需求与 MVP 边界](docs/01-prd.md)
- [用户流程](docs/03-user-flows.md)
- [语音记账设计](docs/05-voice-accounting.md)
- [技术架构](docs/09-technical-architecture.md)
- [语音评测报告](docs/20-voice-eval-report.md)
- [后期产品战略](docs/21-post-mvp-strategy.md)
- [月度回顾与隐私分享卡](docs/33-monthly-review.md)
- [Android 付款页快捷记账规格](docs/35-payment-screen-capture.md)
- [Android 快捷记账现场调试](docs/43-android-device-debugging.md)
- [0.3.3 真机闭环与上线清单](docs/44-quick-accounting-device-verification.md)
- [生产基础设施与上线清单](docs/26-production-infrastructure.md)
- [当前开发交接](docs/HANDOFF.md)

## 路线图

### 正在做

- 准备 `0.3.3` 正式发布：撤掉服务器测试额度、部署友好 429 文案、生成 production 渠道安装包并确认 OTA 优先级；
- 用真实微信/支付宝页面继续抽测 DeepSeek Flash 的金额、商户、时间、分类和拒识边界，官方千问保留为备选；
- 扩充真人、口音、噪声和弱网语音测试；
- 完成 iOS / Android 中低端真机矩阵；
- 真机验收 JSON 导出、清空和恢复闭环；
- 完成账单搜索与数据安全的双端真机验收；
- 真机验收月度回顾、PNG 清晰度、系统分享和临时文件清理。

### 后续

- 完成 iOS 快捷指令 → App Intent 的付款页图片导入路线；
- 云备份与手动恢复；
- 隐私中心与可选分享控制；
- 多平台发布和更完整的无障碍支持。

### 外部依赖就绪后

- 微信登录；
- 会员权益与支付；
- 社区推广和邀请机制。

产品范围和技术边界以 [实施路线图](docs/14-implementation-roadmap.md) 为准；备份格式详见 [本地数据备份与恢复](docs/31-local-data-portability.md)。

## 下载与发布

最新公开 Android 版为 `0.3.3 (41)`，可从[声账官网下载入口](https://bigai.xin/shengzhang/#download)获取。当前正式包大小 155,851,496 字节，SHA-256 为 `4c84fd68003048b12c634a43f8b47eec13dc0087c76c4ab8db320657eb495c3b`。由于本机与服务器均未配置 OSS 凭据，本轮正式下载改用 `https://bigai.xin/shengzhang/downloads/shengzhang-0.3.3-preview.apk` 直连；`download.bigai.xin` 仍保留 0.2.1 旧包，恢复凭据后再迁回 CDN。`0.3.3` 包含原生无障碍浮层、TileService、独立动作、同库写入与单图分享，`minSdkVersion=30`，必须新原生 APK/runtime；不申请 SYSTEM_ALERT_WINDOW。Android 11+ 可覆盖安装并保留本地账本。

GitHub Releases 保留每个版本的 Tag 和更新说明作为可追溯记录。官网当前提供 `0.3.3 (41)`；GitHub Release 附带同一构建。文件大小、SHA-256 和完整构建记录见 [App 更新与发布文档](docs/30-app-updates.md)。APK 不直接提交到 Git 仓库，避免仓库体积膨胀。

当前尚未在 App Store 或国内 Android 应用商店正式上架。

## 开源与隐私

这是一个开放源代码项目。公开代码的目的，是让用户、开发者和面试官能够看到应用如何工作、账单如何处理，以及哪些数据留在本地、哪些请求会发送到服务端。

请不要在 Issue、截图或提交中上传真实账单、录音、密钥、手机号或微信身份信息。

源码依据 [MIT License](LICENSE) 开放，但“声账”名称、Logo、小猪角色和官方视觉不随代码一并授权；发布衍生版本时请使用不同品牌。具体边界见 [TRADEMARK.md](TRADEMARK.md)。

公开源码不包含模型或云服务密钥，也不授予任何人无限调用维护者线上语音服务的权利。自部署者需要在服务端配置自己的供应商账号并承担相应费用。线上 API 应通过安装额度、限流、预算告警和停用开关控制成本，详细规则见 [开源项目运营边界](docs/28-open-source-operations.md)。

## 参与贡献

欢迎提交 Issue、改进建议和 Pull Request。开始前请阅读 [贡献指南](CONTRIBUTING.md) 和 [安全策略](SECURITY.md)。

## English Summary

**Shengzhang** is a voice-first personal bookkeeping app for young users in mainland China. Hold the record button, speak naturally, and the app creates one or more transactions automatically. It combines streaming ASR, LLM-based structured extraction, local-first SQLite storage, manual entry, category management, and monthly statistics in one Expo / React Native application.

This is an independent developer project covering product design, mobile development, backend engineering, AI integration, testing, and deployment.

## License

[MIT](LICENSE) © 2026 zhixiang-luo
