# 快捷入口与系统手势支持

核对日期：2026-11-13。声账当前开发 Android 11+ 主动截图及无障碍原页面浮层；iOS 本轮只调研，没有实现截图 App Intent。

## 结论

设置页主引导为控制中心磁贴，另以简短文字说明系统手势。本轮 0.3.3 按用户反馈删除屏幕边缘按钮和“添加快捷动作”按钮；App 仍保留可供兼容系统调用的动作。系统是否允许把背部敲击、侧键、双击屏幕绑定到这个动作，由厂商、型号、系统版本和用户设置决定；不能承诺所有 Android 任意绑定。普通“打开声账”只打开主 App，不能等同于截取原付款页。

## 官方可确认的范围

| 入口 | 支持及边界 | 官方依据 |
| --- | --- | --- |
| Android 快捷设置磁贴 | TileService 从 API 24 提供；用户决定添加、位置与顺序。API 33+ 可请求系统添加确认；声账截图仍要求 API 30+。 | [Quick Settings tiles](https://developer.android.com/develop/ui/views/quicksettings-tiles) |
| Android 无障碍按钮 | 声明请求按钮并注册 AccessibilityButtonController 回调；显示方式、可分配性受系统及导航设置限制。 | [AccessibilityButtonController](https://developer.android.com/reference/android/accessibilityservice/AccessibilityButtonController) |
| 音量键无障碍快捷方式 | 常见用途是长按两个音量键启停选定无障碍应用，不能据此承诺执行一次截图。 | [Google 无障碍快捷方式](https://support.google.com/accessibility/android/answer/6151848?hl=zh-Hans) |
| Pixel 背部 Quick Tap | Pixel 4a (5G) 及更新机型可配置双敲，包括“打开应用”；能否选声账具体动作需实测。 | [Pixel 手势](https://support.google.com/pixelphone/answer/7443425?hl=zh-Hans) |
| 小米/Redmi 背部轻敲 | Xiaomi 14 官方支持背部双/三击截屏；本轮未找到全系型号/HyperOS 任意动作映射表，不能外推。 | [Xiaomi 14 FAQ](https://www.mi.com/global/support/faq/details/KA-92103/) |
| OPPO/ColorOS | 官方有双击亮/熄屏及黑屏手势，但不能证明付款页亮屏时双击可启动第三方记账。 | [ColorOS](https://www.oppo.com/cn/coloros/) |
| vivo | 官方帮助列出 X300s/X300 Ultra 亮屏背部双/三敲可启动应用；证据为帮助集合页，不外推到全系，实际动作列表需实测。 | [vivo 帮助](https://www.vivo.com/service/questions/all?categoryId=156&questionId=2140#12) |
| 三星 Galaxy 侧键 | 按两下可启动 App，部分功能可继续选择动作，机型及系统选项不同。不能保证所有第三方动作都出现。 | [三星侧键说明](https://www.samsung.com.cn/support/mobile-devices/how-to-customize-the-side-button-with-new-features-on-your-galaxy-phone-and-tablet/) |
| iPhone 轻点背面 | iPhone 8+、iOS 14+ 可把双击/三击绑定快捷指令。 | [Apple 轻点背面](https://support.apple.com/zh-cn/111772) |
| iPhone 操作按钮 | 配备该硬件的型号可设为运行快捷指令，并非所有 iPhone 都有。 | [Apple 操作按钮](https://support.apple.com/zh-cn/guide/iphone/iphe89d61d66/ios) |

Android 可提供动态/固定快捷方式与独立显式动作 Activity。[快捷方式概览](https://developer.android.com/develop/ui/views/launch/shortcuts)、[创建快捷方式](https://developer.android.com/develop/ui/views/launch/shortcuts/creating-shortcuts)。固定到桌面只证明 Launcher 支持，不能证明厂商手势选项一定接受它。已经回到桌面后点击快捷方式，前台已不是付款页，声账应提示先回付款详情，而不是截图桌面或猜账单。

## Android 当前开发入口

1. 标准控制中心“声账记账”磁贴，收起系统面板后采集。
2. 无障碍系统快捷按钮，在系统支持且用户分配时触发同一动作。
3. 独立“快捷记账”动作及系统可调用快捷方式，供能选择具体动作的系统使用。中转 Activity 立即结束，等待原付款页恢复才截图，不打开 RN 主页面。
4. 用户主动分享单张截图的应用内确认兜底，不要求无障碍。

不再提供边缘按钮或手动“添加快捷动作”入口。系统磁贴添加状态通过生命周期与添加确认保存，设置返回前台或控制中心收起时刷新。所有保留入口复用单次任务，截图前隐藏自身窗口；关闭/过期/新任务丢弃旧结果，连点一次任务不重复入账。

Redmi K60 / HyperOS 的背部轻敲只能在系统“设置 → 更多设置 → 快捷手势 → 背部轻敲”里绑定，第三方 App 不能监听原始敲击事件。声账已发布动态快捷方式 `screen-bill-capture`；若该系统的动作列表能选到“快捷记账”，可直接绑定。若只有“打开应用”，选择声账只会进入首页，不能采集下面的付款页；这种情况需要额外提供一个专用启动入口（会以第二个应用图标出现在系统选择器中），不能靠现有主入口伪装成截图动作。

## iOS 的区别

App 可通过 [App Intents](https://developer.apple.com/documentation/appintents) 暴露动作给快捷指令，执行是否切 App 取决于能力与 [supportedModes](https://developer.apple.com/documentation/appintents/appintent/supportedmodes)。普通 iOS App 没有 Android 式无障碍跨 App 浮层；[扩展模型](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionOverview.html) 的界面受宿主及扩展点约束。

“轻点背面→截屏→声账动作”可以另行研究，必须在打开声账前截图；快捷指令可能请求 [数据访问授权](https://support.apple.com/zh-cn/guide/shortcuts/apd717155455/ios)。不能承诺 iPhone 与 Android 一样原地浮层、无提示、不切 App。

## 待真机验证

用户尚未提供手机型号、Android/厂商系统版本，当前不对单一手势做支持承诺。验收记录应包括这些版本以及磁贴/按钮/背部/侧键菜单、可选目标是 App 还是具体动作、微信/支付宝各自结果。另测服务被停用/回收、锁屏、安全窗口、连续任务与旋转；首次启动服务和权限撤回不能触发自动截图。
