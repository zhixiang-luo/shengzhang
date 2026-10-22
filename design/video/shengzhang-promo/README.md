# 声账宣传片项目

竖屏产品宣传片，使用 HyperFrames HTML + GSAP 制作，最终输出 MP4。

当前旁白使用 Edge TTS `zh-CN-XiaoxiaoNeural`（晓晓普通话女声）。生成依赖：

```bash
python3 -m pip install edge-tts
npm run narration
```

原 Tingting 女声旁白保留在 `assets/audio/vo-tingting/`，用于回退比较。

## 文件

- `index.html`：25 秒主时间线、场景切换与音轨。
- `compositions/`：五个场景的独立动画。
- `assets/`：项目内真实产品截图、品牌资产、旁白与配乐。
- `SCRIPT.md`：创意、分镜、旁白与事实边界。
- `DESIGN.md`：色彩、字体和禁用项。
- `scripts/`：可复现的音频生成脚本。

## 常用命令

```bash
npx hyperframes@0.8.185 check
npx hyperframes@0.8.185 render --quality delivery --fps 30
```

macOS 如果停留在 `Checking browser`，可直接指定已安装的 Chrome Headless Shell：

```bash
HYPERFRAMES_BROWSER_PATH="$HOME/.cache/puppeteer/chrome-headless-shell/mac_arm-121.0.6167.85/chrome-headless-shell-mac-arm64/chrome-headless-shell" \
  npx hyperframes@0.8.185 render --quality delivery --fps 30 --workers 4 --browser-gpu --output renders/shengzhang-promo.mp4
```

## 验收结果

- HyperFrames 0.8.185 lint：0 errors / 0 warnings
- Runtime、layout、motion：0 errors / 0 warnings
- Contrast：69 / 69 text checks pass WCAG AA
- 成片：1080 × 1920，30fps，27 秒，810 帧，H.264 + AAC 48kHz stereo，约 -16.0 LUFS
- 最终交付：`design/exports/video/声账-宣传片-说一句就记好.mp4`
- SHA-256：`998e5a5a12760841684740d1a4501aaa8e60ccbd722ecc5814a95ac986ad4e9d`

界面素材来自 `prototype/screenshots/` 的已评审原型，不代表已替换为正式真机截图。
