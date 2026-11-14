# 仓库结构与开发边界

## 1. 当前目录

```text
声账/
├── AGENTS.md
├── README.md
├── docs/                       产品、技术、隐私、评测、调试与发布记录
├── prototype/                  已评审的 HTML 交互原型
├── design/                     设计令牌、品牌资产、截图与视频导出
├── preview/                    GitHub 浏览用预览资源
├── deploy/                     Nginx、systemd、运维脚本与官网静态站
│   └── site/                   官网 index.html、app.js、样式与产品截图
├── apps/
│   └── mobile/
│       ├── src/app/             Expo Router 路由
│       ├── src/features/        账本、语音、搜索、回顾、快捷记账等用例
│       ├── src/components/      页面组件、品牌资产与分享卡
│       ├── src/db/              SQLite schema、迁移、repository 与刷新
│       ├── src/services/        API、更新、统计、反馈与云端授权
│       ├── src/theme/           当前移动端设计令牌
│       ├── assets/              App 图标与启动资产
│       ├── app.json / app.config.js
│       └── eas.json
├── services/api/
│   ├── src/providers/           语音、视觉供应商适配与 mock
│   ├── src/routes/              health、voice、screen-bill、feedback、analytics、update
│   ├── src/config.ts            环境变量与额度配置
│   ├── scripts/                 语音、视觉与部署评测脚本
│   ├── testdata/                合成语音与虚构账单图片
│   ├── src/app.ts
│   └── src/server.ts
├── packages/
│   ├── domain/                  金额、账单、分类类型与纯逻辑
│   ├── contracts/               Zod 契约与屏幕账单 DTO
│   └── screen-capture/          Android 原生 Expo Module
│       ├── android/             TileService、AccessibilityService、浮层、同库写入
│       ├── src/                 JS 能力、状态、配置与图片导出桥
│       ├── scripts/             ADB 只读设备诊断
│       └── tools/window-probe/  临时窗口探针（不进入正式包）
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
  ├──> packages/screen-capture（仅 Android 原生能力）
  └──> services/api (仅 HTTP)

services/api
  ├──> packages/contracts
  └──> packages/domain
```

- `domain` 保持纯 TypeScript，不依赖 React、Expo、数据库和网络。
- `contracts` 只放边界 schema、DTO 和稳定类型。
- `screen-capture` 是本地 Expo Module：JS 只暴露能力、配置和状态，Kotlin 承载磁贴、无障碍浮层、截图、云端请求和同库写入。
- 移动端不得导入 API 的 `src/` 实现。
- 服务端不得保存可检索的个人账单。
- 生成的原生 `ios/`、`android/` 工程不提交；原生源码放在 `packages/screen-capture/android/`，由 CNG/autolinking 进入 EAS 构建。

## 3. 移动端模块规范

- 路由文件只做页面组装，不写 SQL。
- 纯业务规则放在 `src/features/<domain>/`，由单元测试覆盖；`search` 负责条件规范化、整数分比较和匹配语义，`review` 负责分享文案和文件名约束。
- 每个 feature 使用 `components/`, `hooks/`, `services/`, `repository.ts` 的局部结构。
- SQLite schema、迁移和 repository 集中在 `src/db/`；feature 不直接拼接 SQL。
- 网络和 SDK 调用封装在 `src/services/`，页面不直接持有密钥或 token。
- 颜色、间距、圆角、字体和阴影来自 `src/theme/tokens.ts` 或后续统一导出。
- 主按钮触控区域 ≥44×44pt；异步流程必须有 loading、empty、success、error 状态。

## 4. API 模块规范

- `routes/` 承担 HTTP 校验和响应映射。
- `providers/` 封装 ASR、LLM、截图视觉、微信、对象存储。
- `security/` 封装鉴权、加密、限流和日志脱敏。
- `db/` 保存 PostgreSQL schema 和 repository。
- 路由不得直接调用外部 SDK；通过 provider 接口注入，便于测试和替换。
- 截图视觉的供应商 Key 只在服务端；手机只调用声账 `/v1/screen-bill/parse`。

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

## 7. Android 快捷记账边界

- `minSdkVersion=30`；新增或修改 Kotlin 能力必须重新生成原生 APK/runtime，不能靠旧包 OTA 获得。
- 只有用户主动点击磁贴、系统动作或分享单图时才采集；无障碍服务只观察窗口来源，不后台遍历正文。
- 截图默认在内存中处理；云端识别必须首次单独同意，服务端不落图、不记录正文或模型输出。
- 原生直接打开主 App 的 `filesDir/SQLite/shengzhang.db`，不创建第二份数据库；写入前校验 schema 3、外键、分类和 `captureId` 幂等。
- 账本统一使用 rollback journal，短连接读取串行化并设置 `busy_timeout`；不要把 framework SQLite 与 expo-sqlite 混用 WAL。
- 不申请 `SYSTEM_ALERT_WINDOW`；`FLAG_SECURE` 和安全窗口不能绕过。
- 原生日志只允许固定阶段、错误码、来源种类、窗口结构和截图尺寸/字节，不记录金额、商户、正文或数据库路径。
- 现场诊断使用 `packages/screen-capture/scripts/device_diagnostics.py`，方法与边界见 [43](./43-android-device-debugging.md)。
