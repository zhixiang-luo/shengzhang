# 当前交接

> 每次阶段工作结束时覆盖本文件。临时聊天记录不能替代这里的事实。

## 当前状态

项目处于 **M5 质量验证、M8 月末回顾与 M9 数据安全并行阶段**。真实流式语音、200 条自动化评测、本地账本、JSON/CSV 数据安全闭环、离线账单搜索和确定性月度回顾已可用；`0.2.1` Android 原生包已发布到官网、OSS + CDN、服务端更新策略和 GitHub Pre-release，runtime `0.2.1` preview OTA 也已上线。iOS 原生构建、启动动画真机验收、真人语料和双端真机矩阵仍待完成。微信登录、云备份和支付已转为外部依赖 backlog，不阻塞免费本地首发。

## 已完成

- 产品与交互方案已确认，原型评审通过。
- 底部“记账”已改成一步录音：按下直接开始，松手识别，不再出现“语音入账”二次入口。
- 原型 19 项交互回归全部通过，12 个关键画面无横向溢出，运行时错误为 0。
- 根目录 `AGENTS.md` 已建立，作为所有 AI 的统一规则入口。
- 后期产品主纲已建立：`docs/21-post-mvp-strategy.md`，明确可信语音、月末回顾和数据安全三轴，以及 M7–M11 的阶段门禁。
- 可信语音与月末回顾专项已建立：`docs/22-voice-trust-and-monthly-review.md`。
- 会员与增长实验方案已建立：`docs/23-membership-and-growth.md`。
- 成本与定价基线已建立：`docs/24-cost-model.md`。
- 账号、会员与支付官方规则已核验：`docs/25-account-and-payment-feasibility.md`。
- 生产基础设施与存储方案已建立：`docs/26-production-infrastructure.md`。
- 已确认 Apple 个人开发者可以发布 App 和使用 Apple 内购；iOS 数字会员默认走 IAP。
- 已确认会员权益与微信登录解耦；免费本地首发不依赖账号、微信登录、云备份或支付。
- 微信支付 APP 支付官方当前材料列个体工商户/企业等主体；支付宝 APP 支付需要商家账号和经营资料。普通个人支付账号不能直接替代商户接入。
- pnpm monorepo 已创建：`apps/mobile`、`services/api`、`packages/domain`、`packages/contracts`。
- Expo 58、React Native 0.88、TypeScript 6、Expo Router、SQLite、Drizzle、Zustand 已接入。
- Fastify API 骨架、`/health` 和 mock `/v1/voice/parse` 已建立。
- 金额转换、核心领域类型和 Zod 接口契约已建立。
- 完整文档体系已落盘：`AGENTS.md`、项目上下文、09–18 技术/流程/UI 文档、资产索引。
- ESLint、TypeScript、Vitest、Expo Doctor、EAS 配置和 GitHub Actions 基础 CI 已接入。
- Expo Doctor 20/20 通过；iOS JavaScript bundle 导出成功。
- 全仓 TypeScript 检查和现有 Vitest 测试通过。
- SQLite schema、首版迁移、内置分类种子和数据库 Provider 已实现。
- 账本首页可读取真实本地账单，按日期分组并显示月度收支。
- 手动新增、编辑和删除账单已接入本地数据库。
- 基础月度统计已实现每日支出柱状图和一级分类占比。
- 手动记账页支持新增一级/二级分类，并立即保存到 SQLite。
- 手动记账金额区保持原版式，金额 `TextInput` 固定单行并关闭内部滚动；“0.00”改为独立垂直居中占位层，输入行高与字号一致，修复占位文字偏上和光标过长。
- 手动记账新增自绘金额键盘，支持数字、小数点、`+ − × ÷` 和删除；金额表达式保存时按运算优先级精确换算为整数分。
- 金额键盘默认收起，只有点击“花了多少/收到多少”标签或金额框时展开；点击页面其他位置或开始滚动时自动收起。
- 备注输入获得焦点时隐藏金额键盘并自动滚动到系统输入法上方；备注改为单行“备注 / 选填”字段并修正光标垂直居中。
- 账本与统计页统一使用淡入淡出，避免切换时出现空白页滑入。
- 账本列表支持左滑删除，复用软删除和 8 秒撤销；横向手势需移动 24pt 才激活、52pt 才展开，并启用 iOS 方向锁定，避免纵向滚动误触删除。账单合并逻辑保持不变。
- 语音转写完全没有日期或时刻时，服务端强制使用当前时间，避免模型自行编造收入时刻。
- 移除账本右上角重复加号；空账本保留“加一笔”，非空账本通过语音面板右滑进入手动记账。
- 语音面板支持左滑取消、右滑转手动记账；真实 ASR 已接通。
- 手动记账的时间改为自绘月历 + 小时/分钟选择 Sheet，移除日期文本输入和格式解析。
- 分类管理页可新增一级/二级分类、改名、隐藏和恢复；一级、二级分类均可长按整行主体约 400ms 后拖拽，单击仍执行展开或编辑，松手后事务化保存完整顺序，并为读屏保留上移/下移辅助操作。
- 拖拽排序初版使用的 `react-native-draggable-flatlist@4.0.3` 在 React Native 0.88/Fabric 下会调用已移除的 `InteractionManager`，并触发旧式 `measureLayout` 错误，造成空白和长时间卡顿；已替换为 `react-native-reorderable-list@0.18.2`，分组内一级/二级分类拖拽均使用其嵌套列表实现。
- 分类新增、编辑和记账页内“新建分类”Sheet 已统一键盘避让：Android 使用高度调整，输入聚焦后自动滚动到键盘上方，保存按钮不再被遮挡。
- 所有底部 Sheet 改用独立的 `AnimatedSheetModal`：面板负责上下位移，蒙层独立淡入淡出，避免原生 `Modal` 的 slide 动画把黑色蒙层一起拖走；语音录制浮层改为整屏触摸拦截，弹层下方列表不会收到第二根手指的点击。
- GitHub 门面已按独立开发者作品和开源项目两个目标重构：README 增加产品故事、目标用户、原型截图、当前能力、技术亮点、质量数据、架构图、路线图和 GitHub Releases 下载入口；新增 MIT License、贡献指南与安全策略。
- 删除账单后提供 8 秒撤销，并恢复到本地 SQLite。
- 统计增加较上月、日均、最高支出日、点击每日柱状图查看当天明细、一级分类下钻二级分类。
- `expo-audio` 真机录音已接入，打开语音面板自动请求权限并开始录音。
- 录音上传到 Fastify `/v1/voice/parse`，结果映射到本地分类后以单事务写入 SQLite；服务端支持 `mock/cloud` 两种供应商。
- 语音多笔结果先进入单个确认卡，确认后写入并立即关闭；音频在请求结束后删除。
- 服务端保留 SiliconFlow ASR + DeepSeek JSON 解析 HTTP 备用适配器，支持 `mock/cloud` 切换。
- 本地 `.env` 配置入口、安装 ID 和每日语音额度已实现；火山流式 ASR、SiliconFlow 备用和 DeepSeek Key 均已验证。
- DeepSeek Key 已通过真实请求验证，示例“午饭二十五，打车十八”能稳定返回两笔结构化账单。
- 服务已切换到 SiliconFlow 国内站 `https://api.siliconflow.cn/v1`，国内站 Key 已验证通过。
- SiliconFlow HTTP 备用模型为 Qwen3-ASR-1.7B（约 ¥0.79/小时）；同一 1 秒音频块实测约 0.24–0.28 秒。
- 已实测免费的 XingChenASR-V3.2-Ultra：准确率与 Qwen3 相当，但 1.15 秒音频块延迟 0.72–8.85 秒波动过大，因此未切换默认模型。
- 真实中文端到端已通过：测试音频“午饭二十五，打车十八”被转写为“午饭25、打车18”，解析为餐饮/午餐 25 元和交通/打车 18 元，两笔同时返回；整条 `/v1/voice/parse` 首测约 3.9 秒、热请求复测约 1.46 秒。
- 供应商冷启动曾出现约 24 秒、热请求约 0.4–0.8 秒的波动；ASR 超时已提高到 30 秒，并将供应商超时映射为明确的 503 业务错误，避免直接暴露通用 500。
- Expo Go 真机联调发现：React Native 0.88 不接受旧的 `{ uri, name, type }` FormData 文件写法；客户端已改用 `expo/fetch` + `expo-file-system` 的 `File` 上传。
- 手机端旧版录音流程只更新计时，不会自动提交；现已改为检测一句话结束并自动提交，同时保留手动结束按钮。
- SiliconFlow 国内站曾返回 `402 / account balance is insufficient`。控制台显示 SenseVoiceSmall 免费，但账户余额为 0 时仍无法调用；充值后真机请求已恢复成功。
- 语音入口已按确认后的产品交互重做：按住中央按钮开始录音；火山 WebSocket 双向流式返回字幕；上滑 36pt 松手取消；向右滑进入手动记账；正常松手提交火山最终文字。
- 实时链路为手机 PCM → `/v1/voice/stream` WebSocket → 火山 `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel`，网关回传 `ready/partial/final/error`。
- 松手后把浮层最后一版文字 POST 到 `/v1/voice/parse-transcript`，直接做 DeepSeek 结构化；实时文字为空则视为取消。
- 完整语音结构化结果现在由 `VoiceResultSheet` 自动写入 SQLite，再展示“已记好”结果卡；8 秒内可按批次撤销，异常时提供重试。
- 真机已验证按住手势、WAV 实时录制和连续 4 次字幕刷新；松手后完整链路返回成功。文字直连结构化接口的本机测试约 1.04 秒返回两笔账。
- 上滑 36pt 进入取消态，向下回到 16pt 内恢复；右滑 48pt 进入手动记账态，浮层和按钮同步点亮。空实时文字直接关闭浮层，不再进入结构化。
- 结果卡默认主路径不再要求“确认记账”：完整字段直接保存，结果卡提供“撤销”和“收好”；保存失败时账本不变并提供“重试”。
- 结果卡合计统一使用 `summarizeAmounts`：纯支出时显示负合计，例如 26 元 + 174 元显示为 `合计 −¥200`，与逐笔金额符号一致。
- 浮层光标在无实时文字时位于提示语开头；录音中麦克风图标持续呼吸，波形根据 PCM 音量实时跳动。
- 火山真实 Key 已通过 WebSocket 验证：2.3 秒音频约 1 秒开始出现“午饭”，之后持续更新，最终返回“午饭25，打车18。”。
- SiliconFlow HTTP 备用路径已验证；React Native 的 Blob 不支持从 ArrayBuffer 创建，因此备用上传使用临时 WAV 文件。
- 滑动闪动的根因是父组件每次状态更新都会重建 PanResponder；现已把回调存入 ref，手势实例全程只创建一次，并采用 36pt 取消区/16pt 回退线、48pt 手动态/24pt 回退线。
- 200 条中文 TTS 自动化评测已全部通过：金额、类型、分类、日期、多笔和缺金额指标均为 100%；首字 P50 1.28s，松手到结构化完成约 P50 1.68s、P95 2.20s。报告见 `docs/20-voice-eval-report.md`。
- 成本看板脚本已建立：`pnpm --filter @shengzhang/api voice:cost`，产物为 `services/api/testdata/voice/cost-report.json`；当前只按 ASR 参考价计算情景，DeepSeek token、网关、存储、支付和客服尚未纳入。
- React 19/Hook lint 门禁已修复：动画值改为稳定 state，PanResponder 保持单实例并移除非渲染期 ref 更新。
- Expo SDK 58 的 5 个补丁依赖已对齐，Expo Doctor 20/20；iOS 和 Android 导出均通过。
- 空语音与取消路径已修复：服务端把停止后的空音频收尾为正常空结果，客户端在没有转写文字时静默回到 idle，不再展示火山供应商报错。
- 品牌资产已统一重绘：1024px 满版 App 图标、1024 × 341 透明启动字标、1024px Android 自适应前景与单色图标、2400px 横向品牌标志，以及 9 柱声波图形；App 内 `BrandMark` 使用同一套圆润线稿、眼部高光和声波语言。
- Android `0.1.4` 修复首次麦克风授权流程：授权前不创建录音会话，首次授权成功后显示可关闭的“麦克风已经准备好”提示，避免系统弹窗打断按压后误报“录音过短”。
- 新建手动账单现在默认展开自绘金额键盘，并在金额末尾显示短光标；编辑已有账单保持键盘收起。点击分类、时间、备注、空白或开始滚动会自动收起键盘。
- 启动体验已改为“原生静态首帧 + React 连续展开”：`design/assets/splash-wordmark.svg` 导出透明横向“声账”字标和极小声波，不再出现粉色圆盘或小猪；React `BootScreen` 从同一字标出发，展开环境光晕、品牌主张和本地账本状态。新增资产测试防止启动图退回大面积圆形 Logo。
- 启动字标的“声账”字形已从 `<text>` 转为 SVG 路径，消除 macOS 与 Ubuntu CI 的系统字体差异；资产测试现在能在缺少中文字体的 Linux Runner 上稳定验证暗色字标、透明底和非圆盘覆盖率。
- 启动体验按进程生命周期分档：首次安装播放完整 2.72 秒入场；后续每次进程冷启动播放 1.2 秒快速入场；仅从后台恢复时不播放。React 首帧的声波尺寸与透明度对齐原生 Splash，避免原生层退出时跳变。
- 本月支出卡片加入暖棕与腮红半透明圆形、细轮廓和呼吸层次；装饰层不接收点击，金额与收支信息保持最高视觉层级。
- 分类图标升级为独立线性图标体系：内置二级分类不再继承一级图标，账本列表、统计、分类管理和手动记账选择器均读取 `categories.icon`。自定义分类创建和编辑可选择图标，未知值回退到 `other`。
- SQLite schema 升至 v2，迁移只更新 `is_preset = 1` 的内置分类图标，保留用户自定义分类和历史账单数据。
- 官网首版已落地到 `deploy/site/`：包含首屏语音入账动态演示、传统记账步骤对比、三张真实产品界面切换、能力卡片、隐私数据流、质量数据、独立开发者故事，以及 Android 内测和 GitHub Releases 双入口。
- 官网使用无外部依赖的 `index.html`、`styles.css`、`app.js`，并纳入品牌 SVG、分享图和原型截图；支持滚动揭示、鼠标光晕、设备倾斜、声波和转写循环，并对 `prefers-reduced-motion` 做完整降级。
- 官网已在 `1440×1000`、`768×1024`、`390×844` 和 `375×812` 四种视口完成布局验收；均无横向滚动，移动端导航、三个产品界面标签和方向键切换通过，页面自身无控制台错误。详细规格见 `docs/27-official-website.md`。
- 官网已切换到正式域名 `https://bigai.xin/shengzhang/`；根路径跳转到该子目录，误拼 `/shengzheng/` 与 `www` 都 301 到规范地址。首页、样式、脚本、图片和 APK 下载均从公网验证。
- Android 内测 APK 已上传到正式域名稳定路径 `/shengzhang/downloads/shengzhang-android-preview.apk`，访客不需要 Expo 或 GitHub 账户即可直接下载；当前为 `0.2.0 (17)`，大小 107,955,328 字节，SHA-256 为 `684e0cf5b56099332664f158aa6752bf766e15571224315855363e93be988321`。
- App 已升级到 `0.1.3` 并接入 `expo-updates` + EAS Update：启动自动检查、回到前台限频检查、下载完成提示、立即重启和设置页手动检查均已实现；preview/production 使用独立 channel，runtimeVersion 跟随 appVersion。
- 语音 API 已增加单安装、单 IP、全局分钟/日额度、WebSocket 并发和单次音频长度限制；Nginx 同时启用每 IP 请求与连接限制。面向千级注册用户，生产值已调整为 IP 每分钟 30、每日 600、全局每分钟 120、每日 5000；内部连续 31 次无效请求验证为前 30 次 `400`、第 31 次 `429`。
- GitHub 仓库已设为 Public；已公开 MIT 源码、品牌边界、安全策略和 Android 内测 Releases。`v0.1.3-preview.1` Pre-release 已附带完整 APK 附件，官网与 Release 均可分发同一构建。
- GitHub 已发布 `v0.1.4-preview.1` Pre-release 并附完整 APK，标题采用用户可读的更新说明，Tag 保留技术版本；官网主下载入口与链接已移除版本号，改为稳定的 `?download=latest`。
- Android `0.1.4` 原生构建已完成：构建 ID `b623433e-835c-4e80-9c51-adcb74bb61a7`，版本 `0.1.4 (14)`，APK 109,914,393 字节，SHA-256 `6f5cd3c9d873b0e70e33070f8b1a9433ed87c5111866e14698a32519be52002b`；官网已原子替换并从公网验证。
- 正式域名已启用 Let’s Encrypt HTTPS：证书 SAN 覆盖 `bigai.xin` 与 `www.bigai.xin`，有效期至 2027-01-26，自动续期 dry-run 通过；阿里云安全组和 Ubuntu UFW 均已放行 443/TCP。
- 官网 footer 已展示 `京ICP备2026073107号` 并链接工信部备案系统，canonical 与 Open Graph 地址统一为 `https://bigai.xin/shengzhang/`。
- preview 通道已发布 HTTPS 域名 OTA：Update Group `a2f27f47-d1fb-49ed-8529-cfd26ea0957c`，runtime `0.1.4`，Android/iOS bundle 均确认写入 `https://bigai.xin`。
- GitHub 已启用 Private Vulnerability Reporting、依赖图、Dependabot alerts、恶意软件告警、安全更新、分组安全更新和 Secret Protection；`main` 分支已禁止强制推送与删除。
- Vitest 已升级到 `4.1.12`，消除了 Tinypool 的两个 critical 漏洞；当前 71 项测试全部通过，其中移动端包含首次授权、金额键盘、启动分档、首启版本和分类图标回归测试 18 项。
- 已接入隐私优先的第一方匿名统计：官网访问/下载、App 启动、语音开始/完成/保存/撤销/取消/失败、手动新增/编辑/删除、统计、分类和设置事件。事件只包含固定名称、平台、版本、条数、耗时和错误原因；金额、分类名、备注、转写和录音不上报。
- 匿名安装 ID 在服务端使用私有 Salt 哈希后写入按日 JSONL；设置页提供“匿名使用统计”关闭开关，官网遵循 DNT/GPC。
- 已增加 `pnpm --filter @shengzhang/api analytics:report` 报告脚本，可查看独立下载访客、活跃安装、启动频率、语音成功率、累计新增账单和每日趋势。
- 服务器已安装 `/opt/shengzhang/bin/daily-ops-report.sh`，可生成北京时间前一日的 `server + analytics` Markdown 简报，并写入 `/opt/shengzhang/shared/reports/`。
- Codex 心跳自动化 `声账每日运营简报` 已启用，每天北京时间 08:00 运行只读检查；异常时提示服务状态、磁盘/内存、错误日志和产品数据趋势。
- 2026-11-05 已部署服务器端运维告警：`/opt/shengzhang/ops/ops-alert.sh` 每 5 分钟检查 API、Nginx、`/health`、磁盘、可用内存、系统负载、ECS 网络收发吞吐和最近 15 分钟 API error 日志；异常按 1 小时（紧急）或 6 小时（预警）冷却重发，恢复时发送恢复通知。当前 2 vCPU/约 1.7GB 内存的服务器把出网预警/紧急阈值暂设为 2.5/4.0 Mbps，触发后需要结合实际公网带宽和火山并发额度复核。
- 新增 `.github/workflows/production-health.yml` 作为独立外部看门狗：随 `0.2.1` 发布提交进入默认分支后，GitHub 每 5 分钟访问公网 `/health`，在整台 ECS 或本机监控失联时创建运维 Issue 并发送邮件，恢复后关闭 Issue 并发送恢复邮件；邮件凭据复用 GitHub Actions Secrets。
- 日报增加容量阈值：昨日活跃安装达到 100、300、500、1000 时分别提示里程碑、规划、预警和紧急；昨日语音开始达到 500、1500、2500 时分别提示观察、容量预警和紧急。服务器每天 00:50 生成日报，Codex 心跳每天 08:00 汇报。
- 邮件告警脚本 `send-alert-email.py`、通知去重脚本 `ops-notify.sh` 和配置样例 `alerts.env.example` 已部署。本地可运行 `deploy/configure-email-alert.sh`，以隐藏输入方式把 SMTP App Password 写入服务器 `/opt/shengzhang/ops/alerts.env`（权限 0600），凭据不进入仓库或聊天。
- 新增全局 Codex 技能 `email-alert`：QQ SMTP 授权码只存 macOS 钥匙串，其他项目可按需复用邮件告警，不把授权码写入项目文件或聊天；`configure-email-alert.sh` 完成本项目配置时也会同步保存该钥匙串条目。
- 已制作 27 秒竖屏宣传片《一句话，长出三笔账》：围绕“按住说一句，松手自动入账”，用声波折成三笔真实账单，随后展示 8 秒整批撤销、本地优先与月度统计。当前旁白使用 Edge TTS `zh-CN-XiaoxiaoNeural`（晓晓普通话女声），原 Tingting 女声保留在 `assets/audio/vo-tingting/`。
- 宣传片工程位于 `design/video/shengzhang-promo/`，包含分镜脚本、视觉规范、五段场景、中文旁白、原创配乐与可复现音频脚本；界面素材复用已评审原型截图。
- 宣传片已通过 HyperFrames lint、runtime、motion 和逐帧布局检查；69 项文字对比度检查全部达到 WCAG AA，成片无黑帧或 1.2 秒以上静态段。
- 竖版成片为 `design/exports/video/声账-宣传片-说一句就记好.mp4`，1080×1920、30fps、27 秒、810 帧，约 -16.0 LUFS / -4.7 dBTP，SHA-256 为 `998e5a5a12760841684740d1a4501aaa8e60ccbd722ecc5814a95ac986ad4e9d`。
- 已用 `video-shotcraft` 镜头卡与 Remotion 制作 1920×1080 横屏宣传片《一句话，两笔账》，工程位于 `design/video/shengzhang-shotcraft/`；当前为 6 段晓晓普通话女声旁白、原创程序化配乐、转场拟音、镜头卡工作台和帧级分镜。旁白通过 `edge-tts` 生成，文案固定于 `scripts/voice_lines.json`，按画面窗口校准语速；Yunyang 男声和原 Tingting 女声保留用于回退对比。
- shotcraft 主版为 `design/exports/video/声账-shotcraft-宣传片.mp4`，无 BGM 版为 `design/exports/video/声账-shotcraft-宣传片-无BGM.mp4`；两版均为 25.23 秒、757 帧、30fps、H.264 + AAC 48kHz stereo，且复用完全相同的视频流（MD5 `c6c2b9b05b4ac5e68d3543e5b96cb6bd`）。完整解码与无黑帧检查通过；带 BGM 版约 -16.0 LUFS / -1.8 dBTP，无 BGM 版约 -16.0 LUFS / -2.7 dBTP。主版 SHA-256 为 `5cd3f07f908b9e58537067e95accb03795c30fe60507236689d00e8f81c371ef`，无 BGM 版 SHA-256 为 `65b06e42606d9152cd214bfe7e63960730a81c1442352291e7fb9e6a3ed0a3ab`。

