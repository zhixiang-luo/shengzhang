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

## 3. 语音解析

`POST /v1/voice/parse`

`multipart/form-data`：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `audio` | 是 | AAC/M4A，≤30 秒，≤5MB |
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

## 4. 微信登录

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

## 5. 云备份

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

## 6. 超时与重试

- 客户端普通 API 超时 15 秒；语音 65 秒。
- `GET` 可指数退避重试；语音和备份上传只在用户主动点击或后台策略允许时重试。
- 4xx 不自动重试；401 先尝试一次单飞刷新。
- 备份失败不阻塞账本写入。

## 7. 契约维护

`packages/contracts` 是 DTO 的代码事实源。更改顺序：

1. 更新 Zod schema。
2. 更新本文档。
3. 更新 API route 和客户端调用。
4. 添加正向与失败测试。
5. 更新 `docs/HANDOFF.md`。
