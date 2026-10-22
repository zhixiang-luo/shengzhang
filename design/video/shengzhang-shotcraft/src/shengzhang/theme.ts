import React from 'react';

export const COLORS = {
  canvas: '#FAF7F0',
  raised: '#FFFDF8',
  sunken: '#F3EEE5',
  ink: '#292624',
  ink2: '#726B64',
  ink3: '#988E84',
  blush: '#E89A96',
  blushDeep: '#9D5657',
  blushSoft: '#F7DDD8',
  sage: '#9EAD98',
  sageDeep: '#63795E',
  sand: '#E1BD7B',
  border: '#E8E0D6',
  dark: '#242220',
} as const;

export const FONT = {
  body: '"PingFang SC", "Hiragino Sans GB", -apple-system, BlinkMacSystemFont, sans-serif',
  display: '"Songti SC", "STSong", "Noto Serif CJK SC", serif',
  number: '"Avenir Next", "DIN Alternate", -apple-system, sans-serif',
  mono: '"SF Mono", "JetBrains Mono", Menlo, monospace',
} as const;

export const TYPE = {
  display: 108,
  hero: 92,
  h1: 72,
  h2: 52,
  h3: 40,
  body: 34,
  small: 28,
  label: 22,
} as const;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const ax = 1 - 3 * x2 + 3 * x1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 1 - 3 * y2 + 3 * y1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  const solve = (x: number) => {
    let u = x;
    for (let i = 0; i < 8; i++) {
      const error = sx(u) - x;
      if (Math.abs(error) < 1e-7) return u;
      const derivative = dx(u);
      if (Math.abs(derivative) < 1e-6) break;
      u -= error / derivative;
    }
    let low = 0;
    let high = 1;
    u = x;
    for (let i = 0; i < 40; i++) {
      const value = sx(u);
      if (Math.abs(value - x) < 1e-7) break;
      if (value < x) low = u;
      else high = u;
      u = (low + high) / 2;
    }
    return u;
  };
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : sy(solve(t)));
};

export const EASE = {
  snappy: bezier(0.16, 1, 0.3, 1),
  out: bezier(0.22, 1, 0.36, 1),
  smooth: bezier(0.65, 0, 0.35, 1),
  swift: bezier(0.4, 0, 0.2, 1),
  exit: bezier(0.7, 0, 0.84, 0),
  overshoot: bezier(0.34, 1.45, 0.64, 1),
  press: bezier(0.2, 0.75, 0.3, 1),
  linear: (t: number) => clamp01(t),
};

export const ramp = (
  frame: number,
  start: number,
  duration: number,
  ease: (t: number) => number = EASE.snappy,
) => ease(clamp01((frame - start) / Math.max(1e-6, duration)));

export const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

export const clamp = (value: number, from = 0, to = 1) => Math.max(from, Math.min(to, value));

export const rgbOf = (hex: string) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
  const value = Number.parseInt(full, 16);
  return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`;
};

export const alpha = (hex: string, opacity: number) => `rgba(${rgbOf(hex)},${opacity})`;

export const softShadow = (elevation: number, color: string = COLORS.ink) => {
  const e = Math.max(0, elevation);
  return [
    `0 ${0.5 + e * 0.05}px ${1 + e * 0.16}px ${alpha(color, 0.2 / (1 + e / 24))}`,
    `0 ${e * 0.55}px ${e * 1.35}px ${-e * 0.25}px ${alpha(color, 0.08 + Math.min(e, 64) * 0.0028)}`,
  ].join(', ');
};

export const numberStyle: React.CSSProperties = {
  fontFamily: FONT.number,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.035em',
};

