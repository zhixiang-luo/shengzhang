import React from 'react';
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Stage } from '../Backdrop';
import { PhoneMock } from '../PhoneMock';
import { COLORS, EASE, FONT, alpha, mix, ramp } from '../theme';

export const PRODUCT_SCENE_DURATION = 168;

const RING_DATA = [
  { size: 2240, color: '#E7D8C8', phase: 0 },
  { size: 1760, color: '#EFE2D4', phase: 1.7 },
  { size: 1280, color: '#F4E8DC', phase: 3.4 },
  { size: 820, color: '#F7DDD8', phase: 5.1 },
];

const PHONE_WIDTH = 430;
const PHONE_X = (1920 - PHONE_WIDTH) / 2;
const PHONE_Y = 72;

type ChipKind = 'category' | 'undo' | 'local';

const ChipIcon: React.FC<{ kind: ChipKind }> = ({ kind }) => (
  <div
    style={{
      width: 58,
      height: 58,
      borderRadius: 29,
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      background: COLORS.blushDeep,
      boxShadow: `inset 0 1px 0 ${alpha(COLORS.raised, 0.35)}`,
    }}
  >
    <svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke={COLORS.raised}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'category' ? (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </>
      ) : kind === 'undo' ? (
        <>
          <path d="M4 9h9a5 5 0 0 1 0 10h-3" />
          <path d="M8 5 4 9l4 4" />
        </>
      ) : (
        <>
          <rect x="5" y="10" width="14" height="10" rx="3" />
          <path d="M8 10V8a4 4 0 0 1 8 0v2" />
          <path d="M12 14v2" />
        </>
      )}
    </svg>
  </div>
);

export const ProductHeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / (PRODUCT_SCENE_DURATION - 1);

  const rise = ramp(frame, 0, 26, EASE.snappy);
  const phoneY = (1 - rise) * 88;
  const phoneOpacity = Math.min(1, rise * 2.15);

  const chipStyle = (start: number, phase: number, side: -1 | 1): React.CSSProperties => {
    const pop = spring({
      frame: frame - start,
      fps,
      config: { damping: 13, stiffness: 190, mass: 1 },
    });
    const slide = ramp(frame, start, 20, EASE.snappy);
    // Give each landed chip a visible rest before ambient floating takes over.
    const floatIn = ramp(frame, start + 30, 24, EASE.smooth);
    const floatY = Math.sin(time * Math.PI * 4 + phase) * 7 * floatIn;
    return {
      opacity: Math.min(1, Math.max(0, (frame - start) / 5)),
      transform: `translateX(${side * (1 - slide) * -28}px) translateY(${floatY.toFixed(2)}px) scale(${(
        0.8 +
        0.2 * pop
      ).toFixed(4)})`,
      transformOrigin: side < 0 ? 'right center' : 'left center',
    };
  };

  const chipBase: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    padding: '14px 34px 14px 14px',
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FFFDF9 0%, #FBF5EC 100%)',
    color: COLORS.ink,
    whiteSpace: 'nowrap',
    fontFamily: FONT.body,
    fontSize: 34,
    fontWeight: 650,
    letterSpacing: '-0.02em',
    boxShadow: `inset 0 1px 0 #FFFFFF, 0 0 0 1px ${alpha(COLORS.ink, 0.06)}, 0 3px 6px ${alpha(
      COLORS.ink,
      0.08,
    )}, 0 26px 50px -16px ${alpha(COLORS.ink, 0.32)}`,
  };

  const brandIn = ramp(frame, 94, 20, EASE.out);
  return (
    <AbsoluteFill style={{ fontFamily: FONT.body, overflow: 'hidden' }}>
      <Stage blushAt={[0.8, 0.18]} sageAt={[0.2, 0.83]}>
        {RING_DATA.map(({ size, color, phase }, index) => (
          <div
            key={size}
            style={{
              position: 'absolute',
              left: 960 - size / 2,
              top: 540 - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: `linear-gradient(180deg, rgba(255,250,240,.44) 0%, rgba(255,250,240,0) 42%), ${color}`,
              boxShadow: `inset 0 2px 0 rgba(255,252,246,.85), 0 0 0 1.5px rgba(255,250,242,.55), 0 -4px 22px rgba(255,248,236,.4), 0 10px 40px ${alpha(
                COLORS.ink,
                0.05 + index * 0.015,
              )}`,
              transform: `scale(${(1 + 0.06 * Math.sin(time * Math.PI * 2 * 1.5 + phase)).toFixed(5)})`,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 25% 47% at 50% 50%, ${alpha(
              COLORS.raised,
              0.75,
            )} 0%, ${alpha(COLORS.raised, 0)} 100%)`,
          }}
        />
      </Stage>

      <PhoneMock
        x={PHONE_X}
        y={PHONE_Y}
        width={PHONE_WIDTH}
        screen="textures/shengzhang/voice-result.png"
        transform={`translateY(${phoneY.toFixed(2)}px) rotate(${Math.sin(time * Math.PI * 2) * 0.4}deg)`}
        opacity={phoneOpacity}
        screenScale={1.008 + 0.004 * Math.sin(time * Math.PI * 3)}
        screenOffsetY={-12 * time}
      />

      <div style={{ ...chipBase, left: 184, top: 326, ...chipStyle(37, 0, -1) }}>
        <ChipIcon kind="category" />
        自动分类
      </div>
      <div style={{ ...chipBase, left: 1294, top: 560, ...chipStyle(67, 1.8, 1) }}>
        <ChipIcon kind="undo" />
        8 秒整批撤销
      </div>
      <div style={{ ...chipBase, left: 226, top: 738, ...chipStyle(97, 3.2, -1) }}>
        <ChipIcon kind="local" />
        本地账本
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 54,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          color: COLORS.ink,
          opacity: brandIn,
          transform: `translateY(${(1 - brandIn) * 26}px)`,
        }}
      >
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            display: 'grid',
            placeItems: 'center',
            background: COLORS.raised,
            boxShadow: `0 14px 36px -18px ${alpha(COLORS.ink, 0.4)}`,
          }}
        >
          <Img src={staticFile('brand/piggy-mark.svg')} style={{ width: 48, height: 48 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontFamily: FONT.display, fontSize: 40, letterSpacing: '0.06em', lineHeight: 1 }}>声账</strong>
          <span style={{ marginTop: 5, color: COLORS.ink2, fontSize: 32 }}>说一句，就记好。</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 120,
          bottom: 68,
          color: COLORS.ink2,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: '0.04em',
          opacity: brandIn,
        }}
      >
        默认自动入账
      </div>
    </AbsoluteFill>
  );
};
