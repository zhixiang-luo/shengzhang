# 隐私优先的产品统计

日期：2026-10-21
状态：首版事件采集与报告脚本已实现

## 1. 目标

统计用于回答产品问题，不用于还原个人账本：

- 有多少匿名访客访问官网、点击下载；
- 有多少安装实际打开并使用；
- 每个活跃安装平均启动和使用语音多少次；
- 语音、手动记账、统计和分类管理分别被使用多少；
- 累计新增了多少笔账单，以及语音保存和撤销的情况；
- 哪些日期出现异常峰值或明显留存下降。

不采集：

- 金额、收入/支出类型；
- 分类和二级分类名称；
- 备注、转写文字和录音；
- 具体账单时间、单笔账单明细；
- 手机号、微信身份、通讯录或精确位置；
- IP 地址落盘。

## 2. 数据流

```text
官网 / App
  -> POST /v1/analytics/events
  -> 校验固定事件名和固定属性
  -> 用服务端 Salt 对匿名安装标识做 SHA-256
  -> 按天追加 JSONL
  -> 本地报告脚本聚合
```

原始匿名安装标识只用于本次请求哈希，不写入事件文件。IP 只用于短时防刷，不进入统计文件。

## 3. 事件字典

| 事件 | 触发时机 | 关键属性 |
| --- | --- | --- |
| `site_viewed` | 官网页面打开 | 平台、站点版本 |
| `download_started` | 点击官网 APK 下载 | 来源、平台 |
| `app_opened` | App 每次冷启动 | 平台、App 版本 |
| `voice_started` | 语音连接可用并开始录入 | 平台、App 版本 |
| `voice_completed` | 结构化成功并生成结果 | 账单条数、服务耗时 |
| `voice_saved` | 语音批次实际写入本机 SQLite | 账单条数 |
| `voice_undone` | 用户撤销刚保存的语音批次 | 账单条数 |
| `voice_cancelled` | 用户取消或没有说出有效内容 | 原因 |
| `voice_failed` | 权限、连接、超时、供应商或保存失败 | 原因 |
| `manual_entry_opened` | 打开手动新增/编辑抽屉 | 平台、App 版本 |
| `manual_transaction_created` | 手动新增账单成功 | 固定为 1 笔 |
| `transaction_updated` | 编辑已有账单成功 | 无账单内容 |
| `transaction_deleted` | 删除账单 | 无账单内容 |
| `stats_opened` | 打开统计页 | 平台、App 版本 |
| `categories_opened` | 打开分类管理 | 平台、App 版本 |
| `settings_opened` | 打开设置 | 平台、App 版本 |

## 4. 指标口径

- 下载人数：按官网匿名访客 ID 去重后的 `download_started` 人数，是下载点击的近似值。
- 使用人数：至少产生一次 `app_opened` 的匿名安装数量。
- 使用频率：App 启动次数 / App 活跃安装数；也可结合每日启动次数分析。
- 语音使用率：发生 `voice_started` 的安装数 / App 活跃安装数。
- 语音成功率：`voice_completed` / `voice_started`。
- 累计新增账单：所有 `voice_saved.entryCount` 加所有 `manual_transaction_created`。
- 语音撤销：`voice_undone` 次数和撤销条数。

统计文件分散在用户设备本地，卸载重装会生成新的匿名安装 ID。离线期间事件当前不补传，因此报告是产品趋势数据，不等同于财务级审计。

## 5. 用户控制

设置页提供“匿名使用统计”开关，默认遵循构建配置：

- 关闭后 App 不再发送产品事件；
- 官网遵循 `Do Not Track` 和 Global Privacy Control；
- 统计失败不会阻塞记账、下载或任何主流程。

## 6. 运行报告

本地或服务器：

```bash
ANALYTICS_DATA_DIR=/opt/shengzhang/shared/analytics \
  pnpm --filter @shengzhang/api analytics:report
```

报告输出官网访客、下载点击、活跃安装、启动频率、语音保存与失败、手动新增、累计账单条数和每日趋势。

## 7. 保留与安全

- 事件文件位于服务端私有目录，不公开读取。
- `ANALYTICS_HASH_SALT` 只存在于服务端，并应与代码仓库隔离。
- 统计接口按 IP 限流，单次最多提交 20 个事件。
- 建议每 90–180 天清理原始 JSONL，只保留聚合报告。
- 后续数据量增大后迁移到 PostgreSQL/ClickHouse 或自托管 Umami，但继续保持事件白名单。
