# AI 供应商配置与 ASR 调研

## 1. 当前结论

MVP 采用：

```text
iOS / Android 录音
  -> 自有 Fastify 网关
  -> 火山大模型双向流式 ASR（WebSocket）
  -> DeepSeek JSON 结构化解析
  -> 返回通过 Zod 校验的账单
```

客户端通过 `/v1/voice/stream` 持续发送 16kHz PCM，网关转发到火山 WebSocket 并把增量文字回传给浮层；松手后只把最终文字提交给 DeepSeek。

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
3. 填写 `VOLCENGINE_ASR_API_KEY`。
4. 设置 `VOICE_PROVIDER=cloud`、`ASR_PROVIDER=volcano`。
5. 重启 `pnpm dev:api`。

需要的变量：

```dotenv
VOICE_PROVIDER=cloud
ASR_PROVIDER=volcano
VOICE_DAILY_LIMIT=20
VOICE_PARTIAL_DAILY_LIMIT=300
VOICE_IP_MINUTE_LIMIT=30
VOICE_IP_DAILY_LIMIT=600
VOICE_GLOBAL_MINUTE_LIMIT=120
VOICE_GLOBAL_DAILY_LIMIT=5000
VOLCENGINE_ASR_API_KEY=...
VOLCENGINE_ASR_RESOURCE_ID=volc.seedasr.sauc.duration
SILICONFLOW_API_KEY=sk-...
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_ASR_MODEL=Qwen/Qwen3-ASR-1.7B
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

当前 `.env` 使用火山流式 ASR 与 DeepSeek；SiliconFlow Key 保留为 HTTP 备用路径。

## 3. 多用户如何共用

不是让 100 或 1000 个用户各填一个 DeepSeek Key，而是：

1. 项目持有一个服务端 DeepSeek Key。
2. 所有用户请求经过自有 API 网关。
3. 网关按匿名安装 ID、未来登录用户 ID 和 IP 做限流。
4. 网关注入固定提示词、分类目录和当前时间。
5. 网关统一校验模型输出，客户端只拿到规范化账单。

当前本地代码已实现每个安装每天 20 次语音额度。正式上线前，额度计数必须从单进程内存迁移到 PostgreSQL，保证多实例部署、重启和风控时一致。

### 成本与滥用防线

单一安装 ID 额度可以由攻击者伪造，因此线上语音链路同时实施四层应用限制：

| 层级 | 默认值 | 目的 |
| --- | --- | --- |
| 单安装每日完整解析 | 20 次 | 保证正常个人使用 |
| 单 IP 每分钟 | 30 次 | 兼顾共享网络并拦截脚本突发请求 |
| 单 IP 每日 | 600 次 | 限制同一网络长期刷量 |
| 全服务每分钟 | 120 次 | 防止瞬时并发拖垮服务 |
| 全服务每日 | 5000 次 | 面向千级注册用户形成成本上限 |

WebSocket 另外限制：

- 单 IP 最多 8 条并发语音连接；
- 全服务最多 80 条并发语音连接；
- 单次音频最多 30 秒、960,000 字节；
- 单次会话最长 32 秒。

Nginx 在应用层之前再执行每 IP `30r/m` 与 5 条连接限制。应用内部计数在当前单实例阶段保存在内存中，服务重启会清零；扩容前必须迁移到 PostgreSQL 或 Redis。无论限流如何配置，都应在火山、DeepSeek 和 SiliconFlow 控制台设置余额告警与硬预算。

### 100–1000 用户部署建议

- API 至少 2 个实例，前置于负载均衡。
- PostgreSQL 记录用户、安装、额度、语音请求 ID 和错误码。
- 对象存储不保存音频；网关只使用临时内存或受控临时文件。
- 每个请求设置 ASR 30 秒、LLM 10 秒超时；供应商超时统一返回 `VOICE_PROVIDER_TIMEOUT`，客户端提示用户重试。
- 按供应商速率配置并发上限，超过后排队或返回可重试提示。
- 监控每日调用数、ASR 耗时、LLM 耗时、Token 用量、失败率、额度命中率和成本。
- 设置每日总成本告警，避免单个 Key 被滥用。
- 用户进入正式账号体系后，限流键从安装 ID 迁移为 `userId + installationId`。

当前可重复运行的 ASR 情景看板：

```bash
pnpm --filter @shengzhang/api voice:cost
```

产物为 `services/api/testdata/voice/cost-report.json`。公式、遗漏项和会员定价风险见 [成本与定价模型](./24-cost-model.md)。

## 4. ASR 调研

数据核对时间：2026-10-20。公开价格和指标可能调整，采购前需要在控制台复核。

| 服务 | 形态 | 优点 | 代价/风险 | 当前结论 |
| --- | --- | --- | --- | --- |
| SiliconFlow + Qwen3-ASR-1.7B | 文件转写 HTTP | 国内站按音频时长计费约 ¥0.79/小时；实测 1 秒音频块约 0.24–0.28 秒，延迟稳定 | 不是原生 token 流；仍需用项目口语集验证数字和分类词 | 实时字幕默认模型 |
| SiliconFlow + SenseVoiceSmall | 文件转写 HTTP | 国内站显示免费；OpenAI 兼容，接入简单；中文和粤语优化 | 实测同一音频块 0.31–4.41 秒，延迟波动明显 | 成本优先时的备选 |
| SiliconFlow + XingChenASR-V3.2-Ultra | 文件转写 HTTP | 当前免费；测试语句金额和分类词准确；会把数字规整成阿拉伯数字 | 1.15 秒音频块实测 0.72–8.85 秒，2.3 秒音频 1.64–6.11 秒，波动过大 | 不建议用于实时字幕；可作为离线/低并发备选 |
| 火山引擎豆包语音 | 录音文件 / 流式 ASR | 双向 WebSocket 可逐段返回文字；实测 2.3 秒音频从约 1 秒开始持续出字，最终结果正确 | 需要控制台 API Key、资源 ID 和二进制协议适配 | 当前默认 |
| 阿里云智能语音交互 | 实时 / 一句话 / 文件 | 产品成熟，支持 16k 实时 WebSocket；官方页面称通用字准确率 90% 以上，部分模型更高 | 产品线多，模型和计费方式需要仔细选型 | 作为企业级备选 |
| 腾讯云语音识别 | 实时 / 一句话 / 文件 | 云生态完整，国内节点和服务保障成熟 | 与火山/阿里相比没有足够公开数据证明体验优势 | 备选 |
| 讯飞开放平台 | 实时听写 / 文件转写 | 中文语音积累深，公开评测常列第一梯队 | 接入和商务流程较重 | 高精度备选 |

### 当前默认：火山大模型双向流式 ASR

- 新版控制台使用 `X-Api-Key` + `X-Api-Resource-Id`，不需要火山账号 AK/SK。
- 默认小时版资源：`volc.seedasr.sauc.duration`。
- 网关连接 `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel`，手机每 100–200ms 发送 PCM。
- 火山返回累计文字，客户端直接替换字幕，不再需要拼接分块或去重。
- 最终负包发出后，网关等待最后一段结果并通过 `final` 事件返回完整文字。

### HTTP 备用：SiliconFlow 国内站

- 官方接口为 `POST /v1/audio/transcriptions`，与 OpenAI 语音接口一致。
- 默认使用 `Qwen/Qwen3-ASR-1.7B`，按秒计费约 ¥0.79/小时，实测短音频延迟比 SenseVoiceSmall 更稳定。
- 一次 5 秒记账约 ¥0.0011；按每人每天 20 次估算约 ¥0.66/人/月，100 人约 ¥66/月，1000 人约 ¥660/月（分块重叠会增加少量音频时长）。
- 两个模型共用同一套服务端接口，后续只改 `SILICONFLOW_ASR_MODEL`，移动端无需改协议。
- 不需要实现云厂商复杂的签名协议，适合当前 8–10 周 MVP。
- 录音结束后上传，适合目前的“点击完成”交互。
- 实时字幕使用 16kHz PCM 分块：1.15 秒窗口、0.25 秒重叠、并行转写、按序合并。它比整段快照更稳定，第一段文字通常 1–2 秒内出现；但 SiliconFlow 仍没有原生流式转写接口，因此不是逐字 token 流。要完全达到微信式逐字体验，需要切换到原生语音识别或 WebSocket 流式 ASR。
- 页面进入后会发送一次 0.3 秒静音预热请求，降低首次真人说话时遇到模型冷启动的概率。
- 国际站 `.com` 与国内站 `.cn` 的 Key 不通用；本项目固定使用 `https://api.siliconflow.cn/v1` 和国内站 Key。