## 测试发布状态（2026-10-29）

- Expo/EAS 项目已关联为 `@xiaozhuluozhixiang/shengzhang`，项目 ID 为 `04dd154b-655a-4b0e-bd3f-f3fafd76ab3d`。
- 首个 Android 内测 APK 已通过 EAS Build 完成：构建 ID `d0e1f1f3-41c6-4bf3-8c3b-7eb6fd4f1585`，profile `preview`，版本 `0.1.0 (1)`，构建耗时 21 分 12 秒。
- APK 下载页：`https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/d0e1f1f3-41c6-4bf3-8c3b-7eb6fd4f1585`。
- APK 文件大小 107,834,162 字节，SHA-256 为 `30f63e53349ff65fab6c2add525fd9fe991fc6e9d1efc624258ab37af83b4e36`；ZIP 完整性检查通过。
- 分类拖拽、Sheet 动画、录音浮层触摸拦截和滚动删除阈值修复后的第二个 Android 内测 APK 已构建完成：构建 ID `7567289d-de66-4472-8df8-8d88c38243b7`，构建耗时 15 分 38 秒。
- 第二个 APK 下载页：`https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/7567289d-de66-4472-8df8-8d88c38243b7`；文件大小 108,028,872 字节，SHA-256 为 `fbff3118433caf01565581de7bff3ce68dbb2e4f6f626db85fd42a7a89a68f98`。
- Android `0.1.1` 匿名统计内测包已构建完成：EAS Build `f7643fc9-7eeb-48af-9272-15dc099b9809`，源码提交 `531c128`；文件大小 108,035,320 字节，SHA-256 为 `7d25239c7ed9429362b1cbbccc1df78a1d9063a366c7bfcf4c076f1a643b5d3a`。
- Android `0.1.2` 完整统计内测包历史记录：EAS Build `cdddc769-589f-4143-a6dd-ae7f83a0b6e2`，源码提交 `0f331db`；文件大小 108,035,800 字节，SHA-256 为 `5f0cb8a736f0d3e36275fa7d6ab072b6db7fb378e10790f292fa49799f8eb0c6`，GitHub Pre-release 为 `v0.1.2-preview.1`。
- Android `0.1.3` OTA 内测包已通过 EAS Build 完成：构建 ID `fb5ac32c-d8ca-40a3-bf98-5750b4aec28d`，源码提交 `65cfb1f`，profile/channel 为 `preview`，版本 `0.1.3 (13)`，runtime `0.1.3`，构建耗时约 23 分 5 秒；APK 文件大小 109,854,465 字节，SHA-256 为 `89db26c0d314dde5800368c947aa74d501bfa42d329de90f465f5377366dfecf`，ZIP 完整性检查通过。
- Android `0.1.4` 原生预览包已通过 EAS Build 完成：构建 ID `b623433e-835c-4e80-9c51-adcb74bb61a7`，源码提交 `a04bbb6`，profile/channel 为 `preview`，版本 `0.1.4 (14)`，runtime `0.1.4`，构建耗时约 18 分 11 秒；APK 文件大小 109,914,393 字节，SHA-256 为 `6f5cd3c9d873b0e70e33070f8b1a9433ed87c5111866e14698a32519be52002b`，ZIP 完整性检查通过。
- 2026-10-22 21:10（Asia/Shanghai）官网 `/downloads/shengzhang-android-preview.apk` 已通过临时文件校验后原子替换为 `0.1.3`；首页版本参数、OTA 提示和下载按钮同步更新。服务器端文件大小 109,854,465 字节、SHA-256 `89db26c0d314dde5800368c947aa74d501bfa42d329de90f465f5377366dfecf`，旧 `0.1.2` 备份在 `/opt/shengzhang/releases/shengzhang-0.1.2-preview.apk`。
- 2026-10-23 10:36（Asia/Shanghai）官网已原子替换为 `0.1.4`，首页不再展示版本号，下载链接固定为 `?download=latest`；公网响应 `200` 且 `Content-Length` 为 109,914,393 字节。旧 `0.1.3` 备份在 `/opt/shengzhang/releases/shengzhang-0.1.3-preview.apk`。
- 两次 build 均使用同一 Android 签名证书，证书 MD5 为 `440A483CAFA42B8CE655EBC15DBAA2F2`；第二个 APK 的 ZIP 完整性和签名证书解析均通过。
- `0.1.4` 安装包在构建时嵌入过临时 IP；当前 preview OTA 已把 API 切换到 `https://bigai.xin`。服务端继续保留 IP 的 `/v1/` 与 `/health`，用于兼容尚未接收 OTA 的旧安装。
- Android `0.1.5` 原生候选包已通过 EAS Build 完成：构建 ID `250250ce-0722-40a7-af4e-d276ae4b61b9`，源码提交 `9c39483`，profile/channel 为 `preview`，版本 `0.1.5 (15)`，runtime `0.1.5`；APK 文件大小 109,937,553 字节，SHA-256 为 `0be61cd6aa907cac3ea563ae95dd860cfeefcbac0ce6dd88c543d178871f539b`，ZIP 完整性与嵌入版本配置检查均通过。
- `0.1.5` 与 `0.1.6` 保留为历史候选；官网当前稳定 APK 为 `0.2.0`，GitHub 最新公开 Release 为 `v0.2.0-preview.1`。
- runtime `0.2.0` 的 preview OTA 已发布：Update Group `da443e24-6536-41fa-8f6c-6027a5a8736d`，Android Update `01a1abef-539a-7a4a-a70b-7b95d851006f`，iOS Update `01a1abef-539a-71f1-b952-55e88b2bcd50`，源码提交 `12ea82c`，包含首次完整入场、后续进程冷启动快速入场、后台恢复不播放。低于 `0.1.3` 的旧 APK 不含 `expo-updates`，仍需覆盖安装一次。
- 已实现并部署双轨更新策略：兼容 JS/TS 更新由 EAS 自动下载；服务端 `GET /v1/app/update-policy` 根据当前安装版本返回 `none / optional / required`，强制模式使用不可关闭门禁，推荐模式允许稍后处理。更新异常不再把底层异常原文直接展示给用户。公网已验证 `0.2.0 → none`、`0.1.6/0.1.4 → optional`、`0.1.3 → required`，API 发布目录为 `/opt/shengzhang/releases/20261105-1845`。
- 启动动画写入“已看过”的时机已从动画开始改为完整播放结束后；如果首次启动中途退出，下一次不会误跳过动画。
- 启动策略已从“只在首次安装播放”改为“首次完整、后续冷启动快速、后台恢复不播放”；移除了启动阶段每 50ms 更新一次计时的常驻状态，减少无意义重渲染。
- 语音失败恢复已形成可操作闭环：识别或结构化失败后保留当前临时转写，错误面板不再自动消失；结构化失败可直接“重新整理”，恢复转录和失败文本可一键转手动记账并预填备注。
- 语音结果卡已支持单笔修正：批量保存返回的交易 ID 与结果行一一对应，点击某一行会关闭整批结果卡并打开该笔真实账单编辑，避免修改后继续暴露整批撤销导致误删。
- 首次使用说明已加入：空账本且当前引导版本未完成时展示“按住说话、松手入账、单笔可改”和手动记账入口；完成后按版本持久化。首次请求麦克风前先解释录音用途、处理方式和历史账单边界，再进入系统授权。
- 新增单元测试覆盖语音恢复动作、转写手动预填、保存交易 ID 对齐、首次引导版本和麦克风解释决策。
- `0.1.7` 已实现本地数据安全闭环：设置新增“数据安全”页，可导出完整版本化 JSON、导出 CSV、从 JSON 覆盖恢复、清空本机账本并恢复内置分类。
- JSON 格式包含格式标识、schema 版本、导出时间、App 版本、分类/账单/语音批次计数、`fnv1a32` 校验和与完整可携带数据；恢复前验证分类层级、账单分类引用和语音批次引用。
- JSON 恢复和清空均使用 SQLite exclusive transaction；真实 SQLite 自动化测试已验证写入失败后旧账本整体回滚。
- CSV 使用 UTF-8 BOM、中文表头和 RFC 4180 转义，并中和 `=`, `+`, `-`, `@`, Tab、换行开头的公式注入；CSV 明确不作为恢复格式。
- 设置页显示本机账单数、分类数和最近导出时间；当前无云备份时，数据安全页明确提示换机前先导出。
- 新增数据安全匿名事件：打开、JSON 导出、CSV 导出、恢复和清空；事件不含账单数量、金额、分类、备注或文件内容。
- `0.1.8` 已实现离线账单搜索：账本右上角提供 44×44 搜索入口，默认展示按时间倒序的最近账单。
- 搜索支持备注/一级分类/二级分类关键词、支出/收入、两级分类、开始/结束日期、最低/最高金额，全部条件使用 AND 语义。
- 金额筛选通过 `parseYuanToCents` 转为整数分；反向日期、非法日期、非法金额和反向金额范围均返回中文提示，条件错误时不展示误导性结果。
- 搜索结果复用真实账单编辑页；归档分类仍能显示历史账单，搜索不依赖网络、账号、会员或云备份。
- 新增 `ledger_search_opened` 与 `ledger_search_applied` 匿名事件，只记录筛选条件数量，不记录搜索词、金额、日期、分类名或结果内容。
- `0.1.8` 自动化门禁通过：domain 28、mobile 49、API 38，共 115 项；Android/iOS Expo 导出均通过。
- `0.2.0` 已实现确定性月度回顾：统计页空/非空月份均可进入 `/review?month=YYYY-MM`，回顾显示支出、收入、结余、分类、上月比较、日均、最高支出日、账单数和语音笔数。
- 月度回顾聚合集中在 `packages/domain/src/monthly-review.ts`；当前月按已经过去的天数计算日均，历史月按完整自然月计算；空月份不生成虚构趋势或消费评价。
- 分享卡先展示 App 内预览，再由用户主动生成 `1080×1350` PNG 并调起系统分享；默认不展示金额、备注、商户、分类名称或精确日期。
- 分享摘要只使用分类占比区间、趋势方向、语音笔数和品牌 CTA；领域与移动端测试均验证敏感字段不会出现在默认摘要。
- 新增 `react-native-view-shot@6.1.1` 原生依赖；旧安装包不能只通过 OTA 获得分享能力，发布 `0.2.0` 必须生成新的 Android/iOS 原生构建。
- 新增 `monthly_review_opened`、`monthly_review_previewed`、`monthly_review_share_opened` 和 `monthly_review_share_failed` 匿名事件；`share_opened` 仅表示系统分享面板成功打开，不宣称发送完成或可靠识别取消。
- 搜索页日期范围已从日期文本输入改为复用 `DateTimePickerSheet` 的日期模式：点击开始/结束字段打开现有月历，隐藏小时、分钟和“现在”，确认后保存 `YYYY-MM-DD`，取消不修改条件，已选日期可单独清除；手动记账继续使用日期与时间模式。
- 搜索框、最低金额和最高金额输入统一为固定高度、零垂直内边距、固定行高和平台垂直居中；Android 关闭字体额外上下留白，占位词与用户输入使用同一基线。
- `0.2.0` 自动化门禁通过：domain 34、mobile 58、API 38，共 130 项；typecheck、lint、`git diff --check`、Android/iOS Expo export 均通过。
- `0.2.0` Android 原生构建已完成：EAS Build `986291b4-9975-40cd-ac7b-da1be3a94f49`，版本 `0.2.0 (17)`，APK 107,955,328 字节，SHA-256 `684e0cf5b56099332664f158aa6752bf766e15571224315855363e93be988321`。
- APK ZIP 完整性、版本、包名与 DEX 原生模块检查通过；已确认包含 `ExpoDocumentPicker` 与 `RNViewShot`。
- 官网稳定 APK 已先写入临时文件、核对大小与哈希后原子替换；旧 `0.1.6` 备份在 `/opt/shengzhang/releases/shengzhang-0.1.6-preview.apk`。
- 服务端 `.env` 已切换 latest `0.2.0`、download URL version `0.2.0`，发布目录原子切换到 `/opt/shengzhang/releases/20261105-1845` 并成功重启。
- GitHub Pre-release `v0.2.0-preview.1` 已创建并附带 APK。
- 阿里云 ECS 运行 Ubuntu 24.04.5 LTS、Node.js 22、pnpm 11、Nginx 1.24 和 systemd；正式域名 HTTP 308 到 HTTPS，公网 `/health` 返回 200，WSS 语音握手通过。
- APK 已上传到阿里云 OSS `shengzhang-releases`（华北2·北京），通过 `download.bigai.xin` CDN 分发；10 MB 分片实测由原服务器约 23.85 秒降至约 0.70 秒，分片 SHA-256 一致。CDN 已设置 100 GB/月流量、50 Mbps 带宽和每小时 100 万次 HTTPS 请求封顶，恢复策略为永不解封流量/带宽，避免异常刷量失控。
- `download.bigai.xin` 的 DNS CNAME 已生效，CDN 已使用云盾证书 `cert-95qrl` 启用 HTTPS、HTTP/2、OCSP Stapling 和 HTTP → HTTPS 跳转。旧证书私钥曾被工具日志回显，未用于生产，后续应在用户确认后评估吊销。
- 官网下载按钮、服务端 `.env` 和 `GET /v1/app/update-policy` 已切换到 `https://download.bigai.xin/releases/shengzhang-0.2.0-preview.apk?download=latest&version=0.2.0`；API 发布目录已原子切换到 `/opt/shengzhang/releases/20261105-2202` 并重启。
- CDN HTTPS 公网验收通过：证书链与 SAN 正确，HTTP/2 返回 `200`，HTTP 自动 `301` 到 HTTPS，Range 下载正确，完整 APK SHA-256 与本地产物一致，重复请求为 CDN `HIT`。
- 个人 ICP 备案已通过并展示备案号 `京ICP备2026073107号`；Android 包名为 `com.shengzhang.ledger`，备案订单号、实例 ID 和身份材料只保存在本地运维记录，不写入公开仓库。
- Android `0.2.1` 原生包已完成：EAS Build `e0c11c47-ae73-46ae-88c8-474168672227`，源码提交 `e979a05`，版本 `0.2.1 (18)`，runtime `0.2.1`，大小 107,723,132 字节，SHA-256 `dbbf5f3f8657895ea2fa2ef9c686b959023a0a6bd56ed57056e17dac1b5fe084`。
- `0.2.1` 原生启动图已替换为横向字标和声波，移除粉红圆盘与小猪；React 首帧从同一字标展开，并保留首次完整、进程冷启动快速、后台恢复不播放的三档策略。
- `0.2.1` APK 的版本、包名、runtime、ZIP 完整性、Signature v2 与签名证书一致性均已检查；与 `0.2.0` 使用相同证书，可覆盖安装并保留本地账本。
- OSS/CDN 已切换到 `releases/shengzhang-0.2.1-preview.apk`；完整下载大小和 SHA-256 与本地构建逐字节一致。
- 官网已切换到 `0.2.1` CDN 下载入口，页面主文案不突出版本号；API 已部署到 `/opt/shengzhang/releases/20261106-000115`，公网策略为 `0.2.1 → none`、`0.2.0/0.1.6/0.1.4 → optional`、`0.1.3 → required`，`/health` 正常。
- 服务器 5 分钟巡检日志已增加 10 MiB 轮转与 5 份保留；GitHub 外部看门狗工作流升级到固定 Ubuntu 24.04 与 `actions/checkout@v7`，待提交到默认分支后生效。
- GitHub Pre-release `v0.2.1-preview.1` 已发布并附带 APK；公开 API 返回资源状态 `uploaded`、大小 107,723,132 字节。
- runtime `0.2.1` preview OTA 已发布到 Android/iOS：Update Group `5ee8d355-e8a9-465e-bd52-3e1b6d3c3edb`，Android `01a1ac78-a9ed-7882-b262-fc1b0995adfb`，iOS `01a1ac78-a9ed-7263-9dde-2a7c67132e87`，源码提交 `9bb75e9`。

