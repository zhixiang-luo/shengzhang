# Android 快捷记账现场调试

2026-11-13，用户报告微信、支付宝通过磁贴或快捷动作均失败，最近提示“未能确定当前付款窗口”。不能将0.3.3构建或规则测试通过当作设备功能通过。本轮没有修改窗口判定、截图或模型逻辑，没有构建新APK、切换服务或发布OTA。

## 当前可确认的阶段

该提示对应 `ERROR_WINDOW_UNCONFIRMED`：`collectCurrentWindow` 没有取得稳定、可信的付款窗口，尚未调用 `captureScreenshot`，也未上传给模型。24次、间隔120ms的重试约2.9秒，来源需连续350ms稳定。错误可能来自不可用的窗口列表、缺少窗口来源、无法识别的活动窗口或持续变化的revision；目前没有设备观测，不能认定具体根因，也不能归因于微信禁止截图。

## 无需换包的第一步

本机已有ADB。当前实际执行 `adb devices -l` 与下方脚本，均未检测到设备。

1. 用支持数据传输的USB线将Android手机接到这台Mac，解锁手机。
2. 在手机设置找到“关于手机”，连续点版本号开启开发者选项；部分厂商入口名称不同。
3. 在开发者选项开启“USB调试”，连接后在手机上接受这台电脑的调试授权。无需root；先不改其他安全选项。
4. 连接后先检查已安装声账版本、无障碍设置与系统窗口；然后在微信/支付宝详情触发一次错误。先读取现场证据，再决定修复。

项目根目录运行：

```bash
python3 packages/screen-capture/scripts/device_diagnostics.py
```

观察一轮付款页→展开控制中心→点磁贴→错误的过程：

```bash
python3 packages/screen-capture/scripts/device_diagnostics.py --seconds 30
```

若需要保存，使用新的、有意义的文件名（已有文件不会覆盖）：

```bash
python3 packages/screen-capture/scripts/device_diagnostics.py --seconds 30 \
  --output design/exports/device-debug/alipay-tile-01.jsonl
```

脚本只读：ADB连接状态、Android API、本App安装版本、该无障碍服务是否在启用列表、系统焦点来源枚举及窗口id/type/active/focused。原始系统dump只在内存解析，不写文件；不采集截图、UI树、页面文字、账户、金额、应用私有文件或设备序列号。没有设备时退出码2；多设备需显式`--serial`，不会把序列号写入报告。

重要边界：启用列表不等于服务已经连接；系统dump里提到服务也不等于它已就绪。OS窗口列表不等于无障碍服务实际收到的列表；没有解析到窗口可能是厂商格式不同，不能直接判为无窗口。当前发布包没有逐次窗口内部轨迹，这一步不足时需增加仅包含结构信息的原生调试日志，再用开发包验证；不凭系统dump直接放宽来源校验。

## 现场改动的速度边界

| 改动 | 调试方式 | 是否需要重新编译安装 |
| --- | --- | --- |
| RN页面、提示、JS交互 | 开发包连接Metro后Fast Refresh | 通常不需要 |
| Kotlin窗口识别、截图、磁贴、原生浮层 | 本地Gradle构建并通过ADB安装，缓存可复用 | 需要，耗时依机器/依赖/改动而定 |
| 服务端模型、提示词、金额核验 | 本地或隔离测试API | 手机通常不需要换包；线上切换另行批准 |

首次需准备能连接Metro的原生开发包，Expo Go不含本项目的自定义无障碍模块。不能承诺所有修改都能热更新。现场调试可省掉反复上传EAS、等待云构建、下载并手装的过程，但原生代码仍需重新编译。

本机现状：JDK17与ADB存在；SDK的android-36平台尚缺，NDK27.1.12297006缺source.properties，尚不能承诺本地完整原生构建已可用。应先用现有包读取日志，再补齐所需SDK/NDK与开发客户端。遵循CNG，不手工创建/修改apps/mobile/android。开发包默认签名可能与现有release包不同；不要卸载现有包来解决签名冲突，优先用独立开发包名并存，正式账本保留在原包。准备具体变体前先检查原生组件、scheme和数据库路径兼容。

## 本轮检查与下一步

- 新增只读脚本及8项解析/脱敏回归：首轮6项预期失败后通过；补现代displayId格式1项预期失败后通过，最终8/8。它们证明解析和输出边界，不证明任何真机窗口行为。
- 脚本实际连接检查返回`no_device`，尚未进行手机现场复现。
- 当前优先修采集阶段；模型API key暂时不需要。取得可信截图之后再比较模型金额/时间/内容结果，密钥只进服务端配置，不进APK或日志。
- 0.3.3金额服务端补丁仍仅隔离验收，线上未启用，先前自动审批边界继续有效；本轮用户讨论模型API key不构成线上切换授权。

## 单操作者复测（2026-11-13）

