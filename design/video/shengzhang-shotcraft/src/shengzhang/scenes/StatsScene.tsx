import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Stage } from '../Backdrop';
import { PhoneMock } from '../PhoneMock';
import { COLORS, EASE, FONT, alpha, bezier, mix, ramp } from '../theme';

export const STATS_SCENE_DURATION = 160;

const HOLD = 24;
const MOVE_END = 126;
const crane = bezier(0.2, 0, 0.25, 1);

const PHONE_X = 180;
const PHONE_Y = 58;
const PHONE_WIDTH = 470;
const PHONE_HEIGHT = PHONE_WIDTH * (1688 / 780);

const FOCUS_START = { x: PHONE_X + PHONE_WIDTH * 0.52, y: PHONE_Y + PHONE_HEIGHT * 0.2 };
const FOCUS_END = { x: 960, y: 540 };

const features = [
  { index: '01', title: '每日趋势', body: '哪天花得多，一眼看见。' },
  { index: '02', title: '分类占比', body: '餐饮、出行、咖啡，各有比例。' },
  { index: '03', title: '结余与日均', body: '月底回看，不用翻表格。' },
];

const cameraAt = (frame: number) => {
  const progress = crane(Math.max(0, Math.min(1, (frame - HOLD) / (MOVE_END - HOLD))));
  const scale = mix(1.55, 1, progress);
  const focusX = mix(FOCUS_START.x, FOCUS_END.x, progress);
  const focusY = mix(FOCUS_START.y, FOCUS_END.y, progress);
  return {
    progress,
    scale,
    x: 960 - focusX * scale,
    y: 540 - focusY * scale,
  };
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = cameraAt(frame);
  const sideIn = ramp(frame, 76, 48, EASE.out);
  const settle = ramp(frame, 126, 28, EASE.out);
  const focusOpacity = 1 - ramp(frame, HOLD, 38, EASE.out);
  const focusTop = PHONE_Y + PHONE_HEIGHT * 0.12;
  const focusBottom = focusTop + 150;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.body }}>
      <Stage blushAt={[0.16, 0.12]} sageAt={[0.8, 0.7]}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.34,
            backgroundImage:
              'linear-gradient(rgba(41,38,36,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(41,38,36,.08) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage: 'radial-gradient(ellipse at 48% 50%, #000 12%, transparent 74%)',
          }}
        />
      </Stage>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          transformOrigin: '0 0',
          transform: `translate(${camera.x.toFixed(2)}px, ${camera.y.toFixed(2)}px) scale(${camera.scale.toFixed(
            5,
          )})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: PHONE_X - 26,
            top: PHONE_Y - 24,
            width: PHONE_WIDTH + 52,
            height: PHONE_HEIGHT + 48,
            borderRadius: 80,
            background: `radial-gradient(ellipse at 50% 38%, ${alpha(
              COLORS.blushSoft,
              0.5,
            )} 0%, ${alpha(COLORS.blushSoft, 0)} 70%)`,
          }}
        />
        <PhoneMock
          x={PHONE_X}
          y={PHONE_Y}
          width={PHONE_WIDTH}
          screen="textures/shengzhang/stats.png"
          screenScale={1.005}
          transform={`rotate(${Math.sin(frame / 34) * 0.35}deg)`}
        />
        <div
          style={{
            position: 'absolute',
            left: PHONE_X + 8,
            top: PHONE_Y + 8,
            width: PHONE_WIDTH - 16,
            height: Math.max(0, focusTop - PHONE_Y - 8),
            opacity: focusOpacity * 0.46,
            borderBottom: `1px solid ${alpha(COLORS.blushDeep, 0.3)}`,
            background: COLORS.ink,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: PHONE_X + 8,
            top: focusBottom,
            width: PHONE_WIDTH - 16,
            height: Math.max(0, PHONE_Y + PHONE_HEIGHT - focusBottom - 8),
            opacity: focusOpacity * 0.46,
            borderTop: `1px solid ${alpha(COLORS.blushDeep, 0.3)}`,
            background: COLORS.ink,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: PHONE_X + 8,
            top: focusTop,
            width: PHONE_WIDTH - 16,
            height: focusBottom - focusTop,
            opacity: focusOpacity,
            borderRadius: 18,
            background: alpha(COLORS.blushSoft, 0.2),
            boxShadow: `inset 0 0 0 2px ${alpha(COLORS.blushDeep, 0.45)}`,
          }}
        />

        <div style={{ position: 'absolute', left: 760, top: 176, width: 1050, opacity: sideIn }}>
          <div style={{ color: COLORS.blushDeep, fontSize: 32, fontWeight: 700, letterSpacing: '0.13em' }}>
            月度统计 · 月底的答案
          </div>
          <div
            style={{
              marginTop: 30,
              fontFamily: FONT.display,
              fontSize: 94,
              fontWeight: 600,
              letterSpacing: '-0.06em',
              lineHeight: 1.08,
              color: COLORS.ink,
            }}
          >
            钱花在哪儿，
            <br />
            <span style={{ color: COLORS.blushDeep }}>一屏就懂。</span>
          </div>
          <div style={{ marginTop: 34, color: COLORS.ink2, fontSize: 34, lineHeight: 1.65, maxWidth: 780 }}>
            每日趋势、分类占比和月度变化放在一只手能翻到的距离里。
          </div>

          <div style={{ marginTop: 42, borderTop: `1px solid ${alpha(COLORS.ink, 0.12)}` }}>
            {features.map((feature, index) => {
              const itemIn = ramp(frame, 96 + index * 14, 24, EASE.out);
              const sweep = ramp(frame, 104 + index * 14, 20, EASE.out);
              return (
                <div
                  key={feature.title}
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '70px 260px 1fr',
                    alignItems: 'center',
                    minHeight: 102,
                    borderBottom: `1px solid ${alpha(COLORS.ink, 0.1)}`,
                    opacity: itemIn,
                    transform: `translateX(${(1 - itemIn) * 28}px)`,
                  }}
                >
                  <span style={{ color: COLORS.blushDeep, fontFamily: FONT.number, fontSize: 30, fontWeight: 600 }}>
                    {feature.index}
                  </span>
                  <strong style={{ fontSize: 36, fontWeight: 650, color: COLORS.ink }}>{feature.title}</strong>
                  <span style={{ fontSize: 34, color: COLORS.ink2 }}>{feature.body}</span>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: -1,
                      height: 3,
                      background: COLORS.blush,
                      transform: `scaleX(${sweep})`,
                      transformOrigin: 'left',
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 20,
              padding: '13px 20px',
              borderRadius: 999,
              background: COLORS.sageDeep,
              color: COLORS.raised,
              fontSize: 32,
              fontWeight: 600,
              opacity: settle,
            }}
          >
            <span>✓</span>
            账单已写入本地账本
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