## 当前未实现

- 真人噪声/口音语料、iPhone/Android 中低端矩阵和 7 天封闭试用。
- 宣传片仍使用原型截图，尚未替换为正式内测 APK 的真机录屏或设备截图。
- 微信移动端登录：外部依赖 backlog，等 Apple/Android 发布路径和开放平台实际主体能力确认。
- PostgreSQL、对象存储、云备份与恢复：不阻塞免费本地首发。
- 高保真 UI 页面。
- 完整成本看板：DeepSeek token、网关、存储、支付渠道、税费和客服账单尚未纳入。
- 隐私中心与会员能力尚未实现；月度回顾和分享卡已实现代码，待原生构建与真机验收。
- `0.1.7` 的 Android/iOS 系统分享、文件选择器以及“导出 → 清空 → 恢复”真机闭环尚未验收。
- `0.2.0` Android 原生构建已完成，但 PNG 清晰度、系统分享、取消行为、临时文件清理和 `react-native-view-shot` 真机可用性尚未验收；iOS 原生构建尚未完成。
- iOS 内购、会员 entitlement、恢复购买、微信/支付宝 APP 支付均未实现。
- Android `0.2.1` 已替换官网稳定下载文件，GitHub Pre-release 和 runtime `0.2.1` preview OTA 均已发布；启动动画与 0.2.1 完整真机闭环仍待验收。
- 服务器旧 `/downloads/` 路径仍返回旧安装包，仅用于短时兼容；官网与 App 更新接口不再把它作为稳定入口。待旧安装升级率足够高后再下线。
- 语音失败恢复、单笔修正和首次引导已包含在 `0.2.0`，待 Android/iOS 真机回归。

