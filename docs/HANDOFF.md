# 当前交接

> 每次阶段工作结束时覆盖本文件。临时聊天记录不能替代这里的事实。

## 当前状态

项目处于 **M5 质量验证与 M7 可信语音并行阶段**。真实流式语音、200 条自动化评测、本地账本闭环和首个 Android 内测 APK 已可用；真人语料和双端真机矩阵仍待完成。微信登录、云备份和支付已转为外部依赖 backlog，不阻塞免费本地首发。

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
- 品牌资产已统一重绘：1024px 满版 App 图标、2048px 透明启动标记、1024px Android 自适应前景与单色图标、2400px 横向品牌标志，以及 9 柱声波图形；App 内 `BrandMark` 使用同一套圆润线稿、眼部高光和声波语言。
- 官网首版已落地到 `deploy/site/`：包含首屏语音入账动态演示、传统记账步骤对比、三张真实产品界面切换、能力卡片、隐私数据流、质量数据、独立开发者故事，以及 Android 内测和 GitHub Releases 双入口。
- 官网使用无外部依赖的 `index.html`、`styles.css`、`app.js`，并纳入品牌 SVG、分享图和原型截图；支持滚动揭示、鼠标光晕、设备倾斜、声波和转写循环，并对 `prefers-reduced-motion` 做完整降级。
- 官网已在 `1440×1000`、`768×1024`、`390×844` 和 `375×812` 四种视口完成布局验收；均无横向滚动，移动端导航、三个产品界面标签和方向键切换通过，页面自身无控制台错误。详细规格见 `docs/27-official-website.md`。
- 官网已部署到现有阿里云 ECS 的 `/opt/shengzhang/site`，临时入口 `http://8.152.201.57/` 已从公网验证；首页、样式、脚本、产品截图和原有语音 `/health` 均返回 `200`。正式域名仍等待 ICP 备案与 HTTPS。
- Android 内测 APK 已上传到官网 `/downloads/shengzhang-android-preview.apk`，访客不需要 Expo 或 GitHub 账户即可直接下载；当前为 `0.1.3`，服务器端 SHA-256 与内测构建一致。
- App 已升级到 `0.1.3` 并接入 `expo-updates` + EAS Update：启动自动检查、回到前台限频检查、下载完成提示、立即重启和设置页手动检查均已实现；preview/production 使用独立 channel，runtimeVersion 跟随 appVersion。
- 语音 API 已增加单安装、单 IP、全局分钟/日额度、WebSocket 并发和单次音频长度限制；Nginx 同时启用每 IP 请求与连接限制。面向千级注册用户，生产值已调整为 IP 每分钟 30、每日 600、全局每分钟 120、每日 5000；内部连续 31 次无效请求验证为前 30 次 `400`、第 31 次 `429`。
- GitHub 仓库已设为 Public；已公开 MIT 源码、品牌边界、安全策略和 Android 内测 Release `v0.1.0-preview.2`。
- GitHub 已启用 Private Vulnerability Reporting、依赖图、Dependabot alerts、恶意软件告警、安全更新、分组安全更新和 Secret Protection；`main` 分支已禁止强制推送与删除。
- Vitest 已升级到 `4.1.12`，消除了 Tinypool 的两个 critical 漏洞；53 项测试全部通过。
- 已接入隐私优先的第一方匿名统计：官网访问/下载、App 启动、语音开始/完成/保存/撤销/取消/失败、手动新增/编辑/删除、统计、分类和设置事件。事件只包含固定名称、平台、版本、条数、耗时和错误原因；金额、分类名、备注、转写和录音不上报。
- 匿名安装 ID 在服务端使用私有 Salt 哈希后写入按日 JSONL；设置页提供“匿名使用统计”关闭开关，官网遵循 DNT/GPC。
- 已增加 `pnpm --filter @shengzhang/api analytics:report` 报告脚本，可查看独立下载访客、活跃安装、启动频率、语音成功率、累计新增账单和每日趋势。
- 服务器已安装 `/opt/shengzhang/bin/daily-ops-report.sh`，可生成北京时间前一日的 `server + analytics` Markdown 简报，并写入 `/opt/shengzhang/shared/reports/`。
- Codex 心跳自动化 `声账每日运营简报` 已启用，每天北京时间 01:00 运行只读检查；异常时提示服务状态、磁盘/内存、错误日志和产品数据趋势。
- 已制作 27 秒竖屏宣传片《一句话，长出三笔账》：围绕“按住说一句，松手自动入账”，用声波折成三笔真实账单，随后展示 8 秒整批撤销、本地优先与月度统计。当前旁白使用 Edge TTS `zh-CN-XiaoxiaoNeural`（晓晓普通话女声），原 Tingting 女声保留在 `assets/audio/vo-tingting/`。
- 宣传片工程位于 `design/video/shengzhang-promo/`，包含分镜脚本、视觉规范、五段场景、中文旁白、原创配乐与可复现音频脚本；界面素材复用已评审原型截图。
- 宣传片已通过 HyperFrames lint、runtime、motion 和逐帧布局检查；69 项文字对比度检查全部达到 WCAG AA，成片无黑帧或 1.2 秒以上静态段。
- 竖版成片为 `design/exports/video/声账-宣传片-说一句就记好.mp4`，1080×1920、30fps、27 秒、810 帧，约 -16.0 LUFS / -4.7 dBTP，SHA-256 为 `998e5a5a12760841684740d1a4501aaa8e60ccbd722ecc5814a95ac986ad4e9d`。
- 已用 `video-shotcraft` 镜头卡与 Remotion 制作 1920×1080 横屏宣传片《一句话，两笔账》，工程位于 `design/video/shengzhang-shotcraft/`；当前为 6 段晓晓普通话女声旁白、原创程序化配乐、转场拟音、镜头卡工作台和帧级分镜。旁白通过 `edge-tts` 生成，文案固定于 `scripts/voice_lines.json`，按画面窗口校准语速；Yunyang 男声和原 Tingting 女声保留用于回退对比。
- shotcraft 主版为 `design/exports/video/声账-shotcraft-宣传片.mp4`，无 BGM 版为 `design/exports/video/声账-shotcraft-宣传片-无BGM.mp4`；两版均为 25.23 秒、757 帧、30fps、H.264 + AAC 48kHz stereo，且复用完全相同的视频流（MD5 `c6c2b9b05b4ac5e68d3543e5b96cb6bd`）。完整解码与无黑帧检查通过；带 BGM 版约 -16.0 LUFS / -1.8 dBTP，无 BGM 版约 -16.0 LUFS / -2.7 dBTP。主版 SHA-256 为 `5cd3f07f908b9e58537067e95accb03795c30fe60507236689d00e8f81c371ef`，无 BGM 版 SHA-256 为 `65b06e42606d9152cd214bfe7e63960730a81c1442352291e7fb9e6a3ed0a3ab`。

