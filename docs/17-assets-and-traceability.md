# 资产与需求追踪

## 1. 资产索引

| 资产 | 路径 | 当前状态 | 事实源/负责人 |
| --- | --- | --- | --- |
| AI 规则 | `AGENTS.md` | 已建立 | 所有 AI |
| 产品上下文 | `docs/00-project-context.md` | 已建立 | 产品 |
| PRD | `docs/01-prd.md` | 已确认 | 产品 |
| 信息架构 | `docs/02-information-architecture.md` | 已确认 | 产品/设计 |
| 用户流程 | `docs/03-user-flows.md` | 已确认 | 产品/设计 |
| 分类种子 | `docs/04-category-system.md` | 已确认，代码待接入 | 产品/工程 |
| 语音规格 | `docs/05-voice-accounting.md` | 已确认，真实服务待接 | 产品/后端 |
| 账号与备份 | `docs/06-account-and-backup.md` | 已确认，代码待实现 | 后端/客户端 |
| 隐私 | `docs/07-data-privacy.md` | 已设计，上线前法务复核 | 产品/后端 |
| 验收 | `docs/08-acceptance-criteria.md` | 已确认 | QA |
| 技术架构 | `docs/09-technical-architecture.md` | 已建立 | 工程 |
| 数据模型 | `docs/10-data-model.md` | 已建立 | 工程 |
| API 契约 | `docs/11-api-contract.md` | 已建立 | 工程 |
| 仓库结构 | `docs/12-repository-structure.md` | 已建立 | 工程 |
| 开发环境 | `docs/13-development-environment.md` | 已建立 | 工程 |
| 实施路线 | `docs/14-implementation-roadmap.md` | 已建立 | 产品/工程 |
| 测试与发布 | `docs/15-testing-and-release.md` | 已建立 | QA/工程 |
| 可点击原型 | `prototype/index.html` | 已评审 | 产品/前端 |
| 原型源码 | `prototype/app.js`, `styles.css` | 已评审 | 原型 |
| 原型截图 | `prototype/screenshots/*.png` | 12 张已导出 | 原型 |
| 原型回归 | `prototype/screenshots/qa-report.json` | 19/19 通过 | 自动生成 |
| 视觉方向 | `design/README.md`, `design/moodboard/` | 已建立 | 设计 |
| 设计资产索引 | `design/ASSETS.md` | 已建立 | 设计 |
| 设计 tokens | `design/tokens/design-tokens.json` | 已建立 | 设计/前端 |
| 品牌标记 | `design/assets/piggy-mark.svg` | 已完成 | 设计 |
| App 图标 SVG | `design/assets/app-icon.svg` | 已完成 | 设计 |
| App 图标 PNG | `apps/mobile/assets/icon.png` | 已生成 1024px | 移动端 |
| UI 交接 | `docs/18-ui-handoff.md` | 已建立，高保真稿待补 | 设计/移动端 |
| 移动端代码 | `apps/mobile/` | Expo 骨架 | 移动端 |
| API 代码 | `services/api/` | Fastify 骨架 | 后端 |
| 领域类型 | `packages/domain/` | 基础模型完成 | 工程 |
| 接口契约 | `packages/contracts/` | 基础 schema 完成 | 工程 |

## 2. 需求追踪

| 需求 | 产品文档 | 原型/UI | 代码/接口 | 测试 |
| --- | --- | --- | --- | --- |
| 一步语音录音 | 01 §7.2, 05 §2 | 原生语音面板 | expo-audio 真机录音已接入 | Android 待用户实测 |
| 一句多笔 | 01, 05 | 语音结果卡 | mock `/v1/voice/parse` + 分类映射 | 接口样例通过 |
| 自动入账与撤销 | 01, 03 | 结果卡 + undo | SQLite voice batch 单事务 | 编译与逻辑通过 |
| 手动记账 | 01, 03 | 手动录入页 | SQLite repository 已接入 | 领域测试通过，真机待测 |
| 两级分类 | 04 | 分类选择与新增已接入 | 种子和自定义一级/二级分类已实现 | seed 校验通过，真机待测 |
| 语音左右滑入口 | 01, 03, 18 | 语音面板 | 左滑取消、右滑手动已实现 | 真机待测 |
| 日期时间选择 | 01, 03, 18 | 月历与时间 Sheet | 自绘组件 + 纯函数测试 | 13 项领域测试通过 |
| 分类管理 | 04, 18 | 分类管理页 | 新增/改名/排序/隐藏/恢复 | 真机待测 |
| 删除撤销 | 01, 03 | 账本撤销条 | 软删除 + 8 秒恢复 | 真机待测 |
| 月度分析 | 01, 02 | 统计页 | 对比/日均/最高日/日明细/分类下钻 | 真机待测 |
| 月度统计 | 01, 02 | 统计页 | 基础图表与分类聚合 | 领域测试通过，真机待测 |
| 游客本地优先 | 01, 06 | 首页直接使用 | SQLite 本地库 | 真机待测 |
| 微信一键登录 | 06, 11 | 登录 Sheet | 路由未实现 | 待实现 |
| 云备份 | 06, 10, 11 | 备份/恢复流程 | PostgreSQL/OSS 未实现 | 待实现 |
| 隐私删除录音 | 07 | 原型说明 | 约定内存处理 | 待集成测试 |

## 3. 变更联动

| 变化 | 必须同步 |
| --- | --- |
| 产品范围或文案 | 01 + 02/03/05 + 原型 + HANDOFF |
| 分类种子 | 04 + SQLite seed + fixture + 原型 |
| UI 组件/令牌 | design tokens + UI 稿 + 移动端 theme + 截图 |
| API/DTO | contracts + 11 + API + client + tests |
| 数据表/迁移 | 09/10 + migration + repository + tests |
| 发布流程 | 13/15 + CI/EAS 配置 |
| 里程碑完成 | HANDOFF + README + 本文件状态 |

## 4. 交付判定

文件“存在”不等于交付完成。每个资产状态必须同时具备：

- 可打开或可运行；
- 与上下游文档一致；
- 有验证命令或测试结果；
- 当前状态已写入 HANDOFF。
