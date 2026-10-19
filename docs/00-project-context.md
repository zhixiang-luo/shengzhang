# 项目上下文

> 给新的 AI 或开发者的 5 分钟交接。详细规格通过链接读取，不在此重复。

## 产品

- 名称：声账
- 副标题：一句话语音记账
- 主张：说一句，就记好。
- 用户：中国内地 18–35 岁学生和年轻职场人。
- 核心路径：按住底部“记账”按钮 → 松手识别 → 自动入账 → 8 秒内可撤销。
- 产品范围：语音多笔、手动记账、两级分类、月度统计、游客本地数据、微信一键登录、云备份和手动恢复。
- 明确不做：实时多端同步、Web 端、扫码登录、预算、资产、转账、共享账本、自动导入、广告和会员。

产品事实来源：[PRD](./01-prd.md)、[信息架构](./02-information-architecture.md)、[用户流程](./03-user-flows.md)。

## 当前实现

| 区域 | 状态 |
| --- | --- |
| 产品原型 | 已评审；语音入口为一步录音；19/19 自动回归通过 |
| 设计基线 | tokens、小猪标记、App 图标 SVG 已完成；高保真页面待制作 |
| 移动端 | Expo 58 / React Native 0.88 / TypeScript 6 骨架，Expo Router 已接入 |
| 共享包 | 金额与领域类型、Zod 契约已建立并有测试 |
| API | Fastify 骨架、健康检查、语音 mock 路由；无真实 ASR/LLM |
| 数据库 | 数据模型已设计；本地 SQLite 与 PostgreSQL 实现尚未接入 |
| 登录/备份 | 产品与接口已设计；未实现真实微信和云存储 |

## 技术入口

- [技术架构](./09-technical-architecture.md)
- [数据模型](./10-data-model.md)
- [接口契约](./11-api-contract.md)
- [仓库结构](./12-repository-structure.md)
- [开发环境](./13-development-environment.md)
- [实施路线](./14-implementation-roadmap.md)
- [测试与发布](./15-testing-and-release.md)

## 资产入口

- 可点击原型：`prototype/index.html`
- 原型截图：`prototype/screenshots/`
- 设计令牌：`design/tokens/design-tokens.json`
- 品牌 SVG：`design/assets/`
- 移动端代码：`apps/mobile/`
- API：`services/api/`

完整索引：[资产与追踪矩阵](./17-assets-and-traceability.md)。

## 当前最小下一步

实现本地账本垂直切片：SQLite schema/迁移、内置分类种子、Transaction repository、账本列表读取和手动新增一笔。完成后以真机 Expo Go 验证，并更新 `HANDOFF.md`。