## 测试发布状态（2026-10-21）

- Expo/EAS 项目已关联为 `@xiaozhuluozhixiang/shengzhang`，项目 ID 为 `04dd154b-655a-4b0e-bd3f-f3fafd76ab3d`。
- 首个 Android 内测 APK 已通过 EAS Build 完成：构建 ID `d0e1f1f3-41c6-4bf3-8c3b-7eb6fd4f1585`，profile `preview`，版本 `0.1.0 (1)`，构建耗时 21 分 12 秒。
- APK 下载页：`https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/d0e1f1f3-41c6-4bf3-8c3b-7eb6fd4f1585`。
- APK 文件大小 107,834,162 字节，SHA-256 为 `30f63e53349ff65fab6c2add525fd9fe991fc6e9d1efc624258ab37af83b4e36`；ZIP 完整性检查通过。
- 分类拖拽、Sheet 动画、录音浮层触摸拦截和滚动删除阈值修复后的第二个 Android 内测 APK 已构建完成：构建 ID `7567289d-de66-4472-8df8-8d88c38243b7`，构建耗时 15 分 38 秒。
- 第二个 APK 下载页：`https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/7567289d-de66-4472-8df8-8d88c38243b7`；文件大小 108,028,872 字节，SHA-256 为 `fbff3118433caf01565581de7bff3ce68dbb2e4f6f626db85fd42a7a89a68f98`。
- Android `0.1.1` 匿名统计内测包已构建完成：EAS Build `f7643fc9-7eeb-48af-9272-15dc099b9809`，源码提交 `531c128`；文件大小 108,035,320 字节，SHA-256 为 `7d25239c7ed9429362b1cbbccc1df78a1d9063a366c7bfcf4c076f1a643b5d3a`。
- Android `0.1.2` 完整统计内测包历史记录：EAS Build `cdddc769-589f-4143-a6dd-ae7f83a0b6e2`，源码提交 `0f331db`；文件大小 108,035,800 字节，SHA-256 为 `5f0cb8a736f0d3e36275fa7d6ab072b6db7fb378e10790f292fa49799f8eb0c6`，GitHub Pre-release 为 `v0.1.2-preview.1`。
- Android `0.1.3` OTA 内测包已通过 EAS Build 完成：构建 ID `fb5ac32c-d8ca-40a3-bf98-5750b4aec28d`，源码提交 `65cfb1f`，profile/channel 为 `preview`，版本 `0.1.3 (13)`，runtime `0.1.3`，构建耗时约 23 分 5 秒；APK 文件大小 109,854,465 字节，SHA-256 为 `89db26c0d314dde5800368c947aa74d501bfa42d329de90f465f5377366dfecf`，ZIP 完整性检查通过。
- 2026-10-22 21:10（Asia/Shanghai）官网 `/downloads/shengzhang-android-preview.apk` 已通过临时文件校验后原子替换为 `0.1.3`；首页版本参数、OTA 提示和下载按钮同步更新。服务器端文件大小 109,854,465 字节、SHA-256 `89db26c0d314dde5800368c947aa74d501bfa42d329de90f465f5377366dfecf`，旧 `0.1.2` 备份在 `/opt/shengzhang/releases/shengzhang-0.1.2-preview.apk`。
- 两次 build 均使用同一 Android 签名证书，证书 MD5 为 `440A483CAFA42B8CE655EBC15DBAA2F2`；第二个 APK 的 ZIP 完整性和签名证书解析均通过。
- 该 APK 使用 `preview` 配置中的临时测试 API `http://8.152.201.57` 和本地明文 HTTP 插件；本地手记账、统计和设置不依赖该接口。2026-10-21 08:46（Asia/Shanghai）复测 `/health` 返回正常，ECS 与 `shengzhang-api` 已恢复运行，可以开始语音真机测试。
- 阿里云 ECS 已完成系统盘快照与格式化，部署环境为 Ubuntu 24.04.5 LTS、Node.js 22、pnpm 11、Nginx 和 systemd；`bigai.xin` 的公开 HTTP 入口仍受中国内地 ICP 备案阻断。
- 个人 ICP 备案草稿已覆盖网站和 Android App，域名指向现有 ECS，Android 包名为 `com.shengzhang.ledger`；备案订单号、实例 ID 和身份材料只保存在本地运维记录，不写入公开仓库。

