# AI 供应商配置与 ASR 调研

## 1. 当前结论

MVP 采用：

```text
iOS / Android 录音
  -> 自有 Fastify 网关
  -> SiliconFlow ASR（SenseVoiceSmall）
  -> DeepSeek JSON 结构化解析
  -> 返回通过 Zod 校验的账单
```

这条链路在客户端只有一个稳定接口 `/v1/voice/parse`。以后替换为火山引擎或其他流式 ASR 时，移动端不需要改协议。

## 2. Key 放在哪里

不需要给终端用户做 Key 管理页。DeepSeek 和 ASR 的密钥只属于服务端：

| 环境 | 配置位置 |
| --- | --- |
| 本地开发 | 项目根目录 `.env`，已被 Git 忽略 |
| CI/CD | GitHub Actions Secrets 或部署平台 Secret |
| 生产 | 阿里云 KMS、Secrets Manager 或容器 Secret |

用户手机、Expo 配置和 `EXPO_PUBLIC_*` 变量中都不得出现这两个 Key。

本地操作：

1. 打开项目根目录的 `.env`。
2. 填写 `DEEPSEEK_API_KEY`。
3. 填写 `SILICONFLOW_API_KEY`。
4. 将 `VOICE_PROVIDER=mock` 改为 `VOICE_PROVIDER=cloud`。
5. 重启 `pnpm dev:api`。

需要的变量：

```dotenv
VOICE_PROVIDER=cloud
VOICE_DAILY_LIMIT=20
SILICONFLOW_API_KEY=sk-...
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_ASR_MODEL=FunAudioLLM/SenseVoiceSmall
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

当前 `.env` 已创建但保持 `VOICE_PROVIDER=mock`。在填入有效 Key 之前，不会产生真实供应商费用。

## 3. 多用户如何共用

不是让 100 或 1000 个用户各填一个 DeepSeek Key，而是：

1. 项目持有一个服务端 DeepSeek Key。
2. 所有用户请求经过自有 API 网关。
3. 网关按匿名安装 ID、未来登录用户 ID 和 IP 做限流。
4. 网关注入固定提示词、分类目录和当前时间。
5. 网关统一校验模型输出，客户端只拿到规范化账单。

当前本地代码已实现每个安装每天 20 次语音额度。正式上线前，额度计数必须从单进程内存迁移到 PostgreSQL，保证多实例部署、重启和风控时一致。

### 100–1000 用户部署建议

- API 至少 2 个实例，前置于负载均衡。
- PostgreSQL 记录用户、安装、额度、语音请求 ID 和错误码。
- 对象存储不保存音频；网关只使用临时内存或受控临时文件。
- 每个请求设置 ASR 15 秒、LLM 10 秒超时和整体 30 秒上限。
- 按供应商速率配置并发上限，超过后排队或返回可重试提示。
- 监控每日调用数、ASR 耗时、LLM 耗时、Token 用量、失败率、额度命中率和成本。
- 设置每日总成本告警，避免单个 Key 被滥用。
- 用户进入正式账号体系后，限流键从安装 ID 迁移为 `userId + installationId`。

## 4. ASR 调研

数据核对时间：2026-10-20。公开价格和指标可能调整，采购前需要在控制台复核。

| 服务 | 形态 | 优点 | 代价/风险 | 当前结论 |
| --- | --- | --- | --- | --- |
| SiliconFlow + SenseVoiceSmall | 文件转写 HTTP | OpenAI 兼容，接入简单；提供中文模型，单个 Key 即可 | 当前为录音结束后批量转写，不是原生流式 | 作为 MVP 首选 |
| 火山引擎豆包语音 | 录音文件 / 流式 ASR | 大模型识别、丰富语音能力；公开检索到的官方计费资料显示录音文件识别约 ¥0.8/小时、流式识别约 ¥1/小时 | 签名和账号配置更复杂，需要更多联调 | 作为流式升级首选候选 |
| 阿里云智能语音交互 | 实时 / 一句话 / 文件 | 产品成熟，支持 16k 实时 WebSocket；官方页面称通用字准确率 90% 以上，部分模型更高 | 产品线多，模型和计费方式需要仔细选型 | 作为企业级备选 |
| 腾讯云语音识别 | 实时 / 一句话 / 文件 | 云生态完整，国内节点和服务保障成熟 | 与火山/阿里相比没有足够公开数据证明体验优势 | 备选 |
| 讯飞开放平台 | 实时听写 / 文件转写 | 中文语音积累深，公开评测常列第一梯队 | 接入和商务流程较重 | 高精度备选 |

### 为什么 MVP 先用 SiliconFlow

- 官方接口为 `POST /v1/audio/transcriptions`，与 OpenAI 语音接口一致。
- 支持 `FunAudioLLM/SenseVoiceSmall` 与 `TeleAI/TeleSpeechASR`，可以在不改客户端的情况下切换模型。
- 不需要实现云厂商复杂的签名协议，适合当前 8–10 周 MVP。
- 录音结束后上传，适合目前的“点击完成”交互。

这并不代表它是长期最优。最终必须用项目自己的 200 条中文生活口语测试集比较字错率、金额数字、分类词、延迟和成本。

### 后续流式升级

如果首轮内测发现端到端时间不达标，下一版切换火山引擎流式 ASR：

- 保持 `/v1/voice/parse` 对客户端不变。
- 网关增加 WebSocket/SSE 流式内部实现。
- 客户端可显示实时字幕，但账单仍以最终结构化结果为准。
- 通过按钮结束录音并完成最终 JSON 解析。

## 5. DeepSeek 解析规则

- 使用 `deepseek-chat` 与 `response_format={"type":"json_object"}`。
- 模型只接收本次转写、时区、当前时间和启用分类名称。
- 不传历史账单、用户身份、录音和通讯录。
- 金额缺失输出 `null`，禁止猜测。
- 输出必须通过 Zod 校验；未知字段、超过 5 笔或结构错误直接失败。
- 模型温度 0.1，减少分类和金额漂移。

## 6. 官方资料

- SiliconFlow 语音转写：https://api-docs.siliconflow.cn/docs/api/audio-transcriptions-post
- DeepSeek Chat Completion：https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
- 火山引擎语音识别产品：https://www.volcengine.com/product/voice-tech
- 阿里云智能语音交互：https://www.aliyun.com/product/nls

公开评测、博客和营销文章只用于候选筛选，不作为最终准确率依据。项目自己的固定测试集才是上线门槛。
