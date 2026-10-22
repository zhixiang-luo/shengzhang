import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
} from 'remotion';
import { CaptionStrip, TitleCardUnit, WarmFlash } from './shengzhang/Overlays';
import { ProductHeroScene, PRODUCT_SCENE_DURATION } from './shengzhang/scenes/ProductHeroScene';
import { OutroScene, OUTRO_SCENE_DURATION } from './shengzhang/scenes/OutroScene';
import { StatsScene, STATS_SCENE_DURATION } from './shengzhang/scenes/StatsScene';
import { VoiceScene, VOICE_SCENE_DURATION } from './shengzhang/scenes/VoiceScene';
import { COLORS } from './shengzhang/theme';

export const SHOTS = {
  voice: { from: 0, duration: VOICE_SCENE_DURATION },
  cardOne: { from: 172, duration: 60 },
  product: { from: 232, duration: PRODUCT_SCENE_DURATION },
  cardTwo: { from: 400, duration: 50 },
  stats: { from: 450, duration: STATS_SCENE_DURATION },
  outro: { from: 610, duration: OUTRO_SCENE_DURATION },
} as const;

export const TOTAL_FRAMES = 757;

export const TITLE_CARDS = {
  cardOne: { text: '一句话，*两笔账。*' },
  cardTwo: { text: '不用登录，账本先写进\n*这台手机。*' },
} as const;

export const CAPTIONS = [
  {
    from: SHOTS.voice.from + 24,
    duration: 96,
    text: '实时转写 · 金额、分类和日期一起整理',
  },
  {
    from: SHOTS.product.from + 36,
    duration: 106,
    text: '一句话 2 笔 · 自动分类 · 8 秒整批撤销',
  },
  {
    from: SHOTS.stats.from + 58,
    duration: 86,
    text: '每日趋势 · 分类占比 · 最高支出日',
  },
] as const;

export const FLASH_CUTS = [SHOTS.product.from, SHOTS.stats.from, SHOTS.outro.from];

export const MUSIC = { src: 'audio/music.wav', volume: 1 } as const;
export const SFX_BUS = { src: 'audio/sfx.wav', volume: 1 } as const;
export const VOICE_CUES = [
  { from: 173, src: 'audio/vo-xiaoxiao/03.wav', volume: 1.35 },
  { from: 236, src: 'audio/vo-xiaoxiao/04.wav', volume: 1.35 },
  { from: 307, src: 'audio/vo-xiaoxiao/05.wav', volume: 1.35 },
  { from: 401, src: 'audio/vo-xiaoxiao/06.wav', volume: 1.35 },
  { from: 488, src: 'audio/vo-xiaoxiao/07.wav', volume: 1.35 },
  { from: 620, src: 'audio/vo-xiaoxiao/08.wav', volume: 1.38 },
] as const;

export type ShengzhangMainProps = { bgm?: boolean };

export const ShengzhangMain: React.FC<ShengzhangMainProps> = ({ bgm = true }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.canvas }}>
    {bgm ? <Audio src={staticFile(MUSIC.src)} volume={MUSIC.volume} /> : null}
    <Audio src={staticFile(SFX_BUS.src)} volume={SFX_BUS.volume} />
    {VOICE_CUES.map((cue) => (
      <Sequence key={cue.src} from={cue.from} durationInFrames={TOTAL_FRAMES - cue.from}>
        <Audio src={staticFile(cue.src)} volume={cue.volume} />
      </Sequence>
    ))}

    <Sequence from={SHOTS.voice.from} durationInFrames={SHOTS.voice.duration}>
      <VoiceScene />
    </Sequence>
    <Sequence from={SHOTS.cardOne.from} durationInFrames={SHOTS.cardOne.duration}>
      <TitleCardUnit text={TITLE_CARDS.cardOne.text} duration={SHOTS.cardOne.duration} />
    </Sequence>
    <Sequence from={SHOTS.product.from} durationInFrames={SHOTS.product.duration}>
      <ProductHeroScene />
    </Sequence>
    <Sequence from={SHOTS.cardTwo.from} durationInFrames={SHOTS.cardTwo.duration}>
      <TitleCardUnit text={TITLE_CARDS.cardTwo.text} duration={SHOTS.cardTwo.duration} />
    </Sequence>
    <Sequence from={SHOTS.stats.from} durationInFrames={SHOTS.stats.duration}>
      <StatsScene />
    </Sequence>
    <Sequence from={SHOTS.outro.from} durationInFrames={SHOTS.outro.duration}>
      <OutroScene />
    </Sequence>

    {CAPTIONS.map((caption) => (
      <Sequence key={caption.from} from={caption.from} durationInFrames={caption.duration}>
        <CaptionStrip text={caption.text} duration={caption.duration} />
      </Sequence>
    ))}

    {FLASH_CUTS.map((cut) => (
      <Sequence key={cut} from={cut - 5} durationInFrames={10}>
        <WarmFlash duration={10} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

