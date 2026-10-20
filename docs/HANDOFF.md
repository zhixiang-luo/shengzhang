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
- SQLite schema、首版迁移、内置分类种子和数据库 Provider 已实现。
- 账本首页可读取真实本地账单，按日期分组并显示月度收支。
- 手动新增、编辑和删除账单已接入本地数据库。
- 基础月度统计已实现每日支出柱状图和一级分类占比。
- 手动记账页支持新增一级/二级分类，并立即保存到 SQLite。
- 金额输入改为单行卡片，关闭内部滚动，长金额自动缩放。
- 移除账本右上角重复加号；空账本保留“加一笔”，非空账本通过语音面板右滑进入手动记账。
- 语音面板支持左滑取消、右滑转手动记账；真实 ASR 仍未接入。
- 手动记账的时间改为自绘月历 + 小时/分钟选择 Sheet，移除日期文本输入和格式解析。
- 分类管理页可新增一级/二级分类、改名、同级排序、隐藏和恢复；历史账单不受影响。
- 删除账单后提供 8 秒撤销，并恢复到本地 SQLite。
- 统计增加较上月、日均、最高支出日、点击每日柱状图查看当天明细、一级分类下钻二级分类。
- `expo-audio` 真机录音已接入，打开语音面板自动请求权限并开始录音。
- 录音上传到 Fastify mock `/v1/voice/parse`，返回结果映射到本地分类后以单事务写入 SQLite。
- 语音多笔结果会自动入账并弹出 8 秒整批撤销卡；音频上传后立即删除。
- 服务端已增加 SiliconFlow ASR + DeepSeek JSON 解析适配器，支持 `mock/cloud` 切换。
- 本地 `.env` 配置入口、安装 ID 和每日语音额度已实现；真实 Key 尚未填入。
- DeepSeek Key 已通过真实请求验证，示例“午饭二十五，打车十八”能稳定返回两笔结构化账单。
- SiliconFlow Key 当前被官方接口拒绝为 `Token is invalid`，真实 ASR 端到端仍待替换有效 Key。

## 当前未实现

- 真实 ASR、模型解析和语音准确率基准。
- 微信移动端登录。
- PostgreSQL、对象存储、云备份与恢复。
- 高保真 UI 页面和最终自适应图标。

## 下一步最小任务

接入真实 ASR/LLM：

1. 在根目录 `.env` 填入 SiliconFlow 和 DeepSeek Key，并把 `VOICE_PROVIDER` 改为 `cloud`。
2. 用真机完成一次真实转写与结构化入账。
3. 准备 200 条中文口语评测集并记录准确率、P50/P95。
4. 根据结果决定继续使用 SenseVoiceSmall 或切换火山/阿里 ASR。
5. 将内存额度迁移到 PostgreSQL 后再做多实例上线。

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
domain tests: 13 passed
SQLite schema: sqlite3 语法与 foreign_key_check 通过
```
