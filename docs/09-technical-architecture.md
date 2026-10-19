# 声账技术架构

## 1. 文档信息

- 状态：MVP 技术基线
- 适用版本：0.1.x
- 最后确认：2026-10-19
- 上游事实来源：`01-prd.md`、`03-user-flows.md`、`05-voice-accounting.md`、`06-account-and-backup.md`
- 实现入口：`apps/mobile`、`services/api`、`packages/contracts`、`packages/domain`

本文档回答“怎么实现”，产品范围和交互细节仍以 PRD 与专项规格为准。技术选型发生变化时，必须新增或修改本文的 ADR，并同步 `docs/HANDOFF.md`。

## 2. 架构结论

声账采用“一套 React Native 客户端 + 轻量语音网关 + 云备份”的本地优先架构。

```text
┌──────────────────────── iPhone / Android ────────────────────────┐
│ Expo + React Native                                              │
│                                                                  │
│  Expo Router 页面                                                 │
│      │                                                           │
│      ├── feature services ──> domain rules                       │
│      ├── SQLite repository ──> 本地账本（主数据源）                │
│      ├── expo-audio ──> 录音 ──> 语音网关                         │
│      ├── SecureStore ──> 登录令牌                                  │
│      └── 文件导出 / 恢复                                           │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ HTTPS                         │ HTTPS + Bearer
                ▼                               ▼
┌──────────────────────────────┐   ┌───────────────────────────────┐
│ Voice Gateway                │   │ Account / Backup API           │
│ Fastify + TypeScript         │   │ 微信 code 换登录态              │
│ ASR -> LLM -> Schema 校验     │   │ JWT、刷新令牌、快照元数据         │
│ 限流、超时、日志脱敏            │   │ PostgreSQL + 私有对象存储        │
└──────────────┬───────────────┘   └──────────────┬────────────────┘
               │                                  │
               ▼                                  ▼
         ASR 服务 + 模型 API                  PostgreSQL / OSS / KMS
```

核心决策：

1. 移动端使用 Expo SDK 58、React Native 0.88、TypeScript 6 和 Expo Router。
2. 账本首先写入本地 SQLite；网络、登录和备份都不是记账前置条件。
3. 语音网关只接收本次录音、时区、语言和分类目录，不接收历史账单。
4. 语音链路先把音频转成文字，再让大模型输出结构化 JSON，最后由 Zod 校验。
5. 微信登录只用于建立云备份归属；MVP 的云端是快照备份，不是实时同步。
6. 服务端使用 Fastify、PostgreSQL 和私有对象存储，按账号隔离数据。
7. 服务端和客户端共用 `packages/contracts` 的边界 schema，避免接口字段漂移。

## 3. 技术栈

### 3.1 移动端

| 能力 | 选型 | 说明 |
| --- | --- | --- |
| 双端框架 | Expo 58 + React Native 0.88 | 一套 TypeScript 代码覆盖 iOS 和 Android |
| 路由 | Expo Router | 文件路由，便于页面级深层链接和测试 |
| 语言 | TypeScript 6 严格模式 | `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 已开启 |
| 本地数据库 | expo-sqlite + Drizzle ORM | 迁移可控，类型安全，支持事务 |
| 状态 | Zustand | 只存界面状态和当前会话；持久业务数据仍以 SQLite 为准 |
| 校验 | Zod 4 | 服务端响应、备份导入和表单边界统一校验 |
| 录音 | expo-audio | 16kHz 单声道 AAC/M4A，按住录音、松手停止 |
| 安全存储 | expo-secure-store | 只存访问令牌、刷新令牌和设备标识 |
| 图表 | react-native-svg 自绘 | 视觉可控，避免引入重量级图表库 |
| 动画 | react-native-reanimated | 录音、Sheet、结果卡和图表过渡 |
| 导出 | expo-file-system + expo-sharing | JSON 备份、CSV 导出 |
| 触觉 | expo-haptics | 录音开始、成功和错误反馈 |

Expo Go 可用于早期界面开发；微信 SDK、正式签名和商店构建必须使用 development build 或 EAS Build。

### 3.2 服务端

| 能力 | 选型 | 说明 |
| --- | --- | --- |
| Runtime | Node.js 22 LTS | 与 CI、容器和生产一致 |
| HTTP | Fastify 5 | 轻量、Schema 友好、便于集成测试 |
| 语言 | TypeScript 6 | ESM，构建后运行 `dist/server.js` |
| 校验 | Zod 4 | 请求、响应、配置和供应商输出校验 |
| 数据库 | PostgreSQL 16+ | 用户、令牌、备份元数据、幂等和限流 |
| 数据访问 | Drizzle ORM + SQL migration | 与移动端保持同类查询模型 |
| 对象存储 | 阿里云 OSS 或同类 S3 兼容服务 | 私有 Bucket，服务端签名访问 |
| 加密 | KMS + AES-256-GCM | 每用户数据密钥，密钥由 KMS 包装 |
| ASR | 供应商适配器，默认阿里云语音识别 | 录音文件转文字，不把音频交给 LLM |
| 结构化解析 | 供应商适配器，默认 DeepSeek 文本模型 | 文字 + 分类目录 -> JSON，严格 Schema |
| 微信登录 | 微信开放平台移动应用 | 服务端使用 code 换 openid/unionid |

语音供应商必须通过 `VoiceProvider` 接口接入。更换 ASR 或模型时只替换适配器，不改变移动端接口。

### 3.3 工具链

- pnpm 11 workspace
- Vitest
- GitHub Actions
- EAS Build / EAS Submit
- Sentry 或等价错误监控，默认关闭账单正文采集

## 4. 仓库边界

```text
apps/mobile/
  src/app/                 路由与页面壳
  src/features/            账本、统计、语音、账号等 feature
  src/components/          无业务或弱业务组件
  src/db/                  SQLite schema、迁移、repository
  src/services/            API、导出、备份编排
  src/theme/               设计令牌

