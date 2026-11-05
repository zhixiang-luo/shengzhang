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
  "latestVersion": "0.2.1",
  "minimumSupportedVersion": "0.1.4",
  "updateType": "optional",
  "downloadUrl": "https://download.bigai.xin/releases/shengzhang-0.2.1-preview.apk?download=latest&version=0.2.1",
  "title": "有新版本可选",
  "message": "安装最新版本可使用新功能。覆盖安装会保留本地账本。"
}
```

- `updateType=none`：当前安装包不低于最新稳定版，不提示。
- `updateType=optional`：支持继续使用，但存在更新的原生安装包。
- `updateType=required`：当前版本低于最低支持版本，客户端显示不可关闭的安装包更新门禁。
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

## 8. 超时与重试

- 客户端普通 API 超时 15 秒；语音 65 秒。
- `GET` 可指数退避重试；语音和备份上传只在用户主动点击或后台策略允许时重试。
- 4xx 不自动重试；401 先尝试一次单飞刷新。
- 备份失败不阻塞账本写入。

## 9. 契约维护

`packages/contracts` 是 DTO 的代码事实源。更改顺序：

1. 更新 Zod schema。
2. 更新本文档。
3. 更新 API route 和客户端调用。
4. 添加正向与失败测试。
5. 更新 `docs/HANDOFF.md`。