这对低预算阶段更实用，但不代表它是长期最优。最终必须用项目自己的 200 条中文生活口语测试集比较字错率、金额数字、分类词、延迟和成本。

2026-10-20 的首轮真实联调结果：

- 火山双向流式接口已用真实 Key 验证：2.3 秒语音约 1 秒开始返回“午饭”，随后持续更新为“午饭25”“午饭2十五打车”，最终为“午饭25，打车18。”。
- 测试语句“午饭二十五，打车十八”，Qwen3-ASR 返回“午饭25打车18。”。
- Qwen3-ASR 三次热请求约 0.24–0.28 秒；SenseVoiceSmall 同条件为 0.31–4.41 秒。
- XingChenASR-V3.2-Ultra 同一 1.15 秒音频块四次为 0.72、8.85、6.92、3.03 秒；2.3 秒音频为 1.64–6.11 秒。
- 8.3 秒复杂句“昨天中午买咖啡花了三十二块五……”：Qwen3 约 0.56 秒，XingChen 约 2.54 秒；两者都正确识别了日期、三个金额和消费对象。
- Qwen3 的中文数字文本经过 DeepSeek 后正确拆成 32.50 元咖啡、18.00 元打车、46.80 元买菜三笔，日期分别落到昨天中午、下午和晚上。
- 同一音频的 Qwen3-ASR-1.7B 热请求约 0.33 秒，识别文本一致。
- 结果正确拆为两笔：餐饮/午餐 25.00 元、交通/打车 18.00 元。
- 当前只验证了单条清晰合成语音，不能替代真机、多口音和嘈杂环境的批量评测。

