# API 契约

技术架构已经定义服务端模块、错误结构和数据表；本文件定义客户端与 API 之间的可执行约定。

## 1. 通用约定

- Base path：`/v1`
- 编码：UTF-8 JSON / multipart
- 时间：ISO 8601，带时区
- 金额：整数分
- 鉴权：`Authorization: Bearer <accessToken>`
- 每个请求返回或透传 `x-request-id`
- 破坏性变更使用 `/v2`

错误结构：

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

## 2. 健康检查

`GET /health`，无需鉴权。

```json
{
  "status": "ok",
  "service": "shengzhang-api",
  "version": "0.1.0",
  "timestamp": "2026-10-19T12:00:00.000Z"
}
```

## 2.1 应用更新策略

`GET /v1/app/update-policy?platform=android&currentVersion=0.1.4`，无需鉴权。

```json
{
  "platform": "android",
  "currentVersion": "0.1.4",
  "latestVersion": "0.3.3",
  "minimumSupportedVersion": "0.1.4",
  "updateType": "optional",
  "downloadUrl": "https://download.bigai.xin/releases/shengzhang-0.3.3-preview.apk?download=latest&version=0.3.3",
  "releaseNotes": [
    "微信、支付宝付款详情页可用快捷记账",
    "保存后账单自动刷新"
  ],
  "requiresReinstall": true,
  "title": "有新版本可选",
  "message": "安装最新版本可使用新功能。覆盖安装会保留本地账本。"
}
```

- `updateType=none`：当前安装包不低于最新稳定版，不提示。
- `updateType=optional`：支持继续使用，但存在更新的原生安装包。
- `updateType=required`：当前版本低于最低支持版本，客户端显示不可关闭的版本更新弹窗。
- `releaseNotes`：最多 6 条用户可见变化；缺失时客户端按空数组兼容。
- `requiresReinstall`：为 `true` 时显示覆盖安装说明和“下载并退出”；缺失时客户端按 `true` 兼容。
- iOS 或 Android 未配置可用的官方下载地址时，服务端不会下发强制更新，避免用户被锁在无路可走的页面。
- 该接口只决定原生安装包策略；兼容的 JS/TS 更新仍由 EAS Update 自动下载。
- 接口失败不能阻塞本地账本；客户端继续使用当前版本并允许稍后重试。

## 3. 实时语音转写

### 主链路：WebSocket

`GET /v1/voice/stream?installationId=...`

- 升级为 WebSocket。
- 客户端发送二进制 16kHz、16-bit、单声道 PCM。
- 松手时发送文本 `{"type":"stop"}`。
- 网关返回：

```json
{ "type": "ready" }
{ "type": "partial", "text": "午饭25" }
{ "type": "final", "text": "午饭25，打车18。" }
{ "type": "error", "code": "VOLCANO_ASR_ERROR", "message": "..." }
```

网关内部连接火山官方 `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel`。

### HTTP 备用：单块转写

`POST /v1/voice/transcribe`

`multipart/form-data`：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `audio` | 是 | 当前 PCM 音频块编码后的 WAV，≤5MB |
| `installationId` | 是 | 匿名安装标识；服务端哈希后限流 |

```json
{
  "transcript": "午饭25，打车18",
  "latencyMs": 420
}
```

该接口只返回实时字幕，不生成账单，也不消耗正式语音记账次数。客户端按约 1 秒的 PCM 音频块并行调用；服务端另有独立额度。松手后把合并后的完整实时文字提交到 `/v1/voice/parse-transcript`，实时文字为空则直接取消。

## 4. 语音解析

`POST /v1/voice/parse`

`multipart/form-data`：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `audio` | 是 | WAV，≤30 秒，≤5MB |
| `timezone` | 是 | IANA 时区，例如 `Asia/Shanghai` |
| `locale` | 是 | 首版固定 `zh-CN` |
| `categoryTree` | 是 | 当前启用分类名称 JSON |
| `installationId` | 是 | 匿名安装标识；服务端哈希后限流 |

成功响应：

```json
{
  "requestId": "uuid",
  "transcript": "午饭25，打车18",
  "entries": [
    {
      "type": "expense",
      "amountMinor": 2500,
      "categoryPath": ["餐饮", "午餐"],
      "occurredAt": "2026-10-19T04:31:00.000Z",
      "note": "午饭"
    }
  ],
  "unresolvedFields": [],
  "latencyMs": 2180
}
```

