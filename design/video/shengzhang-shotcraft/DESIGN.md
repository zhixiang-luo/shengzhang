# 声账 · Shotcraft 设计 spec

## 视觉方向

温暖克制的奶油纸产品片。镜头不把手机当成一张扁平截图，而是把设备当成一件有重量、有玻璃反光和柔和落地影的物件。主色只来自产品自身：奶油纸、暖墨、腮红、鼠尾草。大标题使用宋体，交互和字幕使用苹方；强调色只给“记好”与关键金额。

## Tokens

- Canvas：`#FAF7F0`
- Raised：`#FFFDF8`
- Ink：`#292624`
- Ink secondary：`#726B64`
- Blush：`#E89A96`
- Blush deep：`#9D5657`
- Blush soft：`#F7DDD8`
- Sage：`#9EAD98`
- Sage deep：`#63795E`
- Sand：`#E1BD7B`
- Display：`"Songti SC", "STSong", serif`
- Body：`"PingFang SC", "Hiragino Sans GB", sans-serif`
- Number：`"Avenir Next", "DIN Alternate", sans-serif`
- Accent radius：28 / 48 / 999px
- Product shadow：近影 `0 4px 12px`，远影 `0 48px 100px -24px`

## 动效性格

- 三个词：克制、清楚、有机
- 品牌能量轴：中低
- 调性轴：友好、可信
- 主入场时长：24–30f
- 主入场缓动：`bezier(0.16,1,0.3,1)`
- 回落缓动：`bezier(0.22,1,0.36,1)`
- 过冲：只用于账单 chip 落位，≤1.08
- 相机：缓慢单向运动，不使用手持抖动

## 镜头映射

| 功能 | 镜头卡 · 变体 | 选用理由 |
| --- | --- | --- |
| 实时听清一句话 | `voice-waveform-live · voice-waveform-live` | 波形与逐词转写是产品主路径本身 |
| 一句话多笔与自动保存 | `radial-ripple-phone-chips · radial-ripple-phone-chips` | 真机界面居中，功能 chip 分列两侧，完整表达移动端产品 |
| 字卡呼吸位 | `paper-title-card · paper-title-card` | 与纸感品牌同源，承担两个价值转折 |
| 月度统计 | `crane-rise-reveal · crane-rise-reveal` | 从一行金额特写拉到完整统计，表达“细节到全局” |
| 收好并消失的复杂性 | `ui-strip-away-outro · ui-strip-away-outro` | 用一次“收好”让功能层逐层退场，最后只留下品牌 |

## Styleframe

跳过独立静态 styleframe。项目已有严格设计令牌、UI 交接规范和已评审产品截图，方向不需要另行试色。以此设计 spec 与已评审截图作为视觉门禁。

## 镜头卡适配

- `voice-waveform-live` 保留 64 条声纹、1.6f 滚动、说停包络和提交塌缩；只替换文案、品牌色和真实产品信息。
- `radial-ripple-phone-chips` 保留四层错相波纹、手机落位和 chip spring pop；真实结果页不是长 feed，因此屏内只做 12px 慢速视差，不伪造额外滚动内容。
- `crane-rise-reveal` 保留焦点到全局的单向升降臂和不对称缓动；因主体是竖屏手机而不是桌面窗口，起点倍数从 3.0 适配为 1.55，并增加对目标金额行的局部压暗与强调框。
- `ui-strip-away-outro` 保留外围到中心的六层错峰蒸发、按钮迁移与品牌接力；触发文案改为产品语义“收好”。

## 数据口径

片中使用仓库公开测试句“午饭 25，打车 18”，与结果截图中的“已记入 2 笔”保持一致。统计页直接使用原型截图中的演示数据，收尾金额同步采用截图中的 `¥2,668.80` 与 `−12.4%`。所有截图均来自 `prototype/screenshots/`，不包含真实用户信息。