packages/contracts/        Zod DTO、接口响应、备份格式
packages/domain/           金额、账单、分类、语音批次等纯规则

services/api/
  src/routes/              HTTP 路由
  src/providers/           ASR、LLM、微信、对象存储适配器
  src/db/                  PostgreSQL schema、迁移、repository
  src/security/            鉴权、加密、限流
```

依赖方向固定为 `app -> feature -> domain/contracts`。页面不得直接拼接 SQL，领域包不得依赖 React Native。

## 5. 移动端架构

### 5.1 分层

1. **页面层**：负责组合组件、处理导航和显示状态。
2. **Feature 层**：负责账本、语音、统计、分类、账号和备份的用例编排。
3. **领域层**：负责金额、分类选择、语音批次、统计聚合等纯函数。
4. **Repository 层**：封装 SQLite 查询和事务，不暴露 SQL 细节。
5. **平台适配层**：录音、文件、安全存储、分享和微信 SDK。

### 5.2 状态边界

SQLite 是账单、分类、设置和备份状态的唯一持久事实来源。Zustand 只保存：

- 当前月份、筛选和选中分类；
- 录音状态机和临时转写；
- Sheet 开关、Toast、撤销倒计时；
- 当前登录会话的 UI 投影。

应用启动流程：

```text
启动
  -> 初始化 SQLite 与迁移
  -> 读取设置、最近账单和备份状态
  -> 刷新登录令牌（若存在）
  -> 渲染账本
  -> 后台触发过期备份重试
```

启动不得等待网络。令牌刷新失败时进入游客视图，本机账本继续可读。

### 5.3 本地数据表

字段名和类型是实现基线。迁移只能向前追加。

```text
categories
  id TEXT PK
  name TEXT NOT NULL
  type TEXT CHECK(type IN ('expense','income'))
  parent_id TEXT NULL REFERENCES categories(id)
  icon TEXT NOT NULL
  color TEXT NOT NULL
  sort_order INTEGER NOT NULL
  is_preset INTEGER NOT NULL DEFAULT 0
  is_archived INTEGER NOT NULL DEFAULT 0
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL

transactions
  id TEXT PK
  type TEXT CHECK(type IN ('expense','income'))
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0)
  currency TEXT NOT NULL DEFAULT 'CNY'
  category_id TEXT NOT NULL REFERENCES categories(id)
  subcategory_id TEXT NULL REFERENCES categories(id)
  occurred_at TEXT NOT NULL
  note TEXT NOT NULL DEFAULT ''
  source TEXT CHECK(source IN ('voice','manual'))
  voice_batch_id TEXT NULL REFERENCES voice_batches(request_id)
  voice_entry_index INTEGER NULL
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
  deleted_at TEXT NULL

voice_batches
  request_id TEXT PK
  transcript TEXT NOT NULL
  entry_count INTEGER NOT NULL
  unresolved_fields TEXT NOT NULL DEFAULT '[]'
  undo_expires_at TEXT NOT NULL
  created_at TEXT NOT NULL

app_settings
  key TEXT PK
  value TEXT NOT NULL
  updated_at TEXT NOT NULL

backup_state
  id INTEGER PK CHECK(id = 1)
  status TEXT NOT NULL
  last_backup_at TEXT NULL
  last_error_code TEXT NULL
  checksum TEXT NULL

