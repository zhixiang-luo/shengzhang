# 0.3.3 快捷记账真机闭环与发布前检查

日期：2026-11-14
状态：内测包 `0.3.3 (38)` 已在 Redmi K60 / HyperOS 真机完成微信、支付宝和语音回归；`0.3.3 (41)` 仅更换控制中心小猪图标，待真机确认。公开稳定仍是 `0.2.1`，尚未切换官网下载、OTA 或生产渠道。

## 1. 本轮结论

快捷记账的主链路已经跑通：

- 微信付款详情页连续触发 3 次快捷键，生成 3 笔独立记录，每次都是 `save result=ok`。
- 随后用语音记 2 笔，均正常入账，说明原生写入后的语音链路不再被数据库错误打断。
- 首页从 ¥8 自动刷新到 ¥61，搜索页立即显示 9 笔；全程没有重启或手动下拉。
- 冷启动后仍是 ¥61，日志没有 `expo-sqlite` 警告、没有 `Error code 10`。
- 控制中心磁贴和支付宝链路沿用同一原生入口，0.3.3 现场测试已确认可用。

## 2. 根因与修复

### 2.1 `Error code 10: disk I/O error`

现场日志显示：原生保存已经成功，随后 expo-sqlite 在关闭短连接、终结语句时返回 `SQLITE_IOERR (10)`。旧实现把 `closeAsync()` 放在 `finally` 里，关闭失败会让整个读取 Promise 失败，页面因此显示“账本没有读出来 / Error code 10”。

修复：

- 账本统一使用 rollback journal：`PRAGMA journal_mode = DELETE`，不再让 framework SQLite 与 expo-sqlite 两套实现共用 WAL。
- 原生 `OverlayLedger` 不再请求 `ENABLE_WRITE_AHEAD_LOGGING`，`busy_timeout` 提高到 5000ms。
- 首页、搜索、月回顾的短连接读取全局串行化；连接设置 `busy_timeout=5000`、`query_only=ON`。
- 关闭连接失败不再覆盖已经成功的读取结果；遇到 `Error code 10` 时等待 150ms 重试一次。

### 2.2 保存后列表不刷新

原生保存完成后发出 `onScreenBillSaved` 事件；`useForegroundRefresh` 同时监听 AppState `active`、Android `focus` 和该原生事件，事件到达后再延迟 400ms 补读一次，覆盖 WAL/文件状态尚未稳定的窗口。首页和搜索使用新鲜连接读取，避免长连接继续返回旧快照。下拉刷新现在会显示短暂的刷新指示。

### 2.3 同一详情页重复触发

每次触发都会生成新的 UUID `captureId`；同一张浮层内重复点击复用同一个 `captureId`，只记一次。不同次触发不去重，用户想记几次就记几次，记多了由用户自行删除。

### 2.4 升级/强行停止后无障碍被系统关闭

HyperOS 在覆盖安装或“强行停止”后会清掉无障碍开关；从多任务划掉或系统回收进程不会。普通 App 不能静默重新开启无障碍，因此首页增加了一条低调提示：

- 仅在“曾开启过、现在被关闭、且用户未忽略”时出现。
- 点击进入系统无障碍设置，返回后自动消失。
- 右侧 `×` 持久忽略；重新开启过服务后再次被关闭会重新提醒。
- 状态存在 `app_settings` 的 `quick_capture_ever_enabled` / `quick_capture_reminder_dismissed`，新用户不会看到无关提示。

### 2.5 控制中心磁贴图标改为品牌小猪

原磁贴使用通用气泡图标，用户反馈像“娃娃”，与声账品牌不一致。0.3.3 (41) 将 `ic_screen_capture_tile` 换成 24dp 无耳圆脸小猪：圆形头部、两个眼睛、圆鼻和两个鼻孔；头部与鼻子统一使用 1.3dp 线条，白色描边、透明主体，由 Android 控制中心自动着色。带耳线稿（39）和带耳实心耳中间稿（40）均未采用。同一资源同时用于磁贴、动态快捷方式和无障碍入口。该资源是原生 drawable，必须重新构建 APK，不能通过 OTA 更新。覆盖安装后若系统仍显示旧图标，先移除磁贴再重新添加，或重启手机。

## 3. 真机证据

设备：Redmi K60 / HyperOS，ADB 序列号 `b294fb9d`，包名 `com.shengzhang.ledger`。

| 时间 | 版本 | 操作 | 结果 |
| --- | --- | --- | --- |
| 18:55:49 | 0.3.3 (36) | 微信详情页第 1 次快捷键 | `save result=ok`，generation 2 |
| 18:56:16 | 0.3.3 (36) | 同一页面第 2 次快捷键 | `save result=ok`，generation 5 |
| 18:56:31 | 0.3.3 (36) | 同一页面第 3 次快捷键 | `save result=ok`，generation 8 |
| 18:56 | 0.3.3 (36) | 语音记 2 笔（打车 ¥18、午饭 ¥25） | 均入账，首页 ¥8→¥61 |
| 18:57 | 0.3.3 (36) | 强制停止后冷启动 | 仍为 ¥61，无 Error 10，旧 OTA 未覆盖 |
| 19:25–19:26 | 0.3.3 (37) | 无障碍提示全状态回归 | 开启时隐藏、关闭后出现、点击跳系统设置、返回隐藏、忽略持久生效 |

