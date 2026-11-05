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
| `app_backgrounded` | App 进入后台 | 前台会话时长 |
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
| `ledger_search_opened` | 打开搜索页 | 平台、App 版本 |
| `ledger_search_applied` | 提交搜索或应用筛选 | 有效筛选条件数量（0–7） |
| `monthly_review_opened` | 打开月度回顾页 | 平台、App 版本 |
| `monthly_review_previewed` | 打开脱敏分享预览 | 平台、App 版本 |
| `monthly_review_share_opened` | 成功生成 PNG 并打开系统分享面板 | 平台、App 版本 |
| `monthly_review_share_failed` | 截图、设备能力或系统分享调用失败 | 固定原因 `share_failed` |
| `categories_opened` | 打开分类管理 | 平台、App 版本 |
| `settings_opened` | 打开设置 | 平台、App 版本 |
| `data_safety_opened` | 打开数据安全页 | 平台、App 版本 |
| `data_backup_exported` | 成功生成并分享 JSON 备份 | 无账单数量或内容 |
| `data_csv_exported` | 成功分享 CSV | 无账单数量或内容 |
| `data_backup_restored` | JSON 恢复成功 | 无账单数量或内容 |
| `local_ledger_cleared` | 清空本机账本成功 | 无账单数量或内容 |

## 4. 指标口径

- 下载人数：按官网匿名访客 ID 去重后的 `download_started` 人数，是下载点击的近似值。
- 使用人数：至少产生一次 `app_opened` 的匿名安装数量。
- 激活人数：至少成功保存过一笔语音或手动账单的匿名安装数量。
- 使用频率：App 启动次数 / App 活跃安装数；也可结合每日启动次数分析。
- 语音使用率：发生 `voice_started` 的安装数 / App 活跃安装数。
- 语音成功率：`voice_completed` / `voice_started`。
- 累计新增账单：所有 `voice_saved.entryCount` 加所有 `manual_transaction_created`。
- 语音撤销：`voice_undone` 次数和撤销条数。
- D1/D7 留存：用户首次活跃日之后第 1 天/第 7 天是否再次产生 `app_opened`。
- 功能渗透率：分别统计语音保存、手动新增、统计和分类管理的独立安装数。
- 搜索使用：统计打开搜索页与提交筛选的独立安装数和事件次数；不上报搜索词、金额、日期、分类名或结果内容。
- 回顾使用：统计打开回顾、打开预览、调起系统分享的独立安装数和事件次数；不上报金额、分类名、趋势值、日期或图片内容。
- 数据安全使用：分别统计导出、CSV、恢复和清空的独立安装数与次数；不上报文件内容、金额或分类。
- 会话时长：`app_backgrounded.durationMs` 的截断值，仅用于平均使用时长。
- 语音质量：完成/保存率、客户端结构化耗时 P50/P95 和失败原因分布。

统计文件分散在用户设备本地，卸载重装会生成新的匿名安装 ID。离线期间事件当前不补传，因此报告是产品趋势数据，不等同于财务级审计。

系统分享面板不会可靠返回“发送成功”或“用户取消”。因此 `monthly_review_share_opened` 仅代表面板被成功调起；取消分享不记为错误，也不统计发送完成。分享失败事件只包含固定原因，不包含系统异常原文。

## 5. 用户控制

设置页提供“匿名使用统计”开关，默认遵循构建配置：

- 关闭后 App 不再发送产品事件；
- 官网遵循 `Do Not Track` 和 Global Privacy Control；
- 统计失败不会阻塞记账、下载或任何主流程。

## 6. 运行报告

本地：

```bash
ANALYTICS_DATA_DIR=/opt/shengzhang/shared/analytics \
  pnpm --filter @shengzhang/api analytics:report -- --date=2026-10-21
```

服务器安装版：

```bash
/opt/shengzhang/bin/analytics-report.sh
```

报告输出官网访客、下载点击、活跃安装、启动频率、语音保存与失败、手动新增、累计账单条数和每日趋势。

服务器每日运营脚本：

```bash
/opt/shengzhang/bin/daily-ops-report.sh
```

默认统计北京时间前一日，同时检查 Nginx、API、健康接口、磁盘、内存和错误日志，并把 Markdown 报告写入 `/opt/shengzhang/shared/reports/`。

报告同时读取服务器每 5 分钟巡检的最新记录，纳入 API 重启次数、可用内存、系统负载、ECS 网络收发速率、最近 15 分钟错误日志数量和未恢复告警；活跃安装及完整语音次数达到容量阈值时，会给出对应的扩容或限流动作。

Codex 每日自动化 `声账每日运营简报` 会在北京时间 08:00 调用该脚本；自动化只读取报告，不修改代码、不部署、不重启服务。报告优先提示服务不可用、磁盘超过 80%、语音失败率和下载/启动转化异常。

## 7. 保留与安全

- 事件文件位于服务端私有目录，不公开读取。
- `ANALYTICS_HASH_SALT` 只存在于服务端，并应与代码仓库隔离。
- 统计接口按 IP 限流，单次最多提交 20 个事件。
- 建议每 90–180 天清理原始 JSONL，只保留聚合报告。
- 后续数据量增大后迁移到 PostgreSQL/ClickHouse 或自托管 Umami，但继续保持事件白名单。