schema_migrations
  version INTEGER PK
  applied_at TEXT NOT NULL
```

实现说明：

- 金额只存整数分；展示层负责 `¥25.00`。
- `occurred_at` 存 UTC ISO 字符串；按用户本地时区计算日分组和月份。
- 删除使用软删除 `deleted_at`，统计和列表默认过滤；导出时保留删除标记或按版本清理。
- 分类归档后，历史账单继续引用原 ID，不级联删除。
- `voice_batches` 用于撤销和追踪一次语音生成的多笔账单。
- JSON 设置值必须通过对应 Zod schema 解析，不能直接信任。

### 5.4 交易写入

手动记账和语音入账统一经过 `createTransactions` 用例：

1. 校验金额、类型、分类和时间。
2. 在单个 SQLite 事务中写入批次（如为语音）和账单。
3. 提交成功后更新内存查询缓存。
4. 标记备份 `pending`。
5. 返回可撤销批次和结果摘要。

任何步骤失败都不得留下半批账单。撤销同样使用事务，只删除属于该批次且未被单独修改的条目；有修改时按 PRD 要求二次确认。

### 5.5 统计

统计在本地完成，不依赖服务端。查询以 `occurred_at` 的本地日期范围为准：

- 月总支出、收入、结余；
- 每日支出数组，缺失日期补 0；
- 一级分类汇总，下钻时按二级分类；
- 日均支出 = 当月支出 / 已过去天数，空月份显示 0；
- 最大支出日并列时取最近日期；
- 较上月变化，上月为 0 时显示“上月无记录”，不显示无限百分比。

聚合逻辑放在 `packages/domain`，SQL 只负责取数，便于固定时区和空数据测试。

### 5.6 语音交互

移动端状态机：

```text
idle -> requesting_permission -> recording -> uploading -> parsing
                                      └-> cancelled
parsing -> saving -> success
        ├-> needs_amount -> editing -> saving
        └-> failed -> retry/uploading | manual
```

- 按下立即开始，松手停止；上滑 64pt 进入取消态。
- 录音不足 300ms 提示“再按住说一句”，不发起请求。
- 最长 30 秒，客户端停止并提交。
- 上传成功后立即删除临时音频文件。
- 解析结果先通过 Zod 校验，再按分类名称解析为稳定 ID。
- 分类无法匹配时落到“其他”，但在结果卡提示可修改。
- 金额缺失时不写任何账单，进入修正面板。

### 5.7 登录与备份

- 游客数据不要求账号。
- 登录成功后，若账号无备份且本地有数据，立即创建首份快照。
- 客户端只保存短期访问令牌和刷新令牌；令牌存放在 SecureStore。
- 本地变化后 5 秒触发备份，应用进入后台时再次尝试。
- 同一时刻只允许一个上传任务；新变化只更新 pending 标记。
- 备份上传前生成规范化 JSON，计算 SHA-256，服务端复核。
- 恢复先下载到临时文件，校验 schema、checksum 和计数，再原子替换本地库。
- 本地有数据而云端也有数据时，不自动合并，要求用户明确选择。

## 6. 服务端架构

### 6.1 模块

```text
routes/health.ts         健康检查
routes/voice.ts          鉴权可选、额度校验、音频接收、调用管线
routes/auth.ts           微信 code 登录、刷新、退出
routes/backup.ts         元数据、上传、下载
providers/asr.ts         ASR 适配器接口
providers/llm.ts         结构化解析适配器接口
providers/wechat.ts      微信开放平台适配器
providers/storage.ts     私有对象存储适配器
security/                限流、加密、令牌、日志脱敏
```

### 6.2 语音解析管线

```text
请求
  -> 校验 Content-Type、文件大小、时长和字段
  -> 校验安装标识、账号可选、每日额度
  -> 写入内存或受控临时文件
  -> ASR 转写（超时 12s）
  -> 文本清洗与敏感信息最小化
  -> LLM 结构化解析（超时 10s）
  -> Zod 校验 + 业务规则修正
  -> 删除音频和临时文件
  -> 返回 transcript、entries、unresolvedFields、requestId
