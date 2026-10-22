import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  interpolateColors,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Stage } from '../Backdrop';
import { PhoneMock } from '../PhoneMock';
import { COLORS, EASE, FONT, alpha, mix, ramp } from '../theme';

export const OUTRO_SCENE_DURATION = 147;

const CLICK = 34;
const STRIP_DURATION = 14;
const BUTTON_FADE = CLICK + 52;
const LOGO_IN = CLICK + 62;
const BUTTON_WIDTH = 164;
const BUTTON_HEIGHT = 48;
const BUTTON_FROM = { x: 1500, y: 858 };
const BUTTON_TO = { x: 960, y: 540 };

const strip = (frame: number, start: number, dx: number, dy: number): React.CSSProperties => {
  const progress = interpolate(frame, [start, start + STRIP_DURATION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.exit,
  });
  return {
    opacity: 1 - progress,
    transform: `translate(${dx * progress}px, ${dy * progress}px)`,
    filter: progress > 0.001 ? `blur(${(progress * 7).toFixed(2)}px)` : undefined,
  };
};

const FeatureRow: React.FC<{ icon: string; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <div
    style={{
      height: 60,
      borderRadius: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '0 16px',
      background: active ? COLORS.blushSoft : alpha(COLORS.raised, 0.54),
      color: COLORS.ink,
      fontWeight: active ? 650 : 550,
      fontSize: 30,
    }}
  >
    <span style={{ width: 28, color: active ? COLORS.blushDeep : COLORS.ink2 }}>{icon}</span>
    {label}
  </div>
);

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgDark = interpolate(frame, [CLICK + 20, CLICK + 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.smooth,
  });
  const leftPanel = strip(frame, CLICK + 4, -130, 0);
  const rightPanel = strip(frame, CLICK + 8, 110, 18);
  const phoneLayer = strip(frame, CLICK + 12, 0, 38);
  const chipsLayer = strip(frame, CLICK + 16, -80, -48);
  const phoneFooter = strip(frame, CLICK + 20, 0, 34);
  const topBar = strip(frame, CLICK + 24, 0, -46);

  const press = spring({ frame: frame - CLICK, fps, config: { damping: 12, stiffness: 220 } });
  const pressScale = frame < CLICK ? 1 : 1 - 0.12 * Math.sin(Math.min(1, press) * Math.PI);
  const buttonTravel = interpolate(frame, [CLICK + 24, CLICK + 42], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.swift,
  });
  const buttonX = mix(BUTTON_FROM.x, BUTTON_TO.x, buttonTravel);
  const buttonY = mix(BUTTON_FROM.y, BUTTON_TO.y, buttonTravel);
  const buttonScale = 1 + 0.5 * buttonTravel;
  const buttonOpacity = 1 - ramp(frame, BUTTON_FADE, 12, EASE.out);
  const buttonRelease = ramp(frame, BUTTON_FADE, 12, EASE.out);

  const logoProgress = spring({
    frame: frame - LOGO_IN,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const wordProgress = spring({
    frame: frame - LOGO_IN - 3,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const taglineProgress = ramp(frame, LOGO_IN + 10, 16, EASE.out);

  const cursorX = interpolate(frame, [4, CLICK - 2], [1040, BUTTON_FROM.x + 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.smooth,
  });
  const cursorY = interpolate(frame, [4, CLICK - 2], [790, BUTTON_FROM.y + 10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.swift,
  });
  const cursorOpacity = 1 - ramp(frame, CLICK + 6, 10, EASE.out);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.body }}>
      <Stage blushAt={[0.11, 0.12]} sageAt={[0.87, 0.82]}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: bgDark,
            background: `radial-gradient(ellipse 45% 52% at 50% 50%, ${alpha(
              COLORS.blush,
              0.14,
            )} 0%, ${alpha(COLORS.blush, 0.03)} 48%, ${alpha(COLORS.dark, 0)} 74%)`,
          }}
        />
      </Stage>

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 320,
          right: 320,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: 1 - bgDark,
          ...topBar,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 28, color: COLORS.ink2 }}>
          <span style={{ color: COLORS.blushDeep }}>●</span>
          声账 · 今日账本
        </div>
        <div style={{ fontSize: 24, color: COLORS.ink3 }}>自动保存 · 本地优先</div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 248,
          top: 92,
          width: 250,
          height: 800,
          padding: 18,
          boxSizing: 'border-box',
          borderRadius: 28,
          background: alpha(COLORS.raised, 0.72),
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.8), 0 34px 80px -44px ${alpha(COLORS.ink, 0.45)}`,
          ...leftPanel,
        }}
      >
        <div style={{ margin: '4px 10px 18px', color: COLORS.ink3, fontSize: 24, fontWeight: 700, letterSpacing: '0.12em' }}>
          今天
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FeatureRow icon="◉" label="一句话记账" active />
          <FeatureRow icon="≡" label="账本明细" />
          <FeatureRow icon="↶" label="撤销记录" />
          <FeatureRow icon="▥" label="月度统计" />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 22,
            padding: '18px 16px',
            borderRadius: 20,
            background: COLORS.blushSoft,
            color: COLORS.blushDeep,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.08em' }}>8 秒撤销</div>
          <div style={{ marginTop: 7, fontSize: 28, fontWeight: 650 }}>整批账单仍可恢复</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 1420,
          top: 92,
          width: 260,
          height: 800,
          padding: 24,
          boxSizing: 'border-box',
          borderRadius: 28,
          background: alpha(COLORS.raised, 0.7),
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.8), 0 34px 80px -44px ${alpha(COLORS.ink, 0.45)}`,
          ...rightPanel,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.ink3, letterSpacing: '0.1em' }}>本月支出</div>
        <div style={{ marginTop: 16, fontFamily: FONT.number, fontSize: 50, fontWeight: 550, letterSpacing: '-0.04em' }}>
          ¥ 2,668.80
        </div>
        <div style={{ marginTop: 12, fontSize: 30, color: COLORS.sageDeep, fontWeight: 600 }}>较上月 −12.4%</div>
        <div style={{ height: 1, background: alpha(COLORS.ink, 0.1), margin: '28px 0' }} />
        {['每日趋势', '分类占比', '最高支出日'].map((label, index) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 70,
              color: COLORS.ink,
              fontSize: 30,
              borderBottom: `1px solid ${alpha(COLORS.ink, 0.08)}`,
            }}
          >
            {label}
            <span style={{ color: index === 1 ? COLORS.blushDeep : COLORS.ink3 }}>查看</span>
          </div>
        ))}
        <div
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 22,
            padding: 18,
            borderRadius: 22,
            background: COLORS.ink,
            color: COLORS.raised,
            fontSize: 30,
            lineHeight: 1.5,
          }}
        >
          第一次记账，不用登录。
        </div>
      </div>

      <div style={phoneLayer}>
        <PhoneMock
          x={760}
          y={74}
          width={400}
          screen="textures/shengzhang/home.png"
          screenScale={1.005 + Math.sin(frame / 24) * 0.002}
          transform={`rotate(${Math.sin(frame / 36) * 0.35}deg)`}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 620,
          top: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          ...chipsLayer,
        }}
      >
        {['午饭 25', '打车 18'].map((label, index) => (
          <div
            key={label}
            style={{
              minWidth: 160,
              padding: '13px 20px',
              borderRadius: 999,
              background: COLORS.raised,
              color: COLORS.ink,
              fontSize: 32,
              fontWeight: 600,
              boxShadow: `0 18px 44px -26px ${alpha(COLORS.ink, 0.5)}`,
              transform: `translateX(${Math.sin(frame / 20 + index) * 4}px)`,
            }}
          >
            <span style={{ color: COLORS.blushDeep, marginRight: 8 }}>−</span>
            {label}
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 660,
          bottom: 86,
          width: 600,
          height: 78,
          borderRadius: 26,
          background: alpha(COLORS.raised, 0.9),
          boxShadow: `0 26px 54px -30px ${alpha(COLORS.ink, 0.5)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxSizing: 'border-box',
          ...phoneFooter,
        }}
      >
        <span style={{ fontSize: 32, color: COLORS.ink2 }}>已记好 2 笔</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.sageDeep, fontSize: 32, fontWeight: 650 }}>
          <span>✓</span>
          账本已更新
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: buttonX - (BUTTON_WIDTH * buttonScale) / 2,
          top: buttonY - (BUTTON_HEIGHT * buttonScale) / 2,
          width: BUTTON_WIDTH * buttonScale,
          height: BUTTON_HEIGHT * buttonScale,
          borderRadius: 12 * buttonScale,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9 * buttonScale,
          fontFamily: FONT.body,
          fontSize: 17 * buttonScale,
          fontWeight: 650,
          color: COLORS.raised,
          opacity: buttonOpacity,
          transform: `scale(${pressScale * (1 + 0.05 * buttonRelease)})`,
          background: `linear-gradient(180deg, #C87979 0%, ${COLORS.blushDeep} 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 0 ${30 + 50 * buttonTravel}px ${alpha(
            COLORS.blush,
            0.18 + 0.45 * buttonTravel * bgDark,
          )}`,
        }}
      >
        <svg
          width={15 * buttonScale}
          height={15 * buttonScale}
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.raised}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 12.5l4.2 4.2L18.5 7.8" />
        </svg>
        收好
      </div>

      {frame >= LOGO_IN ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 30,
                transform: `scale(${0.86 + 0.14 * logoProgress})`,
              }}
            >
              <div
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 42,
                  display: 'grid',
                  placeItems: 'center',
                  background: COLORS.raised,
                  boxShadow: `0 26px 58px -24px ${alpha(COLORS.raised, 0.3)}`,
                  opacity: Math.min(1, logoProgress * 1.4),
                  filter: logoProgress < 0.995 ? `blur(${((1 - logoProgress) * 9).toFixed(2)}px)` : undefined,
                }}
              >
                <Img src={staticFile('brand/piggy-mark.svg')} style={{ width: 104, height: 104 }} />
              </div>
              <div
                style={{
                  fontFamily: FONT.display,
                  fontSize: 82,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: COLORS.raised,
                  opacity: Math.min(1, wordProgress * 1.4),
                  transform: `translateX(${((1 - wordProgress) * -18).toFixed(2)}px)`,
                  filter: wordProgress < 0.995 ? `blur(${((1 - wordProgress) * 9).toFixed(2)}px)` : undefined,
                }}
              >
                声账
              </div>
            </div>
            <div
              style={{
                marginTop: 30,
                fontFamily: FONT.display,
                fontSize: 44,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: COLORS.blush,
                opacity: taglineProgress,
                transform: `translateY(${(1 - taglineProgress) * 12}px)`,
              }}
            >
              说一句，就记好。
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      <svg
        width={30}
        height={38}
        viewBox="0 0 14 18"
        style={{
          position: 'absolute',
          left: cursorX,
          top: cursorY,
          opacity: cursorOpacity,
          zIndex: 40,
          filter: `drop-shadow(0 3px 5px ${alpha(COLORS.ink, 0.3)})`,
        }}
      >
        <path
          d="M1 1 L1 15 L4.6 11.6 L7.2 17 L9.4 16 L6.9 10.7 L12 10.7 Z"
          fill={COLORS.ink}
          stroke={COLORS.raised}
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
      </svg>
    </AbsoluteFill>
  );
};