原生日志只记录结构信息：`save requested` / `save result` / `cancelled reason`，不包含金额、商户、正文、截图或数据库路径。

## 4. 构建记录

两个包都是 EAS preview 本地构建，使用线上发布证书，签名 SHA-256 均为：

`d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955`

| 版本 | 构建时间 | 文件 | 大小 | SHA-256 | Embedded update |
| --- | --- | --- | --- | --- | --- |
| 0.3.3 (36) | 2026-11-14 18:49 | `apps/mobile/build-1794653390614.apk` | 155,841,260 B | `81dc40dde99b2b07d9967a7aef1ec82dee641e9bedaf4928f862b215347f83f1` | `d4474ed4-621e-482f-9de2-6761ca4436d0` |
| 0.3.3 (37) | 2026-11-14 19:25 | `apps/mobile/build-1794655330782.apk` | 155,848,796 B | `7b3045c101dd967c41d63e3f940a8e9e7318f34bd66b96a73ddb085e730cfb07` | `1a8c1619-d4b2-4d55-a1f7-f5e42130272b` |
| 0.3.3 (38) | 2026-11-14 20:41 | `apps/mobile/build-production-1794659026.apk` | 155,851,436 B | `63731557b8573981fbccd0011a142bac05df008eb7fa0709c7901e8764c38f6f` | — |
| 0.3.3 (39) | 2026-11-14 21:58 | `apps/mobile/build-production-pig.apk` | 155,851,576 B | `1fb0ab4105b100b4b6d6034511e5d86681cd1670c1ae6f514561a53961f954da` | `8445daee-81e7-4336-919a-eb48f669c13a` |
| 0.3.3 (41) | 2026-11-14 22:42 | `apps/mobile/build-production-pig-round.apk` | 155,851,496 B | `4c84fd68003048b12c634a43f8b47eec13dc0087c76c4ab8db320657eb495c3b` | `77cf919e-d0cf-4e46-805b-378b0b5dc3e3` |

APK 均通过 `apksigner verify --print-certs`，证书与 0.2.1–0.3.3(35) 连续。`apps/mobile/build-*.apk` 已加入 `.gitignore`，不进入 Git 仓库。

0.3.3 (41) 测试下载：

`https://bigai.xin/shengzhang/downloads/shengzhang-0.3.3-41-test-20261114.apk`

服务器文件 SHA-256 与本地一致，公网返回 `200`、`content-length: 155851496`。

## 5. 自动化验证

- 全仓测试：410 项通过（domain 137、mobile 122、API 151）。
- `pnpm -r typecheck`：通过。
- `pnpm -r lint`：通过。
- Kotlin 原生规则单测在 0.3.3(37) 完整 Gradle 构建中编译通过；本轮 `OverlayLedger` 只移除 WAL 标志并调整 `busy_timeout`，没有再单独跑 JVM 测试。

## 6. 已知边界

- 只支持微信、支付宝的单笔付款详情页；银行与安全窗口不支持，`FLAG_SECURE` 不能被绕过。
- 首次云端识别前需要用户同意；截图只发送当前页面，不读取历史账本或相册。
- 同一浮层内重复点击幂等；不同次触发各记一笔，这是用户明确要求的行为。
- HyperOS 的“强行停止”和覆盖安装会关闭无障碍；提示只能引导用户重新开启，不能静默恢复。
- 服务器仍保留现场测试额度覆盖：`SCREEN_VISION_DAILY_LIMIT=200`、`SCREEN_VISION_IP_MINUTE_LIMIT=60`，上线前必须删除并重启 `shengzhang-api`。
- API 侧友好的 429 文案已改源码和测试，但尚未部署到公网。
- 公开下载、CDN、EAS production 渠道和更新策略仍指向 `0.2.1`；36–41 仅为内测包。

## 7. 上线前清单

1. 删除服务器 `/opt/shengzhang/shared/.env` 中 `TEST ONLY` 的两行额度覆盖，恢复 `20/天、10/分钟`，重启服务并确认进程环境。
2. 部署包含“可直接填写金额和分类后保存”的 429 文案，跑 API 测试与公网 smoke。
3. 用本轮代码生成 production 渠道安装包，核对 versionCode、证书、Manifest、Bundle 和 `https://bigai.xin`。
4. 确认 runtime `0.3.3` 的 preview/production OTA 不会把新包覆盖成旧 JS；如发布 OTA，先验证内嵌包与 OTA 组的优先级。
5. 覆盖安装保留本地账本；真机再回归一次快捷键、磁贴、语音、首页/搜索/月回顾刷新。
6. 配置 `APP_UPDATE_ANDROID_RELEASE_NOTES` 与正式 APK 下载地址；先发 runtime `0.2.1` 的更新提示 OTA，再切换官网和 GitHub Release。
7. 公开主文案不展示内部 versionCode；测试额度、内部 IP 和构建路径不进入官网。