规则：

- `entries` 长度 1–5。
- 每条只能含 `expense/income`，且 `amountMinor > 0`。
- 缺金额时在 `unresolvedFields` 写入 `entries[n].amountMinor`，客户端整批暂不保存。
- 客户端用共享 Zod schema 校验后才入账。
- 服务端不持久化音频、转写和 note。

## 5. 微信登录

`POST /v1/auth/wechat/mobile`

```json
{
  "code": "wechat-oauth-code",
  "deviceId": "anonymous-device-id"
}
```

```json
{
  "userId": "uuid",
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "expiresIn": 900
}
```

`POST /v1/auth/refresh`

```json
{ "refreshToken": "opaque-token" }
```

刷新时轮换 refresh token；旧 token 重放会撤销整个会话。

`POST /v1/auth/logout`

Bearer 鉴权，成功返回 `204`，不删除本地账本。

## 6. 云备份

`GET /v1/backup/latest`

返回备份元数据或 `404 BACKUP_NOT_FOUND`：

```json
{
  "id": "uuid",
  "schemaVersion": 1,
  "deviceId": "device-uuid",
  "updatedAt": "2026-10-19T12:00:00.000Z",
  "sizeBytes": 182736,
  "transactionCount": 128,
  "categoryCount": 41,
  "checksum": "sha256:..."
}
```

`POST /v1/backup`

- Content-Type：`application/octet-stream`
- Headers：`x-schema-version`, `x-device-id`, `x-checksum`
- Body：gzip 后的完整快照；最大 10MB
- 成功返回元数据；未知 schema、校验失败和过大文件被拒绝。

`GET /v1/backup/latest/download`

返回快照二进制。客户端完成 checksum 与 schema 校验后，在临时库恢复，成功才替换本地数据库。

## 7. 匿名产品统计

`POST /v1/analytics/events`

```json
{
  "anonymousId": "local-installation-id",
  "events": [
    {
      "name": "monthly_review_share_opened",
      "occurredAt": "2026-11-05T09:30:00.000Z",
      "properties": {
        "platform": "android",
        "appVersion": "0.2.0"
      }
    }
  ]
}
```

- 每次最多 20 个事件；属性使用严格白名单。
- 服务端只保存匿名安装标识的不可逆哈希，不保存原始值。
- 月度回顾事件为 `monthly_review_opened`、`monthly_review_previewed`、`monthly_review_share_opened` 和 `monthly_review_share_failed`。
- 分享失败只允许固定原因 `share_failed`；系统分享取消不会单独上报。
- 不支持金额、分类名、备注、日期、图片内容或分享目标属性。
- 成功写入返回 `202 {"accepted": 1}`；格式错误返回 `400 INVALID_ANALYTICS_EVENT`，限流返回 `429 ANALYTICS_RATE_LIMITED`。

## 8. 改进与反馈

`POST /v1/feedback`，无需登录。

```json
{
  "clientFeedbackId": "6fd41cf0-83d7-4d5b-a6ab-d9c87322ed14",
  "installationId": "local-installation-id",
  "type": "voice",
  "message": "语音完成后时间显示不对",
  "contact": null,
  "diagnostics": {
    "appVersion": "0.2.1",
    "platform": "android",
    "osVersion": "15",
    "locale": "zh-CN",
    "currentRoute": "feedback"
  }
}
```

- `type` 只允许 `feature / usage / voice / ledger / privacy / other`。
- `message` 去除首尾空白后为 10–1000 字；`contact` 选填且最多 200 字。
- `clientFeedbackId` 是 UUID，用作幂等键；重复请求返回同一反馈编号。
- 请求体上限 16 KiB；未知字段直接拒绝。
- 成功返回 `202`：

```json
{
  "referenceCode": "FB-20261107-A1B2C3",
  "createdAt": "2026-11-07T14:30:00.000Z"
}
```

- 单 IP 每 10 分钟最多 5 条、每日最多 30 条；全服务器每日最多 500 条。
- 服务端只保存安装 ID 的加盐哈希；反馈正文和联系方式不进入普通日志。
- 反馈正文不是匿名产品事件，不能提交到 `/v1/analytics/events`。

