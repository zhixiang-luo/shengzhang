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
- 语音面板支持左滑取消、右滑转手动记账；真实 ASR 已接通。
- 手动记账的时间改为自绘月历 + 小时/分钟选择 Sheet，移除日期文本输入和格式解析。
- 分类管理页可新增一级/二级分类、改名、同级排序、隐藏和恢复；历史账单不受影响。
- 删除账单后提供 8 秒撤销，并恢复到本地 SQLite。
- 统计增加较上月、日均、最高支出日、点击每日柱状图查看当天明细、一级分类下钻二级分类。
- `expo-audio` 真机录音已接入，打开语音面板自动请求权限并开始录音。
- 录音上传到 Fastify `/v1/voice/parse`，结果映射到本地分类后以单事务写入 SQLite；服务端支持 `mock/cloud` 两种供应商。
- 语音多笔结果先进入单个确认卡，确认后写入并立即关闭；音频在请求结束后删除。
- 服务端保留 SiliconFlow ASR + DeepSeek JSON 解析 HTTP 备用适配器，支持 `mock/cloud` 切换。
- 本地 `.env` 配置入口、安装 ID 和每日语音额度已实现；火山流式 ASR、SiliconFlow 备用和 DeepSeek Key 均已验证。
- DeepSeek Key 已通过真实请求验证，示例“午饭二十五，打车十八”能稳定返回两笔结构化账单。
- 服务已切换到 SiliconFlow 国内站 `https://api.siliconflow.cn/v1`，国内站 Key 已验证通过。
- SiliconFlow HTTP 备用模型为 Qwen3-ASR-1.7B（约 ¥0.79/小时）；同一 1 秒音频块实测约 0.24–0.28 秒。
- 已实测免费的 XingChenASR-V3.2-Ultra：准确率与 Qwen3 相当，但 1.15 秒音频块延迟 0.72–8.85 秒波动过大，因此未切换默认模型。
- 真实中文端到端已通过：测试音频“午饭二十五，打车十八”被转写为“午饭25、打车18”，解析为餐饮/午餐 25 元和交通/打车 18 元，两笔同时返回；整条 `/v1/voice/parse` 首测约 3.9 秒、热请求复测约 1.46 秒。
- 供应商冷启动曾出现约 24 秒、热请求约 0.4–0.8 秒的波动；ASR 超时已提高到 30 秒，并将供应商超时映射为明确的 503 业务错误，避免直接暴露通用 500。
- Expo Go 真机联调发现：React Native 0.88 不接受旧的 `{ uri, name, type }` FormData 文件写法；客户端已改用 `expo/fetch` + `expo-file-system` 的 `File` 上传。
- 手机端旧版录音流程只更新计时，不会自动提交；现已改为检测一句话结束并自动提交，同时保留手动结束按钮。
- SiliconFlow 国内站曾返回 `402 / account balance is insufficient`。控制台显示 SenseVoiceSmall 免费，但账户余额为 0 时仍无法调用；充值后真机请求已恢复成功。
- 语音入口已按确认后的产品交互重做：按住中央按钮开始录音；火山 WebSocket 双向流式返回字幕；上滑 36pt 松手取消；向右滑进入手动记账；正常松手提交火山最终文字。
- 实时链路为手机 PCM → `/v1/voice/stream` WebSocket → 火山 `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel`，网关回传 `ready/partial/final/error`。
- 松手后把浮层最后一版文字 POST 到 `/v1/voice/parse-transcript`，直接做 DeepSeek 结构化；实时文字为空则视为取消。
- 语音结构化结果先进入 `VoiceResultSheet` 草稿确认卡；用户点“确认记账”后才写入 SQLite，“撤销”会丢弃草稿。
- 真机已验证按住手势、WAV 实时录制和连续 4 次字幕刷新；松手后完整链路返回成功。文字直连结构化接口的本机测试约 1.04 秒返回两笔账。
- 上滑 36pt 进入取消态，向下回到 16pt 内恢复；右滑 48pt 进入手动记账态，浮层和按钮同步点亮。空实时文字直接关闭浮层，不再进入结构化。
- 结果卡收敛为一个弹窗：左侧“撤销”丢弃草稿，右侧“确认记账”保存并立即关闭；确认后不再出现第二个弹窗。
- 结果卡合计统一使用 `summarizeAmounts`：纯支出时显示负合计，例如 26 元 + 174 元显示为 `合计 −¥200`，与逐笔金额符号一致。
- 浮层光标在无实时文字时位于提示语开头；录音中麦克风图标持续呼吸，波形根据 PCM 音量实时跳动。
- 火山真实 Key 已通过 WebSocket 验证：2.3 秒音频约 1 秒开始出现“午饭”，之后持续更新，最终返回“午饭25，打车18。”。
- SiliconFlow HTTP 备用路径已验证；React Native 的 Blob 不支持从 ArrayBuffer 创建，因此备用上传使用临时 WAV 文件。
- 滑动闪动的根因是父组件每次状态更新都会重建 PanResponder；现已把回调存入 ref，手势实例全程只创建一次，并采用 36pt 取消区/16pt 回退线、48pt 手动态/24pt 回退线。

## 当前未实现

- 200 条中文生活口语测试集、准确率基准和 P50/P95 延迟统计。
- 微信移动端登录。
- PostgreSQL、对象存储、云备份与恢复。
- 高保真 UI 页面和最终自适应图标。

## 下一步最小任务（M5）

1. 建立并版本化 200 条中文生活口语评测集。
2. 用火山流式 ASR + DeepSeek 跑金额、收支类型、一级分类、多笔完整性和日期指标。
3. 记录首字延迟、最终文字延迟和结构化总耗时 P50/P95。
4. 修复评测暴露的 P0/P1 问题，冻结内测候选版本。
5. M4 微信登录和云备份在 AppID、PostgreSQL、对象存储与 HTTPS 域名就绪后启动。

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
