# 0.3.1 快捷记账验证与交付记录

日期：2026-11-13（2026-11-14 更新服务端视觉模型）。用户已确认实施，[当前规格](./35-payment-screen-capture.md)。本文件把自动化、合成评测、实际组件渲染、原生编译和真机分别记录。

## 1. 源码与发布边界

- 分支：feature/screen-bill-capture；基线 HEAD 219ae1da0d4139634d45e9777c85d644e1458562。
- 实现尚未提交；EAS 使用本次含未提交修改的源码快照，HEAD 本身不包含这些修改。
- App/runtime 0.3.1；SQLite 沿用 v3，无本次新迁移。
- 官网稳定 Android、CDN 和更新策略仍为 0.2.1；没有公开切换或 OTA。
- API 视觉路由已接入现有服务，手机默认关闭并单独授权。

## 2. 自动化与构建

| 项目 | 结果 |
| --- | --- |
| pnpm test | 328/328：domain 137、mobile 103、API 88 |
| pnpm typecheck | 通过 |
| pnpm lint | 通过，无 warning |
| API tsc build | 通过 |
| 编译后 Node22 API | /health 200；视觉停用 503 SCREEN_VISION_DISABLED |
| Expo Android export | 通过，2181 模块，HBC 约 5.8 MB |
| Expo iOS export | 通过，2140 模块，HBC 约 5.8 MB |
| git diff --check | 通过 |
| Android JVM/模拟器/真机 | 未执行 |

核心回归先看到失败再修复，覆盖全角26.58、分行实付/余额/优惠、冲突、失败/待付/退款/转账/外币、时间证据、已选分类的收支保护、未授权不上传和图片准备期间关闭授权。独立审查针对性 88 项回归亦通过；全仓结果由主 Agent 验证。

## 3. 实际确认页的浏览器 QA

直接编译实际 screen-capture.tsx、编辑组件、useScreenCapture 与 domain，使用 react-native-web 渲染；只替换原生、DB、路由和网络边界，输入均为合成 fixture。没有另画一份 HTML 冒充产品，也没有将 Web 工具加入生产依赖。

| 视口 | 页面高度 | 主按钮底部 | 结果 |
| --- | --- | --- | --- |
| 390×844 | 844 | 552.5 | 不滚动、按钮完整 |
| 360×640 | 640 | 450.5 | 不滚动、按钮完整 |
| 320×568 | 568 | 414.5 | 不滚动、按钮完整 |

未知金额显示“待补金额”、保存 disabled、未授权零上传；补金额/内容/购物分类后连点保存只写一笔，二级分类为 null，撤销只操作本笔；晚到 cloud 不覆盖人工内容、旧 OCR 不污染新 capture、5 分钟过期取消清理均通过，浏览器 errors 为空。

截图与机器记录：

- [390 宽度](../design/exports/quick-accounting/ready-390.png)
- [360 宽度](../design/exports/quick-accounting/ready-360.png)
- [320 宽度](../design/exports/quick-accounting/ready-320.png)
- [未知金额](../design/exports/quick-accounting/unknown-320.png)
- [已保存](../design/exports/quick-accounting/saved-320.png)
- [交互检查 JSON](../design/exports/quick-accounting/browser-qa.json)

这不是 Android 设备证据，不能证明原生字体、系统导航栏、键盘、磁贴或 Activity 分享行为。

## 4. 模型与服务实测

使用 6 张 700×1100 的虚构账单，标有非真实账单；没有上传真实用户数据。decimal/discount/bank-balance/missing-amount/failed/merchant-only 的期望金额分别为2658/2600/2658/null/null/1800分。

- 8B：6 项符合金额或拒识预期，无编造商品，2.211–7.601 秒。
- 32B：4 项正确，2 项在30秒测试超时；未体现本轮可用性优势。
- 本地编译后完整 API：HTTP200、2658分、正确页面时间，3150ms。
- 服务器隔离副本：HTTP200、2658分、正确页面时间，10092ms。
- 公网第一次：HTTP200、2658分、未编造商品，7122ms；页面时间证据未通过校验，occurredAt=null，属于安全降级，不能计为所有字段识别通过。原始时间字段诊断单次返回正确标签与时间，不能据此确定首轮降级的唯一原因。
- 补强 timeEvidence 必须包含标签及完整日期、ISO 必须按用户时区后：服务器隔离副本 HTTP200、2658分、正确页面时间，7976ms；公网 HTTP200、2658分、未编造商品、正确页面时间、no-store，3557ms。首次降级和复测共同保留于 public-endpoint-smoke.json，不能将波动从报告中删除。

