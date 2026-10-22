# 声账 · video-shotcraft 宣传片

用 video-shotcraft 的镜头卡和 Remotion 流程制作，1920×1080、30fps、25.23 秒。成片包含 6 段晓晓普通话女声旁白（`zh-CN-XiaoxiaoNeural`）、原创程序化配乐和完整产品叙事。

## 镜头

- `voice-waveform-live`：实时声纹、逐词转写、提交后收成账单气泡。
- `paper-title-card`：两次价值转折字卡。
- `radial-ripple-phone-chips`：真实语音结果页与功能 chips。
- `crane-rise-reveal`：月度统计的金额特写到全局升降揭示。
- `ui-strip-away-outro`：按下“收好”后界面逐层蒸发，品牌定版。

## 运行

```bash
npm install
npm run voice:prepare
npm run audio
npm run dev
```

## 渲染

```bash
npm run render
```

macOS 若 Remotion 浏览器下载受限，可追加：

```bash
--browser-executable=/path/to/chrome-headless-shell
```

`npm run voice:prepare` 会生成旁白所需目录并提示 Edge TTS 安装方式；`npm run audio` 用 `scripts/make_score.py` 合成原创配乐，通过 `scripts/make_voice_edge.py` 生成晓晓女声旁白并完成响度标准化。旁白按分镜时间轴逐句放置，最终响度目标为 -16 LUFS。

工作台拆解校验（需要先在 video-shotcraft 仓库中链接本工程）：

```bash
cd /path/to/video-shotcraft/workbench
node scripts/open.mjs /path/to/design/video/shengzhang-shotcraft
npm run parity -- --frames 18,205,321,548,740
```

## 验收

- TypeScript：通过。
- 成片：1920×1080、30fps、25.23 秒、757 帧、H.264 + AAC 48kHz stereo。
- 音频：带 BGM 版约 -16.0 LUFS / -1.8 dBTP；无 BGM 版约 -16.0 LUFS / -2.7 dBTP。
- 完整解码、黑帧检测：通过。
- 关键帧 OCR：品牌、核心功能、统计页与结尾文案均在安全区内。
- 结尾品牌 hold 约 1.45 秒；其余段落无 1.2 秒以上静态画面。
- 工作台 parity：5 个抽查帧全部一致（最大差异 8 / 2,073,600 像素）。
- 主版：`design/exports/video/声账-shotcraft-宣传片.mp4`，SHA-256 `5cd3f07f908b9e58537067e95accb03795c30fe60507236689d00e8f81c371ef`。
- 无 BGM 版：`design/exports/video/声账-shotcraft-宣传片-无BGM.mp4`，SHA-256 `65b06e42606d9152cd214bfe7e63960730a81c1442352291e7fb9e6a3ed0a3ab`。
- 关键帧总览：`design/exports/video/声账-shotcraft-关键帧.png`。
- 旁白候选：`design/exports/video/声账-旁白候选-云扬男声.mp3`、`声账-旁白候选-云希男声.mp3`、`声账-旁白候选-晓晓女声.mp3`；当前成片使用晓晓。

## 事实边界

- 界面来自 `prototype/screenshots/` 的已评审原型截图。
- 示例账单使用公开测试句“午饭 25，打车 18”，与结果截图的“已记入 2 笔”一致。
- 不宣称微信登录、云备份、会员或应用商店已上架。
- 音频来源与授权见 [AUDIO-ATTRIBUTION.md](./AUDIO-ATTRIBUTION.md)。
- 原 `Tingting` 女声和 `Yunyang` 男声分别保留在 `public/audio/vo-tingting/`、`public/audio/vo-yunyang/` 与 `design/exports/video/archive/`，便于回退比较。
