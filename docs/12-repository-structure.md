# 仓库结构与开发边界

## 1. 当前目录

```text
声账/
├── AGENTS.md
├── README.md
├── docs/
├── prototype/
├── design/
├── preview/
├── apps/
│   └── mobile/
│       ├── src/app/             Expo Router 路由
│       ├── src/theme/           当前移动端设计令牌
│       ├── assets/              App 图标与启动资产
│       ├── app.json             Expo 配置
│       └── eas.json
├── services/api/
│   ├── src/providers/           语音供应商接口与 mock
│   ├── src/routes/              health、voice
│   ├── src/app.ts
│   └── src/server.ts
├── packages/
│   ├── domain/                  金额、账单、分类类型与纯逻辑
│   └── contracts/               Zod 契约
├── .github/workflows/ci.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 2. 依赖方向

```text
apps/mobile
  ├──> packages/contracts
  ├──> packages/domain
  └──> services/api (仅 HTTP)

services/api
  ├──> packages/contracts
  └──> packages/domain
```

- `domain` 保持纯 TypeScript，不依赖 React、Expo、数据库和网络。
- `contracts` 只放边界 schema、DTO 和稳定类型。
- 移动端不得导入 API 的 `src/` 实现。
- 服务端不得保存可检索的个人账单。

## 3. 移动端模块规范

- 路由文件只做页面组装，不写 SQL。
- 每个 feature 使用 `components/`, `hooks/`, `services/`, `repository.ts` 的局部结构。
- SQLite schema、迁移和 repository 集中在 `src/db/`；feature 不直接拼接 SQL。
- 网络和 SDK 调用封装在 `src/services/`，页面不直接持有密钥或 token。
- 颜色、间距、圆角、字体和阴影来自 `src/theme/tokens.ts` 或后续统一导出。
- 主按钮触控区域 ≥44×44pt；异步流程必须有 loading、empty、success、error 状态。

## 4. API 模块规范

- `routes/` 承担 HTTP 校验和响应映射。
- `providers/` 封装 ASR、LLM、微信、对象存储。
- `security/` 封装鉴权、加密、限流和日志脱敏。
- `db/` 保存 PostgreSQL schema 和 repository。
- 路由不得直接调用外部 SDK；通过 provider 接口注入，便于测试和替换。

## 5. 命令

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm dev:mobile
pnpm dev:api
pnpm run doctor
```

安装 Expo 原生模块：

```bash
pnpm --dir apps/mobile exec expo install <package>
```

不要直接手改生成的 `ios/`、`android/`；通过 Expo config plugin、`app.json` 或 EAS 配置实现原生变化。

## 6. 工程门禁

- TypeScript strict 全仓通过。
- Vitest 单元/契约测试通过。
- Expo Doctor 20/20。
- iOS/Android bundle 可导出。
- 提交前不得包含 `.env`、token、签名文件、`node_modules` 或构建产物。
- 文档与实现冲突时，以代码/迁移/契约/测试为最终事实，并同步更新文档。
