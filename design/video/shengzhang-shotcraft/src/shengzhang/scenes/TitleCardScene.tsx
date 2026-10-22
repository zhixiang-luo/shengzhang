import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, EASE, FONT, alpha } from '../theme';

export type TitleWord = { text: string; accent?: boolean };
export type TitleLine = TitleWord[];

export const TitleCardScene: React.FC<{
  duration: number;
  lines: TitleLine[];
  kicker?: string;
  accent?: string;
  paper?: string;
  ink?: string;
  muted?: string;
  fontSize?: number;
}> = ({
  duration,
  lines,
  kicker = '声账 · 语音优先',
  accent = COLORS.blushDeep,
  paper = '#F9F6F1',
  ink = '#201C19',
  muted = COLORS.ink2,
  fontSize = 114,
}) => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [duration - 8, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const underline = interpolate(frame, [16, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.out,
  });
  const kickerIn = interpolate(frame, [2, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let wordIndex = 0;
  return (
    <AbsoluteFill
      style={{
        opacity: fadeOut,
        backgroundColor: paper,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT.display,
        backgroundImage: `radial-gradient(1100px 760px at 52% 42%, ${alpha(
          COLORS.raised,
          0.95,
        )}, ${alpha(COLORS.raised, 0)} 66%)`,
      }}
    >
      <div style={{ position: 'absolute', left: 120, top: 86, color: accent, fontFamily: FONT.body, fontSize: 30, fontWeight: 700, letterSpacing: '0.12em', opacity: kickerIn }}>
        {kicker}
      </div>
      <div style={{ width: 1540, textAlign: 'center' }}>
        {lines.map((line, lineIndex) => (
          <div
            key={lineIndex}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              columnGap: '0.2em',
              rowGap: '0.08em',
              margin: '0 0 8px',
            }}
          >
            {line.map((word, index) => {
              const delay = 4 + wordIndex * 4;
              wordIndex += 1;
              const progress = interpolate(frame, [delay, delay + 9], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EASE.press,
              });
              return (
                <span
                  key={`${word.text}-${index}`}
                  style={{
                    display: 'inline-block',
                    color: word.accent ? accent : ink,
                    fontStyle: word.accent ? 'italic' : 'normal',
                    fontSize,
                    fontWeight: 600,
                    lineHeight: 1.13,
                    letterSpacing: '-0.045em',
                    opacity: progress,
                    transform: `scale(${1.28 - 0.28 * progress})`,
                    filter: `blur(${((1 - progress) * 7).toFixed(2)}px)`,
                  }}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        ))}
        <div
          style={{
            height: 6,
            width: 220,
            margin: '32px auto 0',
            borderRadius: 3,
            background: accent,
            transform: `scaleX(${underline})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
