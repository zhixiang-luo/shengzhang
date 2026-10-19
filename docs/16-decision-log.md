# 架构决策记录

ADR-001 至 ADR-006 的基线定义在 [技术架构](./09-technical-architecture.md#11-架构决策记录)，本文件不重复。以下只记录跨产品、工程和文档流程的新增决策。新决策追加而不覆盖历史。

## 已确定

| ID | 决策 | 理由 | 影响 |
| --- | --- | --- | --- |
| ADR-007 | pnpm workspace 单仓 | 共享契约、统一 CI、方便其他 AI 接手 | 需要正确配置 Expo monorepo |
| ADR-008 | `AGENTS.md` 为唯一 AI 规则源 | 避免 `magent.md`、`CLAUDE.md` 等重复冲突 | 详细规格放 docs，不写进规则文件 |
| ADR-009 | 原型用 HTML/CSS/JS 手工编码 | 状态流转可点击、易评审、零构建 | 原型不是生产代码 |
| ADR-010 | 不引入 Redis | MVP 单服务、低并发，PostgreSQL 原子计数足够 | 扩容后再评估 |
| ADR-011 | 先用 Expo Go/EAS，后装原生工具链 | 避免早期下载数十 GB 工具；现有代码可直接启动 | 原生微信 SDK 联调前仍需 Xcode/Android Studio |
| ADR-012 | 以仓库文档而非聊天摘要作为事实 | 支持多 AI 接力与审计 | 每阶段必须更新 HANDOFF 和追踪矩阵 |

## 待定

| ID | 问题 | 决策门槛 |
| --- | --- | --- |
| TBD-001 | 阿里云 ASR 是否最终采用 | 200 条测试集、延迟、价格、合规 |
| TBD-002 | DeepSeek 是否最终采用 | 结构化成功率、金额/分类准确率、成本 |
| TBD-003 | 图标最终外观 | 高保真 UI 评审 |
| TBD-004 | 国内安卓首发商店范围 | 开发者账号、渠道成本、审核周期 |
| TBD-005 | 备份客户端加密方案 | 恢复体验、密钥丢失风险、隐私要求 |

## 追加模板

```text
### ADR-XXX：标题

- 日期：
- 状态：proposed / accepted / superseded
- 背景：
- 决策：
- 替代方案：
- 代价：
- 需要同步的文件：
```

任何标为 accepted 的决策必须更新 `docs/09-technical-architecture.md` 或对应专项文档。