## 下一步最小任务

1. 在 Android/iOS 真机验证 `0.1.7`：数据安全页布局、JSON/CSV 系统分享、文件选择与导入、覆盖确认、清空二次确认和“导出 → 清空 → 恢复”完整闭环。
2. 在 Android/iOS 真机验证 `0.1.8`：日期选择 Sheet、日期单独清除、搜索与金额输入垂直居中、中文输入法、键盘避让、窄屏筛选面板、5000 笔账单搜索响应和结果进入编辑。
3. 在 Android/iOS 真机验证 `0.2.0`：空/非空月回顾、长文案、动态字体、PNG 清晰度、系统分享、取消分享和临时文件清理。
4. 安装官网 `0.2.1 (18)` APK，完成数据安全、搜索、月度回顾和新增原生模块的真机回归。
5. 在 Android/iOS 真机验证启动策略：首装完整入场、后续进程冷启动快速入场、后台恢复不播放入场，以及原生 Splash 到 React 首帧无跳变。
6. 在 Android/iOS 真机验证 runtime `0.2.1` preview OTA 的自动检查、下载重启、快速入场、强制门禁和异常提示。
7. 从正式官网、CDN 和 GitHub Release 分别下载 APK，核对同一哈希，并在 Android 真机验证覆盖安装后本地账本保留。
8. 录制 30–50 条真人语音，覆盖口音、语速、噪声和吞字；完成 iOS 原生构建、双端真机矩阵与 12–15 人封闭试用。
9. 公开语音服务前把内存额度迁移到 PostgreSQL，并准备域名、HTTPS/WSS、日志和成本告警。
10. 用真实供应商账单补齐成本看板的 DeepSeek、网关和存储成本。
11. 修复真人评测暴露的 P0/P1 问题，冻结内测候选版本。
12. 微信登录、云备份和支付继续留在外部依赖 backlog；Apple 账号就绪后先评估 iOS 内购，不用等待微信。