## 当前未实现

- 真人噪声/口音语料、iPhone/Android 中低端矩阵和 7 天封闭试用。
- GitHub Release 尚未创建 `v0.1.3-preview.1` 或上传 APK 资产；当前官网下载已是最新版本。
- 宣传片仍使用原型截图，尚未替换为正式内测 APK 的真机录屏或设备截图。
- 微信移动端登录：外部依赖 backlog，等 Apple/Android 发布路径和开放平台实际主体能力确认。
- PostgreSQL、对象存储、云备份与恢复：不阻塞免费本地首发。
- 高保真 UI 页面。
- 完整成本看板：DeepSeek token、网关、存储、支付渠道、税费和客服账单尚未纳入。
- 月末回顾页、隐私中心、分享卡和会员能力尚未实现。
- iOS 内购、会员 entitlement、恢复购买、微信/支付宝 APP 支付均未实现。

## 下一步最小任务

1. 安装已完成的 `0.1.3` Android APK 并验证设置页更新通道；旧 `0.1.2` 不包含更新客户端，无法事后补上 OTA。
2. 评审官网首版视觉、文案与下载入口；确认后用真实设备截图替换原型素材。
3. 从官网直接下载 APK，在 Android 真机验证自动入账、8 秒撤销、保存失败重试和结果卡自动关闭。
4. 录制 30–50 条真人语音，覆盖口音、语速、噪声和吞字；执行 iPhone/Android 真机矩阵与 12–15 人封闭试用。
5. 公开语音服务前把内存额度迁移到 PostgreSQL，并准备域名、HTTPS/WSS、日志和成本告警。
6. 用真实供应商账单补齐成本看板的 DeepSeek、网关和存储成本。
7. 修复真人评测暴露的 P0/P1 问题，冻结内测候选版本。
8. 微信登录、云备份和支付继续留在外部依赖 backlog；Apple 账号就绪后先评估 iOS 内购，不用等待微信。

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
- GitHub 仓库匿名访问当前返回 404，而 SSH 推送正常；正式官网上线前必须确认仓库已设为 Public，否则访客无法打开源码与 Releases。
- 临时 IP 入口使用明文 HTTP，只适合当前静态官网预览；备案和域名就绪后应尽快切换 HTTPS，不把临时 IP 作为长期推广地址。
- 当前单安装/IP/全局限流计数保存在 API 进程内存中，重启会清零；扩容或公开推广前应迁移到 PostgreSQL 或 Redis。
- `pnpm audit` 仍报告 Expo CLI 传递依赖中的 `node-forge` 与 `braces` 高危项，以及 `uuid` 中危项；当前上游没有可用补丁，它们位于本地/EAS 构建工具链，不进入语音 API 请求路径或运行时移动包，由 Dependabot 持续跟踪。

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
domain tests: 23 passed
api tests: 30 passed
voice eval: 200/200 exact, amount/type/category/date 100%
cost dashboard: ASR scenario generated
account/payment feasibility: official Apple/WeChat/Alipay pages reviewed on 2026-10-20
SQLite schema: sqlite3 语法与 foreign_key_check 通过
official website: desktop/tablet/mobile viewport checks passed, 0 local console errors
analytics ingestion: public POST 202, hashed install id, report aggregation passed
analytics test data: cleared after verification
android bundle export: passed for 0.1.3
android preview site: 0.1.3 APK atomically deployed, Content-Length 109854465
android preview sha256: 89db26c0d314dde5800368c947aa74d501bfa42d329de90f465f5377366dfecf
promo video lint: 0 errors / 0 warnings
promo video runtime: 0 errors
promo video contrast: 69/69 passed WCAG AA
promo video encode: 1080x1920, 30fps, 27.0s, H.264 + AAC
promo video integrity: full decode passed, no black frames, no freeze >= 1.2s
```
