# 音频来源

本宣传片最终使用的音频均由项目内脚本生成，不包含 Mixkit、Kenney 或其他第三方音轨。

- `public/audio/music.wav`：`scripts/make_score.py --music-only` 生成的原创程序化配乐。
- `public/audio/sfx.wav`：`scripts/make_score.py --sfx-only` 生成的原创 whoosh、riser、impact 与钟声。
- `public/audio/vo-xiaoxiao/03.wav` 至 `08.wav`：通过 `edge-tts` 调用 Microsoft `zh-CN-XiaoxiaoNeural` 生成，并经本地 EQ、压缩和电平标准化处理的普通话女声旁白。公开宣传旁白由 `scripts/voice_lines.json` 固定，生成脚本为 `scripts/make_voice_edge.py`。
- `public/audio/vo-yunyang/` 与 `public/audio/vo-tingting/`：上一版男声和原女声旁白，仅作回退与对比保留，不进入当前成片。
- `public/audio/soundtrack.wav`：仅用于试听的预览混音。

Remotion 使用自己的独立许可；最终视频由 Remotion 4.0.484 渲染。