### 流式实现说明

- 手机 → 网关：二进制 PCM WebSocket。
- 网关 → 火山：官方 `/api/v3/sauc/bigmodel` WebSocket。
- 网关向手机发送 `ready`、`partial`、`final` 和 `error` 四类 JSON 事件。
- 松手后客户端发送 `{"type":"stop"}`，用最终 cumulative transcript 做结构化。

## 5. DeepSeek 解析规则

- 使用 `deepseek-chat` 与 `response_format={"type":"json_object"}`。
- 模型只接收本次转写、时区、当前时间和启用分类名称。
- 不传历史账单、用户身份、录音和通讯录。
- 金额缺失输出 `null`，禁止猜测。
- 输出必须通过 Zod 校验；未知字段、超过 5 笔或结构错误直接失败。
- 模型温度 0.1，减少分类和金额漂移。

## 6. 官方资料

- SiliconFlow 语音转写：https://api-docs.siliconflow.cn/docs/api/audio-transcriptions-post
- SiliconFlow 国内站价格：https://www.siliconflow.cn/pricing
- DeepSeek Chat Completion：https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
- 火山引擎语音识别产品：https://www.volcengine.com/product/voice-tech
- 阿里云智能语音交互：https://www.aliyun.com/product/nls

公开评测、博客和营销文章只用于候选筛选，不作为最终准确率依据。项目自己的固定测试集才是上线门槛。

## 7. 独立的截图视觉识别（0.3.2）

视觉不复用 DeepSeek 语音文字解析。独立 OpenAI 兼容适配器调用 `/chat/completions`，JSON 输出、temperature=0、max_tokens=700、15 秒超时；服务器再做金额标签、交易状态、币种、分类和时间校验。后续可换模型/供应商而不改手机契约。

```dotenv
SCREEN_VISION_ENABLED=false
SCREEN_VISION_BASE_URL=https://api.deepseek.com
SCREEN_VISION_MODEL=deepseek-flash
DEEPSEEK_API_KEY=
SCREEN_VISION_API_KEY=
SCREEN_VISION_DAILY_LIMIT=20
SCREEN_VISION_GLOBAL_DAILY_LIMIT=500
SCREEN_VISION_IP_MINUTE_LIMIT=10
```

默认地址/模型现为 DeepSeek Flash，源码环境默认停用；服务端显式配置仍优先。SCREEN_VISION_API_KEY 可指定专用凭证；只有精确官方北京/旧 DashScope 地址才读取 DASHSCOPE_API_KEY，只有与 SILICONFLOW_BASE_URL 相同才复用硅基 Key，只有官方 api.deepseek.com 地址才复用 DEEPSEEK_API_KEY；其他地址不带任何供应商 Key。DeepSeek 请求使用 `thinking:{type:"disabled"}`，千问官方地址使用 `enable_thinking:false`。生产与合成评测共用 resolveScreenVisionCredentials，防脚本跨域泄密。手机首次启用同意后直接云端，可关闭；服务端停用开关独立。

2026-11-14 对比：12 张合成账单上 DeepSeek Flash 与千问 3.8 27B 金额均为 12/12，平均耗时约 1.06s 对 2.81s。样本只覆盖金额/拒识，不代表真实微信、支付宝页面的商户、时间、分类和失败单准确率；切换后仍需真实页面抽测。

### 7.1 已执行的小样

`services/api/scripts/screen-vision-eval.ts` 对 6 张虚构中文账单比较 8B 与 32B：小数金额、原价/优惠、账户余额、金额缺失、失败交易和仅商户。结果位于 `services/api/testdata/screen-bill/synthetic-eval.json`。

| 模型 | 本轮结果 | 耗时 |
| --- | --- | --- |
| Qwen3-VL-8B-Instruct | 6/6 金额或拒识符合预期，没有编造未显示商品 | 2.211–7.601 秒 |
| Qwen3-VL-32B-Instruct | 4 项正确，2 项在 30 秒测试超时 | 成功项 3.883–6.520 秒 |