原始数据见 `services/api/testdata/screen-bill/`。6 张合成图不是微信/支付宝/银行真实布局准确率，不能据此宣传100%精准；时间安全降级在手机中会标“默认当前时间”。

API 当前发布目录：`/opt/shengzhang/releases/20261114-wechat-overflow-fix`；前版 `/opt/shengzhang/releases/20261114-deepseek-flash`、`20261113-quick-accounting-031-time`、`20261113-quick-accounting-031`、原版 `20261107-215526` 保留。视觉功能仅在新目录的非密钥 `.env` 中开启，共享密钥未修改；新接口保持 no-store、2MB图限、20/安装/日、500/全局/日、10/IP/分钟和8并发。计数内存存储，重启清零。

硅基流动隐私条款核对结果见 [07](./07-data-privacy.md)、[19](./19-ai-providers.md)，不能把自有网关不落盘等同于全链路无日志。

### 4.1 2026-11-14 DeepSeek Flash 生产切换

- 模型：`deepseek-flash`，基址 `https://api.deepseek.com`；请求显式发送 `thinking: { type: "disabled" }`，不复用语音解析的 `deepseek-chat` 配置。
- 12 张合成账单金额/拒识对比：DeepSeek Flash 12/12，平均约 1.06 秒；千问 3.8 27B 12/12，平均约 2.81 秒。该样本没有覆盖真实微信/支付宝布局、商户、分类或失败交易识别。
- 预发布 localhost:8791 完整路由：HTTP 200、2658 分、示例餐厅、页面时间正确、`amountIssue=null`、`no-store`，1191ms。
- 公网 `https://bigai.xin/v1/screen-bill/parse` 同一合成图：HTTP 200、2658 分、示例餐厅、页面时间正确、`amountIssue=null`、`no-store`，1030ms。
- 预发布首次失败原因已定位并修复：预发布目录的 contracts 仍为旧版，Zod 拒绝新增可选字段 `amountIssue`；同步本地 `packages/contracts/src/screen-bill.ts` 后重测通过。
- 生产服务 `shengzhang-api` 已重启并 active；旧 release 保留，回滚时切回 `20261113-quick-accounting-031-time` 再重启即可。
- 本轮没有重新打包 APK、没有发 OTA；手机调试包仍调用共享 API。真机微信/支付宝验收待用户回到付款详情页后执行。

证据：[deepseek-flash-production-smoke.json](../design/exports/quick-accounting-033/deepseek-flash-production-smoke.json)。

### 4.2 2026-11-14 微信超长商品说明 503 热修

- 真实现象：微信付款详情页通过快捷键触发后，窗口和记账卡正常打开，云端识别返回 503，手机显示“云端识别暂不可用，请稍后重试”。
- 根因：DeepSeek 正确读取了金额，但把整段超长商品说明放进 `item`；严格 schema 的 40 字上限触发 `ZodError path=["item"] code=too_big`，路由把所有异常统一映射为 `SCREEN_VISION_UNAVAILABLE`。不是密钥、网络、窗口采集或模型不可用。
- 修复：超长 `item` 置 `null`，超长 `merchant` 截断到 40 字；金额、证据、支付状态、币种、时间和未知字段继续严格校验。错误日志只保留 Zod 问题码、已知字段路径和稳定 provider 错误码，不记录图片、金额、商户、订单号或模型原文。
- 验证：全仓 400 项测试、API typecheck/build、lint 通过；服务器隔离实例与公网完整路由均用同一张真实微信截图通过，HTTP 200、9360 分、页面时间正确、`item=null`、`amountIssue=null`、`no-store`。旧 release 文件哈希复核未变化。
- 部署：只切换服务端 release，不重新打包 APK、不发 OTA；已安装的 `0.3.3 (25)` 直接调用共享生产 API。回滚将 `/opt/shengzhang/current` 切回 `20261114-deepseek-flash` 并让 `shengzhang-api` 重启。

