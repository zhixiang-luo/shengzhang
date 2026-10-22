import { createElement, type FC } from 'react';
import {
  CAPTIONS,
  FLASH_CUTS,
  MUSIC,
  SFX_BUS,
  SHOTS,
  ShengzhangMain,
  TITLE_CARDS,
  TOTAL_FRAMES,
  VOICE_CUES,
} from './Main';
import { CaptionStrip, CAPTION_DEFAULTS, TitleCardUnit, WarmFlash } from './shengzhang/Overlays';
import { ProductHeroScene } from './shengzhang/scenes/ProductHeroScene';
import { OutroScene } from './shengzhang/scenes/OutroScene';
import { StatsScene } from './shengzhang/scenes/StatsScene';
import { VoiceScene } from './shengzhang/scenes/VoiceScene';
import { COLORS } from './shengzhang/theme';

type Field = Record<string, unknown> & { type: string; key: string; label: string; default: unknown };

const textarea = (key: string, label: string, value: string): Field => ({
  type: 'textarea',
  key,
  label,
  default: value,
});
const color = (key: string, label: string, value: string): Field => ({
  type: 'color',
  key,
  label,
  default: value,
});
const slider = (key: string, label: string, value: number, min: number, max: number, step = 1): Field => ({
  type: 'slider',
  key,
  label,
  default: value,
  min,
  max,
  step,
  unit: 'px',
});

const CAPTION_SCHEMA: Field[] = [
  { type: 'text', key: 'text', label: '文案', default: '' },
  slider('bottom', '底距', CAPTION_DEFAULTS.bottom, 20, 220, 2),
  slider('fontSize', '字号', CAPTION_DEFAULTS.fontSize, 22, 44, 1),
  color('color', '文字色', CAPTION_DEFAULTS.color),
  color('accent', '方点色', CAPTION_DEFAULTS.accent),
];

const TITLE_SCHEMA: Field[] = [
  textarea('text', '文案（*词* = 强调）', ''),
  slider('fontSize', '字号', 114, 72, 134, 1),
  color('accent', '强调色', COLORS.blushDeep),
  color('paper', '纸底', '#F9F6F1'),
  color('ink', '墨色', '#201C19'),
  color('muted', '副标色', COLORS.ink2),
];

export const TitleUnit: FC<{
  text?: string;
  duration?: number;
  accent?: string;
  paper?: string;
  ink?: string;
  muted?: string;
  fontSize?: number;
}> = ({ text = '', duration = 54, accent, paper, ink, muted, fontSize }) =>
  createElement(TitleCardUnit, { text, duration, accent, paper, ink, muted, fontSize });
TitleUnit.displayName = 'TitleCardUnit';

export const CaptionUnit: FC<{
  text?: string;
  duration?: number;
  bottom?: number;
  fontSize?: number;
  color?: string;
  accent?: string;
}> = ({
  text = '',
  duration = 80,
  bottom = CAPTION_DEFAULTS.bottom,
  fontSize = CAPTION_DEFAULTS.fontSize,
  color = CAPTION_DEFAULTS.color,
  accent = CAPTION_DEFAULTS.accent,
}) => createElement(CaptionStrip, { text, duration, bottom, fontSize, color, accent });
CaptionUnit.displayName = 'CaptionStrip';

export const FlashUnit: FC<{ duration?: number }> = ({ duration = 10 }) =>
  createElement(WarmFlash, { duration });
FlashUnit.displayName = 'WarmFlash';

export const WORKBENCH = {
  name: '声账 · 一句话，两笔账',
  fps: 30,
  width: 1920,
  height: 1080,
  total: TOTAL_FRAMES,
  background: COLORS.canvas,
  shots: [
    {
      id: 'voice',
      label: 'S1 实时声纹 → 两笔账',
      from: SHOTS.voice.from,
      duration: SHOTS.voice.duration,
      component: VoiceScene,
      cardId: 'shengzhang-voice',
      cardName: '声账 · 实时声纹',
    },
    {
      id: 'card-one',
      label: '字卡一 · 一句话两笔账',
      from: SHOTS.cardOne.from,
      duration: SHOTS.cardOne.duration,
      component: TitleUnit,
      props: { text: TITLE_CARDS.cardOne.text, accent: COLORS.blushDeep, paper: '#F9F6F1', fontSize: 114 },
      schema: TITLE_SCHEMA,
      durationProp: 'duration',
      cardId: 'shengzhang-title',
      cardName: '声账 · 字卡',
    },
    {
      id: 'product',
      label: 'S2 真机结果页与功能 chips',
      from: SHOTS.product.from,
      duration: SHOTS.product.duration,
      component: ProductHeroScene,
      cardId: 'shengzhang-product',
      cardName: '声账 · 产品定格',
    },
    {
      id: 'card-two',
      label: '字卡二 · 本地账本',
      from: SHOTS.cardTwo.from,
      duration: SHOTS.cardTwo.duration,
      component: TitleUnit,
      props: { text: TITLE_CARDS.cardTwo.text, accent: COLORS.blushDeep, paper: '#F9F6F1', fontSize: 114 },
      schema: TITLE_SCHEMA,
      durationProp: 'duration',
      cardId: 'shengzhang-title',
      cardName: '声账 · 字卡',
    },
    {
      id: 'stats',
      label: 'S3 月度统计升降揭示',
      from: SHOTS.stats.from,
      duration: SHOTS.stats.duration,
      component: StatsScene,
      cardId: 'shengzhang-stats',
      cardName: '声账 · 统计',
    },
    {
      id: 'outro',
      label: 'S4 收好 → 品牌定版',
      from: SHOTS.outro.from,
      duration: SHOTS.outro.duration,
      component: OutroScene,
      cardId: 'shengzhang-outro',
      cardName: '声账 · 品牌收尾',
    },
  ],
  transitions: FLASH_CUTS.map((cut, index) => ({
    id: `warm-flash-${index + 1}`,
    label: `暖白闪 @${cut}f`,
    from: cut - 5,
    duration: 10,
    component: FlashUnit,
    durationProp: 'duration',
    cardId: 'warm-flash',
    cardName: '暖白闪转场',
  })),
  captions: CAPTIONS.map((caption, index) => ({
    id: `caption-${index + 1}`,
    label: caption.text,
    from: caption.from,
    duration: caption.duration,
    component: CaptionUnit,
    props: {
      text: caption.text,
      bottom: CAPTION_DEFAULTS.bottom,
      fontSize: CAPTION_DEFAULTS.fontSize,
      color: CAPTION_DEFAULTS.color,
      accent: CAPTION_DEFAULTS.accent,
    },
    schema: CAPTION_SCHEMA,
    durationProp: 'duration',
    cardId: 'shengzhang-caption',
    cardName: '声账 · 解说字幕条',
  })),
  overlays: [],
  sfx: [
    { from: 0, duration: TOTAL_FRAMES, src: SFX_BUS.src, volume: SFX_BUS.volume },
    ...VOICE_CUES.map((cue) => ({
      from: cue.from,
      duration: TOTAL_FRAMES - cue.from,
      src: cue.src,
      volume: cue.volume,
    })),
  ],
  bgm: [
    {
      from: 0,
      duration: TOTAL_FRAMES,
      src: MUSIC.src,
      volume: MUSIC.volume,
    },
  ],
  order: ['transitions', 'captions', 'overlays'],
  original: ShengzhangMain,
};