设备为 Redmi K60 / HyperOS Android 15 / API35，安装现有 `0.3.3 (24)`，未改运行时代码、未构建或安装新包。以下为本轮 ADB 亲测，不能替代后续新构建验收。

### 支付宝 A：现有快捷动作对照

- 起点：支付宝任务 `14693` 的 `XRiverActivity` 页面显示“账单详情”，页面帧显示“交易成功”；控制中心关闭。未点击支付、确认、删除或退出登录。
- 通过 `am start -a com.shengzhang.screencapture.CAPTURE -n com.shengzhang.ledger/com.shengzhang.screencapture.CaptureShortcutActivity` 触发一次现有快捷动作。
- 1/3/6 秒均观测到原支付宝 Activity 仍在任务栈顶层，前台焦点为声账无障碍浮层；系统无障碍窗口列表出现 `TYPE_ACCESSIBILITY_OVERLAY`。这说明现有快捷动作在本轮已越过窗口阶段并显示浮层，不证明金额、时间、商户或保存正确。
- 关闭浮层后回到支付宝原账单页，用返回键操作，未保存记账。
- 设置页最近一次识别显示 `ERROR_CLOUD_AMOUNT_NOT_READ`，属于随后识别阶段，不是窗口确认失败；本轮没有把该错误当作窗口入口失败。

### 支付宝 B：现有磁贴对照

- 起点同上，控制中心关闭。由系统命令展开控制中心，`cmd statusbar click-tile` 的系统日志明确出现 `Tile.CustomTile handleClick: custom(com.shengzhang.ledger/...BillCaptureTileService)`。
- 触发后 1/2/3/4/5/6 秒观察期间，未做外部收起；前台焦点持续为 `NotificationShade`，无障碍窗口列表持续只有 `TYPE_SYSTEM`，未出现 `TYPE_ACCESSIBILITY_OVERLAY`。该轮在观察期内未推进到原页面浮层。
- 观察结束后才外部收起控制中心并打开设置页。设置页仍显示 A 的 `ERROR_CLOUD_AMOUNT_NOT_READ`，未观测到 B 轮新增的 `ERROR_SYSTEM_PANEL`；因此本轮不能把 B 的固定错误码伪报为已采集，B 只能确认“面板持续在前台、无浮层”。
- 结论边界：B 证明磁贴点击确实进入系统磁贴回调，但未证明声账 `onClick` 的业务分支已经执行到窗口采集；正式服务内部窗口/错误轨迹仍为“未观测”。

### 支付宝 C：磁贴 + 0.5 秒外部收起对照

- 起点仍为支付宝“账单详情”，控制中心先关闭；系统命令点击磁贴后 0.5 秒执行一次 `cmd statusbar collapse`，之后不再干预。
- 1 秒时前台焦点已回到支付宝原 `XRiverActivity`；2 秒与 4 秒均观测到本 App 的 `TYPE_ACCESSIBILITY_OVERLAY`，支付宝仍在任务栈顶层。
- 这说明“磁贴 + 快速收起”能够推进到浮层，但不证明磁贴在未外部收起时能自行完成；也不证明金额、时间、商户或保存正确。关闭卡片后未保存。
- 与 B 合并结论：本轮现场差异集中在控制中心是否及时收起；磁贴点击本身已进入系统回调。

### 微信单入口

- 用户明确确认已回到微信付款详情后，通过任务锁恢复既有微信任务：前台组件为 `com.tencent.mm/.plugin.webview.ui.tools.MMWebViewUI`，任务 id 为 `14530`；控制中心关闭。
- 触发现有 `CaptureShortcutActivity` 一次。1/2/4 秒前台焦点均回到同一微信 WebView，系统无障碍窗口列表始终只有两条 `TYPE_SYSTEM`，没有 `TYPE_APPLICATION`，也没有 `TYPE_ACCESSIBILITY_OVERLAY`；未出现声账浮层。
- 随后打开设置页，最近一次识别更新为 `ERROR_WINDOW_UNCONFIRMED`，文案“未能确认当前付款窗口，请停留在详情页后重试”。这与用户此前看到的错误一致。
- 本轮没有触发保存、支付、确认、删除或退出登录；页面正文、金额和 UI 树未落盘。
- 因果关系边界：已确认本轮微信在 OS 无障碍窗口列表中没有应用窗口，并且 App 报窗口未确认；但现有发布包没有内部 `rootPackage/revision` 轨迹，不能把两者直接当作唯一或完整因果证明。支付宝 A/C 成功则说明同一采集链路并非整体不可用。

### 阶段结论

- 不读取原始日志、UI 树正文、金额或账单字段；只保留前台组件、窗口类型、固定错误码和操作顺序。
- 第一阶段对照完成：支付宝快捷动作和“磁贴 + 快速收起”可到浮层；磁贴不收起时停在控制中心；微信快捷动作在本次明确详情页稳定落到 `ERROR_WINDOW_UNCONFIRMED`。
