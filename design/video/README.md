# 声账宣传片工程

本目录包含两套可复现的宣传片工程。

## 横版

`shengzhang-shotcraft/`：1920×1080、25.23 秒，使用 video-shotcraft 镜头卡与 Remotion。

```bash
cd shengzhang-shotcraft
npm install
npm run audio
npm run dev
```

生成旁白需要 Edge TTS，详见项目内 README。

## 竖版

`shengzhang-promo/`：1080×1920、27 秒，使用 HyperFrames HTML + GSAP。

```bash
cd shengzhang-promo
npm run narration
npm run dev
```

生成的渲染结果保留在本机，不进入 Git。最终 MP4 通过 GitHub Release 分发。
