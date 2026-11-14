# 0.3.2 云端原页面浮层验证与交付

日期：2026-11-13。基线HEAD：219ae1da0d4139634d45e9777c85d644e1458562，feature/screen-bill-capture 未提交源码快照；不以HEAD单独代表本轮实现。规格见 [35](./35-payment-screen-capture.md)，批准决策见 [39](./39-cloud-overlay-and-shortcuts.md)，系统入口调研见 [40](./40-shortcut-platform-support.md)。公开稳定仍0.2.1。

## 1. 已执行检查

Node22.19.0：pnpm test 共343项通过（domain137、mobile112、API94）；pnpm typecheck、pnpm lint、API build、Android与iOS Expo export通过。`--platform all`最初会要求本项目未配置的Web依赖，随后明确分别export Android/iOS成功；没有为此增加无关依赖。

原生规则通过20项JUnit，新增金额/时间/任务有效期/编辑合并/强阻断/分类锁定类型均有红绿记录。Android35 API K2编译覆盖服务、浮层、网络、SQLite、快捷及分享类；排除Expo/ML Kit依赖的ScreenCaptureModule和ScreenOcrProcessor，资源R用编译桩，不能替代完整Gradle。完整本地Gradle因本机残缺NDK缺source.properties（CXX1101）中断，后续以EAS完整构建验证。

独立只读代码审查已完成，修复了授权等待/旧配置竞争、off→on旧图复活、评测脚本跨供应商Key、前台账本不刷新和分类重识别丢类型问题，当前无未解决P1/P2。首次分享授权Modal被新图初始化关闭也已在实际RNWeb复现后修复。

## 2. 应用内UI检查

实际screen-capture组件及useScreenCapture Hook通过RNWeb运行；仅原生/路由/存储/网络边界使用合成fixtures，不是另画HTML。320×568、360×640、390×844默认无页面滚动，主按钮可见。修改金额/内容/分类后双击只保存一笔并退出、保存失败保留编辑、慢云端不覆盖人工修改、新capture丢弃旧响应、首次无授权不上传且可拒绝/重新同意、待付款补金额仍禁保存、五分钟到期清理均通过，浏览器无运行时错误。

报告为 [browser-qa.json](../design/exports/quick-accounting-032/browser-qa.json)，实际分享卡 [320宽](../design/exports/quick-accounting-032/ready-320.png)、[360宽](../design/exports/quick-accounting-032/ready-360.png)、[390宽](../design/exports/quick-accounting-032/ready-390.png)、[未知金额](../design/exports/quick-accounting-032/unknown-320.png)。已人工查看320画面。自动化最初遇到分类列表需滚动、fade动画和模糊“完成”文本匹配，确认是harness定位/等待后修正，不更改产品以绕过检查。这些不是Android原生浮层或真实支付模板验收。

## 3. 原生构建及包级检查

EAS preview/channel=preview：0.3.2(23)，buildId=`54e6df65-1b99-4b3d-be1e-1f8348c3ba7c`，[构建页面](https://expo.dev/accounts/xiaozhuluozhixiang/projects/shengzhang/builds/54e6df65-1b99-4b3d-be1e-1f8348c3ba7c)。2026-11-13 13:31:47 +08:00 FINISHED，完整原生编译通过；未提交源码快照，基线HEAD单独不能复现全部改动。

[下载本轮APK](https://expo.dev/artifacts/eas/iAw6SzUYkncDnR9TeDRfg7i6klKUY_41z_pCBYHXP4E.apk)。本机 `dist/releases/shengzhang-0.3.2-preview.apk`，不提交Git。通过服务器/tmp下载再scp取回，远端与本机大小/SHA256一致；没有改动线上站点或下载入口。

| 检查项 | 结果 |
| --- | --- |
| 包名 / 版本 | com.shengzhang.ledger / 0.3.2 (23) |
| minSdk / targetSdk | 30 / 36 |
| 文件大小 | 155,821,768 字节 |
| SHA256 | `70ebb63facb3663dd369f21ccdf5999387bb5e352da4270e64b67994ac44f48d` |
| ZIP | 全部条目CRC通过 |
| 签名 | APK Signature Scheme v2 verified |
| 证书SHA256 | `d0249dc6bbe850212eccad3d16ef28eb9b245edcba1aba8bf9f572a767230955` |
| 签名连续性 | 与0.2.1/0.3.0/0.3.1一致，具备覆盖安装的签名条件；设备账本完整性仍需验收 |
| Manifest | 含采集服务、系统磁贴、单图分享、独立快捷Activity；shortcut exported/noHistory/空taskAffinity符合预期 |
| 权限 | 不含SYSTEM_ALERT_WINDOW、READ_MEDIA_IMAGES、READ_MEDIA_VISUAL_USER_SELECTED；仍有Expo继承的legacy READ/WRITE_EXTERNAL_STORAGE声明，新截图分享不请求它们 |
| DEX | 系统/分享/快捷入口、配置桥、原生确认按钮/加载提示、私有配置、同库SQL和视觉endpoint标记齐全 |

详情见 [apk-validation.json](../design/exports/quick-accounting-032/apk-validation.json)。最初按内部原类名检查时未命中；已确认APK带R8 9.2.14 full/release标记，内部类被改名/内联，所以改查必须保留的入口与功能字符串，不把混淆当缺包，也不冒充设备运行验证。

## 4. 模型与部署边界

本轮没有发布OTA或替换官网/CDN/稳定更新策略。线上API仍为20261113-quick-accounting-031-time、显式硅基Qwen/Qwen3-VL-8B-Instruct。源码完成官方千问qwen3-vl-plus北京端点/非思考/JSON Object/专用Key适配，但本地及服务端无官方Key，未调用Plus、未做Plus精度对比、未切换服务。历史6张合成图8B/32B结果只保留在38号，不能外推真实模板或Plus准确率。

## 5. 设备验收

adb查询无连接设备，未执行模拟器或真实Android支付测试。需要用户先安装0.3.2测试：首次云同意及无障碍连接；微信/支付宝详情磁贴与边缘按钮原地卡；多个金额/商品或仅商户/交易时间；人工修改后重识别；一次保存和回App列表统计；断网/配额/保存失败；连点/关闭/换App/锁屏/五分钟；撤权及off→on；已有账本覆盖安装完整性。厂商背部/侧键仅在系统可选具体声账动作时测试，不承诺任意机型。银行安全窗口不可绕过，iOS本轮没有实现。