## 已知风险

- 微信登录需要开放平台移动应用审核，不能只靠本地代码完成。
- 200 条合成语音通过不等于真人、噪声和弱网通过；上线前仍需真人语料和双端矩阵。
- 成本看板目前只有 ASR 情景，不能据此宣称已有完整单位经济模型。
- 19.9 元终身无限 AI 会形成不可控长期成本；当前决策是限量创始支持包，不承诺无限 AI。
- 微信开放平台公开审核规范包含个人主体和个人类目，但这不等于当前账号一定具备微信登录权限；以控制台和审核结果为准。
- Apple 个人开发者的 App Store 卖家名称使用个人法定姓名，不能用别名或公司名替代。
- 微信登录单靠 SDK 不能上线；还需要已审核应用、能力审核和上架状态，未上架认证应用默认限制 100 次登录/天。
- 当前机器没有完整 Xcode、Android Studio 和 Java；短期使用 Expo Go/EAS，原生微信 SDK 联调前再补齐。
- App 图标 PNG 已由品牌 SVG 生成，但 Android 自适应前景和启动页仍需高保真阶段复核。
- GitHub 仓库和 Releases 已从匿名请求复验可访问；`v0.1.3-preview.1` 的 APK 附件 API 状态为 `uploaded`，公开下载响应大小为 109,854,465 字节。
- GitHub 网页端上传大于 100 MiB 的 Release 附件可能在 policy/finalization 阶段失败；本项目已改用已认证的 GitHub CLI/API 上传。`v0.1.4-preview.1` 的 APK 附件已通过公开 API 和下载响应复验。
- 临时 IP 入口仅为旧安装兼容而保留；新版本只使用 HTTPS 正式域名。待确认用户都已收到 OTA 后，再评估关闭 IP 的网页跳转或 API 兼容。
- 当前单安装/IP/全局限流计数保存在 API 进程内存中，重启会清零；扩容或公开推广前应迁移到 PostgreSQL 或 Redis。
- 紧急邮件通道尚未启用：服务器没有预装邮件代理，且 `/opt/shengzhang/ops/alerts.env` 尚未填入真实 SMTP App Password。在配置完成前，定时任务会记录告警状态，但无法真正投递邮件。
- `0.2.0` 分享卡依赖新增原生模块，必须重新构建和覆盖安装；旧 APK 即使收到同 runtime OTA 也不能安全获得该能力。
- `expo-sharing` 无法可靠判断用户是否最终发送或取消系统分享，因此运营报告只能把“打开分享面板”当作传播意向，不能当作完成分享。
- `0.2.1` 修改了原生启动图，旧安装无法通过同 runtime OTA 获得；用户必须覆盖安装新的 APK，本地 SQLite 账本不受影响。
- `pnpm audit --prod` 仍报告 Expo CLI 传递依赖中的 `node-forge` 与 `braces` 两项高危告警；当前上游没有可用补丁，它们位于本地/EAS 构建工具链，不进入语音 API 请求路径或运行时移动包，由 Dependabot 持续跟踪。宣传片工程自身 `npm audit` 为 0。