上一版线上曾选择 8B；2026-11-14 已切到 DeepSeek Flash。此结果只有 6 张合成图片，不是微信/支付宝/银行模板准确率，不足以证明 8B 普遍优于 32B。编译后 API→真实模型的合成链路另验证过 HTTP 200、2658 分与页面时间，记录见 endpoint-smoke.json；服务器/公网的最终状态见 [38](./38-quick-accounting-validation.md)。

### 7.2 数据与费用边界

2026-11-13 阅读[硅基流动官方隐私政策](https://docs.siliconflow.cn/docs/legals/privacy-policy)及[摘要](https://docs.siliconflow.cn/docs/legals/privacy-policy-summary)：API 业务数据仅短暂推理、不长期存储、不用于预训练/微调等商业用途；输入输出有自动化安全审核，API 有调用/计费日志；个人信息按政策存于境内，跨境需另行告知。未取得独立的零留存证明，不能宣传全链路无日志。手机开启前告知图中可能含敏感信息，建议遮盖后主动分享；用户可关闭截图上云并用手动/语音记账；新版快捷路线不自动退回本地OCR。

本轮使用现有账号少量合成请求，未上传真实用户账单。没有拿到完整供应商计费账单，不以“免费模型”或单次延迟推断长期成本。公开推广前核对控制台实时价格、预算/余额、持久化额度和真实页面质量；没有“终身无限视觉识别”承诺。

### 7.3 DeepSeek Flash 生产切换与千问核对

2026-11-14 已将生产切到 `/opt/shengzhang/releases/20261114-deepseek-flash`，视觉模型为 `deepseek-flash`，基址 `https://api.deepseek.com`。预发布和公网均用合成图 `decimal.png` 通过完整路由：HTTP 200、金额 2658 分、页面时间正确、`amountIssue=null`、`no-store`，耗时约 1.0–1.2 秒。生产 `shengzhang-api` active；前版 `20261113-quick-accounting-031-time` 保留回滚。没有重新打包 APK 或发 OTA，手机调试包继续调用共享 API。

后续线上 `current` 已切到 `/opt/shengzhang/releases/20261114-wechat-overflow-fix`，用于修复超长商品说明触发的 503；模型仍为 `deepseek-flash`。当前状态以 [HANDOFF](./HANDOFF.md) 和 [38](./38-quick-accounting-validation.md) 为准。

切换前预发布曾因 contracts 目录缺少可选字段 `amountIssue` 触发 Zod `unrecognized_keys`；同步 `packages/contracts/src/screen-bill.ts` 后通过。证据见 `design/exports/quick-accounting-033/deepseek-flash-production-smoke.json`。

[用户指定模型页](https://www.qianwenai.com/models/qwen3-vl-plus)给出的北京端点为 `https://cn-beijing.maas.qianwenaiapi.com/compatible-mode/v1`，model=`qwen3-vl-plus`。[官方视觉文档](https://platform.qianwenai.com/docs/developer-guides/multimodal/vision)支持Base64 Data URL，不需公开图片链接，显式 `enable_thinking:false`。

[结构化文档](https://platform.qianwenai.com/docs/developer-guides/text-generation/structured-output)确认Qwen3-VL-Plus非思考支持JSON Object；多模态不支持严格json_schema，会降级，因此保留Zod与金额/时间/状态证据校验，不能把“返回JSON”当识别准确。

千问AI平台由阿里云官网直接链接，协议主体为通义云启（杭州）信息技术有限公司。选择按量API专用凭证，配置到服务端 DASHSCOPE_API_KEY 或 SCREEN_VISION_API_KEY。当前本地/服务器均未发现可用官方Key，尚未调用官方Plus或比较真实页面效果；硅基Key不能通用。当前线上已改为 DeepSeek Flash，官方千问仍是备选，不能把源码默认配置当成已调用。

官方按量API条款与个人Token/CodingPlan分开；输入输出有自动内容审核，必要最短时间保留、备份可能延迟删除，未明确授权不训练。按量请求元数据日志近14天不包含正文，不等于图片留存14天或零留存。协议链接和核对范围见 [隐私设计](./07-data-privacy.md)。供应商切换前需确认账号条款、预算/硬限额，用合成图和经遮盖的真实模板评测金额/拒识/时间及P95延迟，再更新部署记录和用户披露。

### 7.4 DeepSeek 数据条款待归档

DeepSeek Flash 已进入生产，但本轮只验证了接口、结构化输出和金额证据，尚未像硅基、千问那样逐条归档 DeepSeek 官方隐私政策/API 条款。上线前必须核对：输入输出是否用于训练、日志与备份保留时长、内容审核、跨境处理、删除机制和账号主体。完成前不得宣传“零留存”“绝不训练”或“图片即时删除”。手机端只发送当前压缩图，服务端不落图、不记录正文或模型输出；这些项目内措施不能替代供应商条款披露。