证据：[wechat-overflow-api-smoke.json](../design/exports/quick-accounting-033/wechat-overflow-api-smoke.json)。

## 5. Android APK

| 项目 | 状态 |
| --- | --- |
| 最终 EAS ID | dc219c41-7eb5-4359-83f3-b80b492c7d3d |
| App / VersionCode / Runtime | 0.3.1 / 22 / 0.3.1 |
| Channel / Profile | preview / preview |
| EAS fingerprint | cdf5075069bfc2f8fc5188884833e0e6dcd7fcef |
| 构建状态 | FINISHED，2026-11-13 02:06:51Z；原生 Gradle 编译成功 |
| APK 大小 | 155,764,580 字节（约 148.5 MiB） |
| APK SHA-256 | 7530e902402623ab8b952b5f0f58d5a24285c802d54155bc1b045601dd134ae8 |
| 签名 | Signature v2 实际验证通过；证书与 0.2.1、0.3.0 一致 |
| 签名证书 SHA-256 | d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955 |
| 包名 / SDK | com.shengzhang.ledger；minSdk 30、targetSdk 36 |
| ZIP / Manifest / DEX | 完整性通过；分享 Activity、磁贴和无障碍 Service、图片导出能力存在 |
| 权限检查 | 无 SYSTEM_ALERT_WINDOW、READ_MEDIA_IMAGES；分享流程不请求相册授权 |

构建页：[EAS 0.3.1(22)](https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/dc219c41-7eb5-4359-83f3-b80b492c7d3d)。

[内测 APK 下载](https://expo.dev/artifacts/eas/tacpBi5yDW8xZGBNZtd_DT0vMRJq7YeVgXV_nNcwzlk.apk)；本地文件为 `dist/releases/shengzhang-0.3.1-preview.apk`，不提交 Git。[包级校验 JSON](../design/exports/quick-accounting/apk-validation.json) 记录完整权限及检查结果。包仍有 Expo 模块继承的旧版外部存储权限声明，不能将分享流程无需相册授权描述为整个 APK 没有任何存储权限。签名连续性支持覆盖安装，仍须在设备上确认账本完整；本轮没有实际安装运行。

本轮历史尝试如实保留：0.3.1(20) build 95f102cf-5a67-444e-b8e6-881fe38c880a 因 Expo Coroutine 返回/参数泛型声明失败，已改为类型推断；0.3.1(21) build b0e106f9-fc83-4d6b-88d4-fb35fed863c9 为审查前快照，主动取消。均不交付。

## 6. 独立复核与设备门槛

主 Agent 顺序实现，按 requesting-code-review 技能使用一个只读审查 Agent。修复了旧metadata过期误删新图片、并发发布、分享销毁后拉起、截图窗口变化、分行排除字段、未知成功状态、显式收入、分类类型竞争和订单创建时间误认。审查后未发现新的确凿 P1/P2；原生结论来自代码审查，不能冒充已跑原生测试。

仍需 Android 11+ 真机验证：

1. 权限警告/磁贴添加、系统控制中心收起与付款页回前台。
2. 微信/支付宝常见成功详情、缺商品/缺时间、多金额、失败/待付/转账/退款/外币。
3. 截图分享、返回/旋转/销毁、连续新草稿、采集中切换 App、旧草稿到期时导入新图。
4. 本地 OCR、云端开启/关闭/弱网/超时、未授权不上传、逻辑过期/保存/取消清理。
5. 小屏/字体放大/键盘，金额/分类/时间修改，连点幂等、8秒撤销。
6. 从旧版本覆盖安装，SQLite升级/账本笔数与金额一致，JSON/CSV screen 来源往返。

未连接目标手机，没有原始失败页和匿名化真实样本；这两项限制不能靠更多合成单测消除。用户已明确先在自己的手机安装测试，实际使用通过后再上线；验收前不把候选替换成公开稳定下载。