## 最近验证

```text
prototype qa: 19/19 passed, 0 runtime errors
expo-doctor: 20/20 passed
pnpm typecheck: passed
pnpm lint: passed
pnpm test: passed
expo export --platform ios: passed
expo export --platform android: passed
expo-updates config: passed
expo-doctor: 20/20 passed
domain tests: 28 passed
api tests: 38 passed
mobile tests: 43 passed (boot, onboarding, permissions, voice recovery, data safety, SQLite rollback)
typecheck: passed
lint: passed
android export: passed
ios export: passed
0.1.7 android export: passed
0.1.7 ios export: passed
0.1.8 typecheck: passed
0.1.8 lint: passed
0.1.8 tests: domain 28 + mobile 49 + api 38 = 115 passed
0.1.8 git diff --check: passed
0.1.8 android export: passed
0.1.8 ios export: passed
0.2.0 typecheck: passed
0.2.0 lint: passed
0.2.0 tests: domain 34 + mobile 58 + api 38 = 130 passed
0.2.0 search date picker model: passed
0.2.0 search date writeback: passed
0.2.0 git diff --check: passed
0.2.0 android export: passed
0.2.0 ios export: passed
0.2.0 expo-doctor: 20/20 passed
0.2.0 expo config: version/runtime policy confirmed at 0.2.0
0.2.1 typecheck: passed
0.2.1 lint: passed
0.2.1 tests: domain 34 + mobile 58 + api 38 = 130 passed
0.2.1 git diff --check: passed
0.2.1 apk zip/config/signature: passed
0.2.1 apk sha256: dbbf5f3f8657895ea2fa2ef9c686b959023a0a6bd56ed57056e17dac1b5fe084
0.2.1 cdn download: HTTP 200, size and SHA-256 matched
0.2.1 official site: switched to CDN object
0.2.1 api update policy: 0.2.1 -> none, 0.2.0 -> optional, 0.1.3 -> required
0.2.1 health: HTTP 200, status=ok
0.2.1 github release: v0.2.1-preview.1 prerelease, APK uploaded
0.2.1 github release asset: 107723132 bytes
0.2.1 preview OTA: 5ee8d355-e8a9-465e-bd52-3e1b6d3c3edb, runtime 0.2.1, android + ios
0.2.1 preview OTA commit: 9bb75e98ab449fdfcef1dbf3158955247fd77916
boot policy typecheck: passed
boot policy lint: passed
boot policy tests: domain 34 + mobile 56 + api 38 = 128 passed
boot policy build: passed
boot policy git diff --check: passed
boot policy android export: passed
boot policy ios export: passed
runtime 0.2.0 preview OTA: da443e24-6536-41fa-8f6c-6027a5a8736d
runtime 0.2.0 preview OTA platforms: android, ios
runtime 0.2.0 preview OTA commit: 12ea82c2c88ac808510e117e3a79c84c04e7d50a
cdn http download: HTTP 200, Content-Type application/vnd.android.package-archive
cdn range benchmark: 0.70s vs origin 23.85s, SHA-256 matched
cdn https: HTTP/2 200, valid DigiCert chain, SAN download.bigai.xin
cdn redirect: http -> https 301
cdn full apk sha256: 684e0cf5b56099332664f158aa6752bf766e15571224315855363e93be988321
cdn cache after full download: HIT TCP_MEM_HIT
official download link: switched to download.bigai.xin
api update policy: deployed from /opt/shengzhang/releases/20261105-2202
voice eval: 200/200 exact, amount/type/category/date 100%
cost dashboard: ASR scenario generated
account/payment feasibility: official Apple/WeChat/Alipay pages reviewed on 2026-10-20
SQLite schema: sqlite3 语法与 foreign_key_check 通过
official website: desktop/tablet/mobile viewport checks passed, 0 local console errors
analytics ingestion: public POST 202, hashed install id, report aggregation passed
analytics test data: cleared after verification
android bundle export: passed for 0.1.5 candidate
android preview build: b623433e-835c-4e80-9c51-adcb74bb61a7 finished
android preview site: 0.1.6 APK atomically deployed, Content-Length 107798948
android preview sha256: 7289f328eff65b20235328c7b9c69d7016defe6c02096a35bfecb6a4b29c9a93
android 0.1.5 candidate build: 250250ce-0722-40a7-af4e-d276ae4b61b9 finished
android 0.1.5 candidate size: 109937553
android 0.1.5 candidate sha256: 0be61cd6aa907cac3ea563ae95dd860cfeefcbac0ce6dd88c543d178871f539b
android 0.1.5 candidate zip/config: passed
github release asset: shengzhang-0.1.4-preview.apk uploaded, size 109914393
github release digest: sha256:6f5cd3c9d873b0e70e33070f8b1a9433ed87c5111866e14698a32519be52002b
github release public download: HTTP 200, Content-Length 109914393
official domain: https://bigai.xin/shengzhang/ HTTP 200
official domain redirects: / -> /shengzhang/, /shengzheng/ -> /shengzhang/, www -> apex
official domain assets/downloads: image/css/js/apk reachable
official domain tls: bigai.xin + www.bigai.xin, expires 2027-01-26
official domain renew dry-run: passed
official domain api: /health HTTP 200
official domain websocket: wss_open
preview OTA domain: a2f27f47-d1fb-49ed-8529-cfd26ea0957c, runtime 0.1.4
promo video lint: 0 errors / 0 warnings
promo video runtime: 0 errors
promo video contrast: 69/69 passed WCAG AA
promo video encode: 1080x1920, 30fps, 27.0s, H.264 + AAC
promo video integrity: full decode passed, no black frames, no freeze >= 1.2s
promo dependency audit: 0 vulnerabilities
promo still render: 1920x1080 passed after dependency update
```