## 9. 超时与重试

- 客户端普通 API 超时 15 秒；语音 65 秒。
- `GET` 可指数退避重试；语音和备份上传只在用户主动点击或后台策略允许时重试。
- 4xx 不自动重试；401 先尝试一次单飞刷新。
- 备份失败不阻塞账本写入。

## 10. 契约维护

`packages/contracts` 是 DTO 的代码事实源。更改顺序：

1. 更新 Zod schema。
2. 更新本文档。
3. 更新 API route 和客户端调用。
4. 添加正向与失败测试。
5. 更新 `docs/HANDOFF.md`。

## 11. 截图视觉识别（0.3.3 默认快捷路线）

`POST /v1/screen-bill/parse`。不依赖微信登录，以安装/IP/全局额度保护，默认不启用供应商。边界 schema 见 `packages/contracts/src/screen-bill.ts`，当前错误体为 `{error:{code,message}}`，使用 Fastify 请求 ID；不保证其他旧接口的额外 retryable 字段。

请求必填：captureId（1–100 字符）、installationId（16–200 字符）、consent=true、带时区 capturedAt、有效 Intl timezone、最多 160 个启用分类 `{id,name,type}`、image `{mimeType,base64}`。MIME 只允许 JPEG/PNG；严格拒绝额外字段。body 上限 2,850,000 字节，解码后不超过 2,000,000 字节；图片头、尺寸不超过 4096×4096 且总像素不超过 600 万。安装 ID 只用于服务器哈希额度键，不转给视觉供应商。

响应：

```json
{
  "captureId": "synthetic-example",
  "bill": {
    "amountMinor": 2658,
    "type": "expense",
    "merchant": "示例餐厅",
    "item": null,
    "occurredAt": "2026-11-12T04:31:00.000Z",
    "categoryId": "expense-food",
    "amountEvidence": "实付 ￥26.58",
    "blockingReason": null
  },
  "latencyMs": 3150
}
```

amountMinor 为正整数分或 null（最大 99,999,999 分）；merchant/item 各最多 40 字；未识别字段保持 null。categoryId 只能来自请求中的同收支分类；页面没有可信交易时间则 occurredAt=null，由客户端固定回退采集时间。模型给出的单笔/成功/币种/金额及时间证据须再通过服务端校验。

0.3.3 支持顶部无单位小数、负号支出/正号收入及分行货币符号；只核对模型已选择数字与所引原文，不再以旧 OCR 候选评分裁决。明确未完成状态、转账/退款及外币证据强阻断，不能被模型的 success/CNY 枚举覆盖。金额诊断通过请求头 `X-Screen-Bill-Diagnostics: 1` 协商：声明支持时 bill 可含可选 `amountIssue: "not_read" | "unverified" | null`；未声明或未知值时不返回该字段，以兼容 0.3.1/0.3.2 的 strict schema。新客户端兼容没有该字段的旧服务响应；它仅用于提示，不允许从被拒绝的证据恢复金额。

| HTTP / 错误码 | 含义 |
| --- | --- |
| 400 SCREEN_BILL_INVALID | 请求/schema/授权标记错误 |
| 400 SCREEN_IMAGE_INVALID | 图片头、大小或尺寸不合规 |
| 429 SCREEN_VISION_LIMITED | 安装/IP/全局额度已满 |
| 429 SCREEN_VISION_BUSY | 同时请求数达到 8 |
| 503 SCREEN_VISION_DISABLED | 未配置或停用视觉供应商 |
| 503 SCREEN_VISION_UNAVAILABLE | 供应商超时、异常或不合规输出 |

默认每安装每日 20 次、IP 每分钟 10 次、全服务每日 500 次；当前单进程内存计数，重启会清零，扩容/推广前需持久化。服务端供应商超时 15 秒；RN 客户端 20 秒，原生连接 15 秒/读取 45 秒并有 60 秒总时限；断线取消上游请求，不自动循环重试。响应 `Cache-Control: no-store`，不记录图片/正文/模型响应。客户端请求前后检查本地授权，过期/关闭/新草稿/保存后丢弃旧响应。模型配置与供应商条款见 [19](./19-ai-providers.md)。
