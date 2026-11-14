# 声账官网

日期：2026-11-14
状态：首版已上线；2026-11-14 增加付款页快捷记账特性并发布 0.3.3 (41)，公开下载已切到 0.3.3

## 1. 目标

官网服务于三个目标，按优先级排列：

1. 在 10 秒内让第一次访问的人理解“声账是什么、解决什么问题”。
2. 提供可信、可操作的产品下载与 GitHub 入口。
3. 通过真实产品界面、质量数据和隐私边界建立信任，而不依赖夸张营销文案。

官网不承担在线记账、账号注册、支付或客服表单。首版是纯静态页面，避免在没有业务必要时引入数据库、登录和额外攻击面。

## 2. 当前实现

源码目录：`deploy/site/`

| 文件 | 责任 |
| --- | --- |
| `index.html` | 页面语义结构、产品文案、SEO 与软件结构化数据 |
| `styles.css` | 品牌视觉、响应式布局、动画与无障碍降级 |
| `app.js` | 首屏语音演示、滚动揭示、导航、产品界面切换与轻量交互 |
| `assets/` | 官网使用的品牌 SVG、品牌分享图和真实产品截图 |

2026-11-14 新增“付款页快捷”体验页签：说明 Android 11+ 内测版可在微信、支付宝单笔付款详情页，通过控制中心磁贴或系统快捷动作触发；金额、商户、时间和分类生成可编辑卡，确认一次写入本地账本，不跳转、不重复输入。截图使用 `assets/screens/quick-capture.png`，由当前 RNWeb 确认卡以合成数据重新渲染，按钮文案为“确定收好了”；它不是原生浮层的真机截图。文案不承诺银行、安全窗口或未发布版本可用。隐私段落同步说明：只主动触发时读取当前页面，首次云端识别前单独征得同意，不后台监听、不读取相册。

同日已同步到生产 `/opt/shengzhang/site`，公网验收：`https://bigai.xin/shengzhang/` 返回 200；`assets/screens/quick-capture.png` 返回 200，SHA-256 `3b0b766cb7c7c44cae3f49e17e56df7ec7466f35d8f568235b9fb4bf49855e74`；第 4 页签可切换；390×844 视口 `scrollWidth=390`，无横向溢出；下载链接仍指向 `shengzhang-0.2.1-preview.apk`。

首版页面顺序：

1. 首屏：品牌主张、真实语音示例、Android 内测入口与 GitHub 入口；
2. 为什么做：对比传统记账步骤与一句话记账；
3. 怎么记：切换语音入账、月度统计、手动兜底和付款页快捷真实界面；
4. 能力：一句话多笔、8 秒撤销、本地优先和月度理解；
5. 隐私：语音、结构化与本地存储的数据边界；
6. 质量：200 条语音基线与 P95 耗时；
7. 独立开发者与开源说明；
8. Android 内测下载、GitHub Releases 与 iOS 后续计划。

## 3. 视觉方向

官网延续 App 的“温暖、克制、有一点灵动”：

- 米白纸张底色搭配墨色正文；
- 腮红 `#A45358` 作为主行动色，鼠尾草绿表达本地与安全；
- 宋体标题负责产品气质，苹方正文保证阅读效率；
- 小猪品牌角色只做可信、亲近的品牌锚点，不使用商业化表情或夸张拟人；
- 首屏用“声波进入账本”的动态装置作为记忆点，不使用通用 SaaS 渐变卡片。

所有新增颜色、间距和圆角优先沿用 `design/tokens/`。官网允许为了大屏叙事增加字号与留白，但不改变 App 内的视觉令牌基线。

## 4. 动效与降级

当前动效包括：

- 首屏文字错峰进入与标题手绘下划线；
- 语音波形、实时转写和两笔账单依次出现；
- 滚动进入时的元素揭示；
- 鼠标跟随光晕、设备轻微空间倾斜；
- 产品界面切换与下载卡片波形。

当系统设置 `prefers-reduced-motion: reduce` 时，所有动画缩短到几乎不移动，内容直接显示。交互动效不得承载唯一信息。

## 5. 链接策略

当前下载入口：

- 正式官网：`https://bigai.xin/shengzhang/`；
- Android 正式版：`https://bigai.xin/shengzhang/downloads/shengzhang-0.3.3-preview.apk?download=latest&version=0.3.3`；
- 全量版本索引：GitHub Releases；
- 源码：`https://github.com/zhixiang-luo/shengzhang`。

官网直接下载不要求 Expo 账户，适合把测试包发给没有 Expo 账号的用户。官网主文案和下载链接不展示版本号，服务器稳定路径始终指向最近一次需要重新安装的原生安装包；纯 JS 更新通过 EAS OTA 完成时，不改官网版本文案。GitHub Releases 继续使用 Tag 记录完整版本历史，但只有原生版本才必须附 APK。

2026-11-06 已发布 GitHub Pre-release `v0.2.1-preview.1`，并附完整 APK。Release 使用面向用户的更新标题，Tag、版本号和安装包校验值保留在发布说明中，便于追溯而不把版本号扩散到官网主界面。

