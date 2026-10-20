# 声账

> 说一句，就记好。

声账是一款面向中国内地年轻个人用户的语音优先记账应用。产品以“按住说一句，账单自动生成”为核心体验，只保留完成日常记账所需的最少步骤，并提供清晰、克制的月度统计与分类能力。

## 当前阶段

项目处于 **M3 语音链路：mock 闭环已完成，真实供应商待接入**。

- [x] 产品定位与 MVP 范围
- [x] 核心业务流程
- [x] 微信一键登录与云备份策略
- [x] 可点击产品原型评审
- [x] 技术方案与仓库结构
- [x] UI 交付规范与设计令牌
- [ ] 高保真页面导出
- [x] 本地 SQLite、分类种子与手动记账
- [x] 分类新增、改名、排序、隐藏与恢复
- [x] 删除撤销、完整月度统计和日期时间选择
- [x] Android Expo Go 真机反馈与修复
- [x] 真实录音、mock 解析、多笔批量入账与撤销
- [ ] iOS 真机验收
- [ ] 真实 ASR/LLM、微信登录与云备份

## 产品原则

- 语音是主路径，手动记账是稳定兜底。
- 本地优先，游客无需登录即可完成首次记账。
- 微信登录用于开启云备份，不承诺实时多端同步。
- 温暖克制，不做游戏化、广告和复杂资产系统。
- 首版聚焦：语音多笔记账、手动记账、两级分类、月度统计、云备份。

## 项目结构

```text
声账/
├── docs/         产品需求、流程、分类与接口约定
├── prototype/    可点击的中保真产品原型
├── design/       高保真 UI、设计令牌、图标与导出图
├── preview/      面向 GitHub 浏览的预览入口
├── apps/mobile/  Expo + React Native 双端应用
├── services/api/ 语音、微信登录与云备份网关
└── packages/     跨端领域模型与接口契约
```

## 技术栈

- React Native 0.88 + Expo 58 + TypeScript 6
- Expo Router、SQLite、Drizzle ORM、Zustand
- Node.js 22 + Fastify + Zod + PostgreSQL
- pnpm workspace；EAS Build；GitHub Actions

详细架构、目录边界、数据模型和接口契约见 `docs/09-technical-architecture.md`。所有 AI 协作先读根目录 `AGENTS.md` 和 `docs/HANDOFF.md`，完整索引见 `docs/README.md`。

## 常用命令

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm run doctor
pnpm dev:mobile
pnpm dev:api
```

移动端第一阶段可直接使用 Expo Go 真机预览。真实微信 SDK 和商店构建将在外部账号就绪后使用 EAS Build。

## 开启真实 AI

在项目根目录 `.env` 填入 `DEEPSEEK_API_KEY` 和 `SILICONFLOW_API_KEY`，然后把 `VOICE_PROVIDER=mock` 改为 `cloud`，重启 `pnpm dev:api`。密钥只在服务端使用，不能写入移动端。

详细配置、额度、多用户部署和 ASR 对比见 `docs/19-ai-providers.md`。

## 查看原型

原型不依赖构建工具。进入 `prototype/` 后直接打开 `index.html`，或使用任意静态文件服务器：

```bash
cd prototype
python3 -m http.server 4173
```

随后访问 `http://localhost:4173`。

## 分支与提交约定

- `main`：可展示、可运行、通过评审的版本
- `design/`：原型与 UI 迭代分支
- `feature/*`：后续功能开发分支

提交信息建议使用 `feat:`, `fix:`, `docs:`, `design:`, `chore:` 前缀。

## 隐私

产品原型使用模拟数据，不收集真实账本、录音或微信身份信息。正式应用的数据与隐私方案以 `docs/` 中的设计为准。