```

总预算目标 P95 5 秒。若 ASR 和 LLM 串行导致超时，优先优化供应商延迟、并发和短提示词；不在 MVP 中引入复杂流式 UI。

模型提示词只包含：

- 转写文本；
- 当前时间、时区和语言；
- 两级分类名称及别名；
- 输出 JSON schema；
- 最多 5 笔和“不猜金额”的硬规则。

不发送历史账单、用户身份、备注历史或设备通讯录。

### 6.3 统一错误结构

```json
{
  "error": {
    "code": "VOICE_RATE_LIMITED",
    "message": "今天的语音次数用完了，明天再试。",
    "retryable": false,
    "requestId": "uuid"
  }
}
```

稳定错误码至少包括：

- `AUDIO_REQUIRED`
- `AUDIO_EMPTY`
- `AUDIO_TOO_LARGE`
- `VOICE_RATE_LIMITED`
- `VOICE_PROVIDER_TIMEOUT`
- `VOICE_PROVIDER_UNAVAILABLE`
- `VOICE_SCHEMA_INVALID`
- `AUTH_INVALID_CODE`
- `AUTH_WECHAT_UNAVAILABLE`
- `AUTH_TOKEN_EXPIRED`
- `BACKUP_NOT_FOUND`
- `BACKUP_CHECKSUM_MISMATCH`
- `BACKUP_TOO_LARGE`

### 6.4 服务端数据表

```text
users
  id UUID PK
  wechat_open_id TEXT UNIQUE NOT NULL
  wechat_union_id TEXT NULL
  nickname TEXT NULL
  avatar_url TEXT NULL
  created_at TIMESTAMPTZ NOT NULL
  updated_at TIMESTAMPTZ NOT NULL

refresh_tokens
  id UUID PK
  user_id UUID NOT NULL REFERENCES users(id)
  token_hash TEXT NOT NULL
  expires_at TIMESTAMPTZ NOT NULL
  revoked_at TIMESTAMPTZ NULL
  created_at TIMESTAMPTZ NOT NULL

backups
  id UUID PK
  user_id UUID NOT NULL REFERENCES users(id)
  schema_version INTEGER NOT NULL
  device_id TEXT NOT NULL
  object_key TEXT NOT NULL
  checksum TEXT NOT NULL
  size_bytes BIGINT NOT NULL
  transaction_count INTEGER NOT NULL
  category_count INTEGER NOT NULL
  created_at TIMESTAMPTZ NOT NULL

voice_usage
  install_id_hash TEXT NOT NULL
  user_id UUID NULL
  usage_date DATE NOT NULL
  parse_count INTEGER NOT NULL DEFAULT 0
  PRIMARY KEY (install_id_hash, usage_date)
```

`voice_usage` 只保存安装标识的不可逆哈希，不保存原始安装 ID。限流同时考虑安装哈希、用户和 IP，防止简单绕过。

### 6.5 备份格式

```json
{
  "format": "shengzhang.backup",
  "schemaVersion": 1,
  "createdAt": "2026-10-19T12:00:00.000Z",
  "deviceId": "device-uuid",
  "counts": {
    "transactions": 128,
    "categories": 41
  },
  "data": {
    "transactions": [],
    "categories": [],
    "settings": {}
  },
  "checksum": "sha256-over-canonical-data"
}
```

服务端不接受未知 `schemaVersion`。每个版本提供纯函数迁移，迁移失败则整次恢复失败，本机原库不变。

### 6.6 鉴权与令牌

- 访问令牌：JWT，15 分钟，包含 `sub`、`sessionId` 和最小 claims。
- 刷新令牌：随机 256 位，30 天，数据库只存哈希。
- 刷新时轮换令牌；重复使用旧令牌会撤销整个会话。
- 退出登录撤销当前刷新令牌，不删除本地账本。
- 微信 AppSecret、模型密钥和对象存储密钥只存在于服务端。

## 7. 隐私与安全

1. 音频只在请求生命周期内存在，成功、失败或超时后都删除临时文件。
2. 日志白名单化；默认不记录转写、账单、备注、Token 和微信标识。
3. 备份使用每用户数据密钥加密，密钥由 KMS 包装；对象存储禁止公共读。
4. HTTPS 强制；移动端禁止明文流量，开发环境例外需显式构建配置。
5. 备份按 `userId` 做服务端授权校验，不能仅凭对象 key 下载。
6. 删除账号时先删除对象和数据库记录，再撤销令牌；MVP 可只提供本机数据删除，账号注销列入上线前必需项。
7. 依赖安全扫描和密钥扫描进入 CI 的后续阶段。

## 8. 可观测性与运维

- 每个请求生成 `requestId`，客户端结果卡可显示短码。
- 指标只记录耗时、状态码、错误码、音频大小和返回笔数。
- 不记录转写正文、账单金额、分类明细和备注。
- 健康检查区分进程存活与依赖可用。
- 告警阈值：5xx > 2%、P95 > 8s、供应商超时 > 5%、备份失败率 > 3%。
- 发布采用版本化容器镜像；数据库迁移在启动前独立执行。
- 生产环境至少保留最近 7 天日志，并配置错误聚合。

## 9. 测试策略

### 9.1 自动化

- `packages/domain`：金额、日期、分类、统计和批次撤销的 Vitest 单测。
- `packages/contracts`：Schema 正反例、未知字段和边界值。
- `services/api`：Fastify `inject` 集成测试，覆盖语音、鉴权、备份和错误码。
- `apps/mobile`：repository 测试使用临时 SQLite；关键组件使用 React Native Testing Library。
- 原型：`prototype/qa.mjs` 保持 19 个关键交互回归。
- 端到端：Maestro 覆盖首次记账、手动记账、统计和异常态；微信与真实 ASR 使用测试环境 smoke test。

### 9.2 固定语音评测集

至少 200 条真实口语，必须覆盖：

- 单笔、多笔、1–5 笔边界和 6 笔拒绝；
- 中文数字、小数、块角元、计算表达；
- 今天、昨天、前天、周几、具体日期；
- 收入表达、红包双向语义；
- 噪声、口音、吞字和同音词；
- 缺金额、多个可能金额、零金额和负数；
- 自定义分类、相似分类和别名冲突。

每次更换 ASR 或模型，都记录供应商、模型版本、提示词版本、准确率、P50/P95 和失败样本。

### 9.3 发布门禁

```bash
pnpm typecheck
pnpm test
pnpm build
```

再加：

- Android 与 iOS 真机 smoke test；
- 微信登录、备份、恢复各一次；
- 断网、超时、拒绝麦克风、额度耗尽各一次；
- 备份导出后再导入，账单数与金额完全一致。

## 10. 部署拓扑

```text
GitHub
  -> GitHub Actions: typecheck/test/build
  -> 移动端: EAS Build -> TestFlight / Android 内测
  -> 服务端: 容器镜像 -> 阿里云 ECS/ACK
       -> RDS PostgreSQL
       -> OSS 私有 Bucket
       -> KMS
       -> ASR / LLM API