## 6. 部署

生产静态目录为 `/opt/shengzhang/site`。Nginx 配置见 `deploy/nginx/shengzhang-test.conf`。

本地预览：

```bash
python3 -m http.server 4174 -d deploy/site
```

2026-10-29 已切换到正式域名 `https://bigai.xin/shengzhang/`。`bigai.xin` 与 `www.bigai.xin` 均解析到现有 ECS；根路径跳转到 `/shengzhang/`，误拼 `/shengzheng/` 也以 301 跳转到正确路径。

HTTPS 使用 Let’s Encrypt 证书，SAN 覆盖 `bigai.xin`、`www.bigai.xin`，有效期至 2027-01-26。`certbot.timer` 自动续期已通过 dry-run；阿里云安全组与 Ubuntu UFW 均已放行 443/TCP。官网 footer 展示 `京ICP备2026073107号` 并链接工信部备案系统。

0.3.3(41) 已完成微信、支付宝真机回归并发布。当前正式安装包为 `0.3.3 (41)`，大小 155,851,496 字节，SHA-256 为 `4c84fd68003048b12c634a43f8b47eec13dc0087c76c4ab8db320657eb495c3b`。本机与服务器均没有 OSS/CDN 凭据，因此本轮官网和更新接口使用服务器直连：

`https://bigai.xin/shengzhang/downloads/shengzhang-0.3.3-preview.apk?download=latest&version=0.3.3`

`download.bigai.xin` 的 OSS 对象仍保留 `0.2.1` 旧包，待 OSS 凭据恢复后再迁回 CDN。旧版可直接覆盖安装并保留本地账本；服务器 `/downloads/shengzhang-android-preview.apk` 只保留作过渡兼容。

首页主文案不展示内部 versionCode，下载链接使用版本化路径并附加 `?download=latest&version=0.3.3`，便于统计下载来源并避免浏览器把旧 APK 当作同一资源继续使用。公开目录只存安装包和发行文件，禁止存放录音、账本、密钥或用户备份。

2026-11-05 已完成 CDN HTTPS 切换：`download.bigai.xin` 使用云盾证书
`cert-95qrl`，启用 HTTP/2、OCSP Stapling 和 HTTP → HTTPS 跳转。公网验收确认
证书链与 SAN 正确、HTTP/2 返回 200、Range 下载可用、完整 APK 的 SHA-256 与本地文件一致，
重复请求命中 CDN 缓存。阿里云账户仍保留月流量、峰值带宽和 HTTPS 请求数硬封顶。

## 7. 验收基线

首版已检查：

- `1440 × 1000`、`768 × 1024`、`390 × 844`、`375 × 812` 四种视口；
- 页面无横向滚动；
- 移动端菜单可打开、关闭，并支持 `Escape` 关闭；
- 四个产品界面标签可通过点击和左右方向键切换；
- 所有图片与本地资源成功加载；
- 页面自身无控制台错误；
- 减少动态效果设置可用；
- 下载、GitHub 与 Releases 链接均有明确目标。

## 8. 后续迭代

1. 用真实 Android 与 iPhone 设备截图替换原型截图；
2. 后续原生版本按需把 APK 附加到对应 GitHub Release，OTA-only 版本只保留更新说明；
3. 保持正式域名的证书续期、API/WebSocket 健康检查和路径迁移监控；
4. 增加可单独分享的社交预览图与产品演示视频；
5. 在不引入追踪的前提下，评估是否需要匿名下载来源统计；
6. 月末回顾和分享卡已进入官网能力说明，后续用真机截图替换原型截图。

## 9. 首支宣传片

2026-10-21 已产出 27 秒、1080 × 1920、30fps 的竖屏宣传片《一句话，长出三笔账》。成片位于 `design/exports/video/声账-宣传片-说一句就记好.mp4`，可复现工程位于 `design/video/shengzhang-promo/`。

内容只陈述当前已实现能力：按住即录、松手自动入账、一句话多笔、8 秒整批撤销、本地账本、手动兜底和月度统计。短片使用已评审原型截图，不使用虚拟用户量、虚构商店状态或尚未上线的微信登录与云备份。正式真机截图产出后，应替换片中三处界面素材并重新渲染。

另以 `video-shotcraft` 镜头卡制作了 25.23 秒、1920 × 1080 横屏版《一句话，两笔账》，适合官网首屏、产品发布和演示场景。当前横版和 27 秒竖版均使用晓晓普通话女声旁白。横版主版位于 `design/exports/video/声账-shotcraft-宣传片.mp4`；不含配乐、保留旁白与拟音的无 BGM 版位于 `design/exports/video/声账-shotcraft-宣传片-无BGM.mp4`；竖版位于 `design/exports/video/声账-宣传片-说一句就记好.mp4`。可复现工程分别位于 `design/video/shengzhang-shotcraft/` 与 `design/video/shengzhang-promo/`。两版横版画面逐帧一致，界面仍使用已评审原型截图，正式真机素材可用后应替换并重新渲染。
