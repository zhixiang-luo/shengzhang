import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { TitleCardScene } from './scenes/TitleCardScene';
import { COLORS, FONT, alpha } from './theme';

export const CAPTION_DEFAULTS = {
  fontSize: 34,
  color: COLORS.ink2,
  accent: COLORS.blushDeep,
  bottom: 62,
};

export const CaptionStrip: React.FC<{
  text: string;
  duration: number;
  bottom?: number;
  fontSize?: number;
  color?: string;
  accent?: string;
}> = ({
  text,
  duration,
  bottom = CAPTION_DEFAULTS.bottom,
  fontSize = CAPTION_DEFAULTS.fontSize,
  color = CAPTION_DEFAULTS.color,
  accent = CAPTION_DEFAULTS.accent,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [duration - 8, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom,
        transform: `translate(-50%, ${(1 - fadeIn) * 8}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '9px 18px',
        borderRadius: 10,
        background: alpha(COLORS.raised, 0.84),
        boxShadow: `0 12px 30px -20px ${alpha(COLORS.ink, 0.4)}`,
        fontFamily: FONT.body,
        fontSize,
        fontWeight: 550,
        letterSpacing: '0.04em',
        color,
        opacity: fadeIn * fadeOut,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 2, background: accent }} />
      {text}
    </div>
  );
};

export const WarmFlash: React.FC<{ duration?: number }> = ({ duration = 10 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, duration * 0.38, duration], [0, 0.76, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at 50% 48%, rgba(255,250,240,.98) 0%, rgba(255,244,229,.54) 53%, rgba(255,244,229,0) 82%)',
        opacity,
      }}
    />
  );
};

export const TitleCardUnit: React.FC<{
  text: string;
  duration: number;
  accent?: string;
  paper?: string;
  ink?: string;
  muted?: string;
  fontSize?: number;
}> = ({
  text,
  duration,
  accent = COLORS.blushDeep,
  paper = '#F9F6F1',
  ink = '#201C19',
  muted = COLORS.ink2,
  fontSize = 114,
}) => (
  <TitleCardScene
    duration={duration}
    lines={text.split('\n').map((line) => {
      const parts = line.match(/\*[^*]+\*|[^*]+/g) ?? [line];
      return parts.map((part) => {
        const accentMatch = part.match(/^\*(.+)\*$/);
        return accentMatch
          ? { text: accentMatch[1], accent: true }
          : { text: part.replace(/\*/g, '') };
      });
    })}
    accent={accent}
    paper={paper}
    ink={ink}
    muted={muted}
    fontSize={fontSize}
  />
);
TitleCardUnit.displayName = 'TitleCardUnit';

