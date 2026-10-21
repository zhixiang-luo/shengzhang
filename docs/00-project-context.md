# 项目上下文

> 给新的 AI 或开发者的 5 分钟交接。详细规格通过链接读取，不在此重复。

## 产品

- 名称：声账
- 副标题：一句话语音记账
- 主张：说一句，就记好。
- 用户：中国内地 18–35 岁学生和年轻职场人。
- 核心路径：按住底部“记账”按钮 → 松手识别 → 自动入账 → 8 秒内可撤销。
- 产品范围：语音多笔、手动记账、两级分类、月度统计、游客本地数据、微信一键登录、云备份和手动恢复。
- MVP 明确不做：实时多端同步、Web 端、扫码登录、预算、资产、转账、共享账本、自动导入和广告。
- 后期方向：可信语音、月末回顾、数据安全品牌；会员与分享按阶段门禁验证，见 [后期产品战略](./21-post-mvp-strategy.md)。
- 开源方式：MIT License，代码公开用于个人作品展示、用户透明度和社区下载；APK 通过 GitHub Releases 分发，不提交进 Git 历史。

产品事实来源：[PRD](./01-prd.md)、[信息架构](./02-information-architecture.md)、[用户流程](./03-user-flows.md)。

## 当前实现

| 区域 | 状态 |
| --- | --- |
| 产品原型 | 已评审；语音入口为一步录音；19/19 自动回归通过 |
| 设计基线 | tokens、小猪标记、App 图标 SVG 已完成；高保真页面待制作 |
| 移动端 | 本地账本、手动记账、分类、统计、真实流式语音和结果卡已接入 |
| 共享包 | 金额、日期、分类、统计和语音 DTO 已建立并有测试 |
| API | Fastify 网关、火山流式 ASR、SiliconFlow 备用和 DeepSeek 结构化已接入 |
| 数据库 | 本地 SQLite 已实现；PostgreSQL、云备份和恢复未实现 |
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

1. 在真机验证 M7 可信主路径：自动保存、8 秒撤销、失败重试和异常修正。
2. 录制 30–50 条真人语音并完成 iOS/Android 真机矩阵。
3. 推进不依赖账号和支付的 M8 月度回顾与隐私可控分享。
4. 微信登录、云备份、微信/支付宝支付和会员在外部主体与审核就绪后再启动。

每个阶段完成后必须更新 [当前交接](./HANDOFF.md) 和 [实施路线图](./14-implementation-roadmap.md)。