```

中国内地正式发布需要域名、HTTPS 证书、ICP 备案、隐私政策和相关商店资质。若服务部署在境外，仍要评估访问速度和合规要求。

## 11. 架构决策记录

### ADR-001：React Native + Expo

- 决策：采用 Expo + React Native，而不是 Flutter 或原生双写。
- 理由：团队以 TypeScript 为主，原型、契约和服务端可共享语言；Expo Router 和 EAS 能降低双端交付成本。
- 代价：微信等原生 SDK 需要 development build 或 config plugin，不能只依赖 Expo Go。

### ADR-002：SQLite 本地优先

- 决策：本地账本是主数据源，服务端只做语音和备份。
- 理由：记账必须离线可用；避免网络失败影响核心任务；降低早期后端复杂度。
- 代价：多设备实时同步不在 MVP 内，恢复时必须处理覆盖选择。

### ADR-003：云备份采用完整快照

- 决策：每次备份上传完整、版本化、可校验的快照。
- 理由：实现简单，恢复边界清晰，适合 MVP 数据量。
- 代价：账单很大时上传成本增加；后续可切换增量同步，但必须保留快照兼容。

### ADR-004：语音分两段处理

- 决策：ASR 只做转写，LLM 只处理文字和分类，不将音频直接交给 LLM。
- 理由：便于审计、评估和更换供应商；降低模型成本和隐私暴露面。
- 代价：增加一次网络跳转，需严格控制超时。

### ADR-005：图表自绘

- 决策：使用 `react-native-svg` 实现柱状图、环形图和明细交互。
- 理由：视觉与原型高度一致，包体更小，跨端表现可控。
- 代价：需要维护基础图表组件和可访问性。

### ADR-006：微信仅移动端登录

- 决策：首版只接入微信开放平台移动应用，不做扫码和 Web 登录。
- 理由：产品首发只有移动端，减少账号体系和攻击面。
- 代价：需要微信开放平台审核和移动应用资质。

## 12. 实施顺序

1. 工程与环境：Node 22、pnpm、Expo development build、CI 通过。
2. 本地数据：迁移、分类种子、交易 repository、金额与日期单测。
3. 手动记账：账本、录入、编辑、删除和撤销。
4. 分类与统计：分类管理、月聚合、图表、日期明细。
5. 语音网关：mock provider、契约测试、真实 ASR/LLM 适配、额度与超时。
6. 移动端语音：录音状态机、上传、结果卡、修正和撤销。
7. 微信登录与备份：令牌、快照上传、恢复、冲突选择。
8. 质量与发布：200 条评测集、Maestro、EAS 构建、隐私材料和商店审核。

任何阶段都必须保持 `pnpm typecheck` 和 `pnpm test` 通过。
