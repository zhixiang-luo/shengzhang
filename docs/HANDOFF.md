# 当前交接

> 每次阶段工作结束时覆盖本文件。临时聊天记录不能替代这里的事实。

## 当前状态

项目已从产品原型进入工程基础阶段。

## 已完成

- 产品与交互方案已确认，原型评审通过。
- 底部“记账”已改成一步录音：按下直接开始，松手识别，不再出现“语音入账”二次入口。
- 原型 19 项交互回归全部通过，12 个关键画面无横向溢出，运行时错误为 0。
- 根目录 `AGENTS.md` 已建立，作为所有 AI 的统一规则入口。
- pnpm monorepo 已创建：`apps/mobile`、`services/api`、`packages/domain`、`packages/contracts`。
- Expo 58、React Native 0.88、TypeScript 6、Expo Router、SQLite、Drizzle、Zustand 已接入。
- Fastify API 骨架、`/health` 和 mock `/v1/voice/parse` 已建立。
- 金额转换、核心领域类型和 Zod 接口契约已建立。
- 完整文档体系已落盘：`AGENTS.md`、项目上下文、09–18 技术/流程/UI 文档、资产索引。
- ESLint、TypeScript、Vitest、Expo Doctor、EAS 配置和 GitHub Actions 基础 CI 已接入。
- Expo Doctor 20/20 通过；iOS JavaScript bundle 导出成功。
- 全仓 TypeScript 检查和现有 Vitest 测试通过。

## 当前未实现

- 真实 SQLite 数据库与迁移。
- 原生账本页面、手动记账、分类和统计。
- 真实录音、ASR、模型解析。
- 微信移动端登录。
- PostgreSQL、对象存储、云备份与恢复。
- 高保真 UI 页面和最终自适应图标。

## 下一步最小任务

实现本地账本垂直切片：

1. SQLite schema 与第一版迁移。
2. 写入 PRD 中的内置支出/收入分类。
3. Transaction/Category repository。
4. 账本首页读取当日和本月账单。
5. 手动新增一笔并写入数据库。
6. 在 Expo Go 真机验证，补自动化测试并更新本文件。

## 已知风险

- 微信登录需要开放平台移动应用审核，不能只靠本地代码完成。
- 真实语音供应商需先运行 200 条固定测试集，不能凭演示决定。
- 当前机器没有完整 Xcode、Android Studio 和 Java；短期使用 Expo Go/EAS，原生微信 SDK 联调前再补齐。
- App 图标 PNG 已由品牌 SVG 生成，但 Android 自适应前景和启动页仍需高保真阶段复核。

## 最近验证

```text
prototype qa: 19/19 passed, 0 runtime errors
expo-doctor: 20/20 passed
pnpm typecheck: passed
pnpm lint: passed
pnpm test: passed
expo export --platform ios: passed
```
