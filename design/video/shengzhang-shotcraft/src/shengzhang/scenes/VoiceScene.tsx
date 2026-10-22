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
import { COLORS, EASE, FONT, alpha, mix, ramp } from '../theme';

export const VOICE_SCENE_DURATION = 172;

const N_BARS = 64;
const SCROLL = 1.6;
const MAX_H = 142;
const SUBMIT = 126;

const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const noiseAt = (x: number) => {
  const index = Math.floor(x);
  const fraction = x - index;
  const a = mulberry32(index * 7919 + 13)();
  const b = mulberry32((index + 1) * 7919 + 13)();
  const smooth = fraction * fraction * (3 - 2 * fraction);
  return a + (b - a) * smooth;
};

const envelope = (time: number) => {
  const segment = (start: number, end: number, rise = 5, fall = 7) =>
    interpolate(time, [start, start + rise, end - fall, end], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const talking = Math.max(segment(15, 57), segment(80, 124));
  const syllable = 0.55 + 0.45 * noiseAt(time / 4.5 + 200);
  return talking * syllable;
};

const LINES: { word: string; at: number }[][] = [
  [
    { word: '午饭', at: 17 },
    { word: '25，', at: 27 },
    { word: '打车', at: 40 },
    { word: '18，', at: 49 },
  ],
  [
    { word: '一共', at: 82 },
    { word: '两笔账。', at: 96 },
  ],
];

const CAPTURE = { width: 1240, height: 190, top: 760 };
const TEXT_TOP = 284;

export const VoiceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = ramp(frame, 0, 14, EASE.snappy);
  const labelIn = ramp(frame, 6, 12, EASE.out);
  const submitted = frame >= SUBMIT;
  const buttonSpring = spring({
    frame: frame - SUBMIT,
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  const buttonScale = frame < SUBMIT ? 1 : 1 - 0.12 * Math.sin(Math.min(1, buttonSpring) * Math.PI);
  const collapse = mix(1, 0.06, ramp(frame, SUBMIT, 12, EASE.exit));
  const arrowOut = ramp(frame, SUBMIT + 1, 6, EASE.exit);
  const checkIn = ramp(frame, SUBMIT + 4, 8, EASE.overshoot);
  const toBubble = ramp(frame, SUBMIT + 2, 22, EASE.swift);
  const bubbleFill = ramp(frame, SUBMIT + 6, 10, EASE.out);
  const sentT = ramp(frame, SUBMIT + 14, 12, EASE.out);
  const idle = ramp(frame, SUBMIT + 14, 14, EASE.swift);

  const bars = Array.from({ length: N_BARS }, (_, index) => {
    const sampleTime = frame - (N_BARS - 1 - index) * SCROLL;
    const env = sampleTime < 0 ? 0 : envelope(sampleTime);
    const centerWeight = Math.pow(Math.sin((index / (N_BARS - 1)) * Math.PI), 0.8);
    const jitter = 0.35 + 0.65 * noiseAt(sampleTime * 1.7 + index * 0.13);
    return Math.max(6, env * centerWeight * jitter * MAX_H * collapse);
  });
  const nowEnv = submitted ? 0 : envelope(frame);
  const level = (bars.slice(-12).reduce((a, b) => a + b, 0) / 12 / MAX_H) * collapse;

  const seconds = Math.min(frame, SUBMIT) / 30;
  const timer = `0:${String(Math.floor(Math.max(0, seconds - 0.4))).padStart(2, '0')}`;
  const lastAt = LINES.flat().filter((word) => frame >= word.at).pop()?.at ?? -99;
  const talking = nowEnv > 0.05;
  const caretOn = !submitted && frame > 14 && (talking || Math.floor((frame - lastAt) / 8) % 2 === 0);

  const textScale = mix(1, 0.68, toBubble);
  const textTop = mix(TEXT_TOP, 248, toBubble);
  const textColor = interpolateColors(bubbleFill, [0, 1], [COLORS.ink, COLORS.raised]);
  const hintOpacity = ramp(frame, 4, 10, EASE.out) * (1 - ramp(frame, 15, 4, EASE.linear));

  const wordNode = (word: { word: string; at: number }, key: number) => {
    const progress = ramp(frame, word.at, 8, EASE.snappy);
    const fresh = 1 - ramp(frame, word.at + 4, 7, EASE.linear);
    const color = bubbleFill > 0 ? textColor : interpolateColors(fresh, [0, 1], [COLORS.ink, COLORS.blushDeep]);
    return (
      <span
        key={`${word.word}-${key}`}
        style={{
          display: 'inline-block',
          marginRight: '0.18em',
          opacity: progress,
          color,
          filter: progress < 1 ? `blur(${((1 - progress) * 9).toFixed(2)}px)` : undefined,
          transform: `translateY(${((1 - progress) * 0.2).toFixed(3)}em)`,
        }}
      >
        {word.word}
        {caretOn && word.at === lastAt ? (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: '0.75em',
              verticalAlign: '-0.06em',
              marginLeft: '0.06em',
              marginRight: '-0.12em',
              borderRadius: 3,
              background: COLORS.blushDeep,
            }}
          />
        ) : null}
      </span>
    );
  };

  return (
    <AbsoluteFill style={{ fontFamily: FONT.body, color: COLORS.ink, overflow: 'hidden' }}>
      <Stage blushAt={[0.16, 0.14]} sageAt={[0.88, 0.86]}>
        <div
          style={{
            position: 'absolute',
            left: 340,
            top: CAPTURE.top - 42,
            width: 1640,
            height: 420,
            background: `radial-gradient(ellipse 50% 46% at 50% 40%, ${alpha(
              COLORS.blush,
              0.08 + 0.22 * level,
            )} 0%, ${alpha(COLORS.blush, 0)} 70%)`,
            opacity: entry,
          }}
        />
      </Stage>

      <div style={{ position: 'absolute', left: 120, top: 76, display: 'flex', alignItems: 'center', gap: 18, opacity: entry }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            display: 'grid',
            placeItems: 'center',
            background: COLORS.blushSoft,
            boxShadow: `0 12px 24px -14px ${alpha(COLORS.blushDeep, 0.55)}`,
          }}
        >
          <Img src={staticFile('brand/piggy-mark.svg')} style={{ width: 42, height: 42 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontFamily: FONT.display, fontSize: 36, letterSpacing: '0.06em', lineHeight: 1 }}>声账</strong>
          <span style={{ color: COLORS.ink2, fontSize: 23, marginTop: 5 }}>一句话记账</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 86,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          color: COLORS.ink2,
          fontSize: 30,
          fontWeight: 600,
          opacity: labelIn * (1 - idle),
          transform: `translateY(${(1 - labelIn) * 10}px)`,
        }}
      >
        <span
          style={{
            width: 15,
            height: 15,
            borderRadius: 8,
            background: COLORS.blushDeep,
            boxShadow: `0 0 0 ${(5 + 8 * nowEnv).toFixed(1)}px ${alpha(COLORS.blushDeep, 0.16)}`,
          }}
        />
        正在听清
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 210,
          width: 470,
          opacity: entry,
          transform: `translateY(${(1 - entry) * 32}px)`,
        }}
      >
        <div style={{ color: COLORS.blushDeep, fontSize: 32, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 24 }}>
          VOICE FIRST · 语音优先
        </div>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 82,
            fontWeight: 600,
            letterSpacing: '-0.055em',
            lineHeight: 1.1,
          }}
        >
          付款之后，
          <br />
          别再
          <span style={{ color: COLORS.blushDeep }}>折腾</span>。
        </div>
        <div style={{ marginTop: 34, color: COLORS.ink2, fontSize: 32, lineHeight: 1.65 }}>
          按住说一句，金额、分类和日期，一起替你填好。
        </div>
        <div
          style={{
            display: 'inline-flex',
            marginTop: 44,
            padding: '14px 22px',
            borderRadius: 999,
            border: `1px solid ${alpha(COLORS.ink, 0.12)}`,
            background: alpha(COLORS.raised, 0.68),
            color: COLORS.ink2,
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          一次最多 5 笔 · 默认自动入账
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 700,
          right: 120,
          top: textTop,
          textAlign: 'center',
          transform: `scale(${textScale.toFixed(4)})`,
          transformOrigin: '50% 50%',
          opacity: entry,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -70,
            right: -70,
            top: -46,
            bottom: -46,
            borderRadius: 64,
            background: COLORS.blushDeep,
            opacity: bubbleFill,
            boxShadow: `0 34px 74px -28px ${alpha(COLORS.blushDeep, 0.55)}`,
          }}
        />
        <div
          style={{
            position: 'relative',
            fontFamily: FONT.display,
            fontSize: 94,
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: '-0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {LINES.map((line, index) => (
            <div key={index} style={{ minHeight: '1.12em' }}>
              {line.map(wordNode)}
            </div>
          ))}
        </div>
      </div>

      {hintOpacity > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: 700,
            right: 120,
            top: TEXT_TOP - 20,
            textAlign: 'center',
            color: alpha(COLORS.ink2, 0.52),
            fontFamily: FONT.display,
            fontSize: 76,
            fontWeight: 600,
            letterSpacing: '-0.035em',
            opacity: hintOpacity,
            filter: `blur(${((1 - hintOpacity) * 5).toFixed(2)}px)`,
          }}
        >
          说一句今天花了什么…
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 700,
          right: 120,
          top: 505,
          textAlign: 'center',
          color: COLORS.ink2,
          fontSize: 34,
          fontWeight: 600,
          opacity: sentT,
          transform: `translateY(${(1 - sentT) * 16}px)`,
        }}
      >
        <span style={{ color: COLORS.sageDeep }}>✓</span>
        &nbsp; 已记好 2 笔 · {timer} · 8 秒内可撤销
      </div>

      <div
        style={{
          position: 'absolute',
          left: 340,
          top: CAPTURE.top,
          width: CAPTURE.width,
          height: CAPTURE.height,
          borderRadius: CAPTURE.height / 2,
          padding: '0 38px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 30,
          opacity: entry,
          transform: `translateY(${24 * idle}px) scale(${mix(1.04, 1, entry) * mix(1, 0.955, idle)})`,
          background: 'linear-gradient(180deg, #FFFDF8 0%, #F5EEE4 100%)',
          boxShadow: `inset 0 1.5px 0 #FFFFFF, inset 0 0 0 1px ${alpha(
            COLORS.ink,
            0.07,
          )}, 0 4px 10px ${alpha(COLORS.ink, 0.08)}, 0 42px 90px -32px ${alpha(COLORS.ink, 0.3)}`,
        }}
      >
        <div style={{ position: 'relative', width: 118, height: 118, flex: 'none' }}>
          {[0, 1].map((layer) => (
            <div
              key={layer}
              style={{
                position: 'absolute',
                inset: -(8 + (14 + layer * 14) * nowEnv),
                borderRadius: '50%',
                background: alpha(COLORS.blushDeep, (0.14 - layer * 0.06) * Math.min(1, nowEnv * 1.6)),
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                idle > 0
                  ? `rgb(${Math.round(mix(157, 217, idle))},${Math.round(mix(86, 207, idle))},${Math.round(
                      mix(87, 194, idle),
                    )})`
                  : 'linear-gradient(160deg, #E89A96, #B86366)',
              boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.36), 0 10px 24px -10px ${alpha(
                COLORS.blushDeep,
                0.64 * (1 - idle),
              )}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width={55} height={55} viewBox="0 0 24 24" fill="none">
              <rect x="8.5" y="3" width="7" height="12" rx="3.5" fill={COLORS.raised} />
              <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" stroke={COLORS.raised} strokeWidth="1.9" strokeLinecap="round" />
              <path d="M12 18v3M9 21h6" stroke={COLORS.raised} strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            height: 156,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 14%, #000 100%)',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 14%, #000 100%)',
          }}
        >
          {bars.map((height, index) => {
            const age = index / (N_BARS - 1);
            const quiet = height <= 7 || collapse < 0.25;
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  height,
                  borderRadius: 99,
                  background: quiet
                    ? alpha(COLORS.ink3, 0.6)
                    : `linear-gradient(180deg, ${alpha(COLORS.blush, 0.65 + 0.35 * age)} 0%, ${alpha(
                        COLORS.blushDeep,
                        0.68 + 0.32 * age,
                      )} 52%, ${alpha(COLORS.blush, 0.65 + 0.35 * age)} 100%)`,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            width: 74,
            flex: 'none',
            textAlign: 'right',
            color: COLORS.ink2,
            fontFamily: FONT.number,
            fontSize: 31,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {timer}
        </div>

        <div
          style={{
            position: 'relative',
            width: 118,
            height: 118,
            borderRadius: 59,
            flex: 'none',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #2C2825, #181614)',
            transform: `scale(${buttonScale.toFixed(4)})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.15), 0 10px 24px -8px ${alpha(COLORS.ink, 0.6)}`,
          }}
        >
          <svg
            width={50}
            height={50}
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              opacity: 1 - arrowOut,
              transform: `translateY(${(-30 * arrowOut).toFixed(2)}px)`,
            }}
          >
            <path
              d="M12 20V5M12 5l-6.5 6.5M12 5l6.5 6.5"
              stroke={COLORS.raised}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {checkIn > 0.001 ? (
            <svg
              width={52}
              height={52}
              viewBox="0 0 24 24"
              style={{
                position: 'absolute',
                opacity: Math.min(1, checkIn * 1.4),
                transform: `translateY(${(16 * (1 - checkIn)).toFixed(2)}px) scale(${(
                  0.7 +
                  0.3 * checkIn
                ).toFixed(3)})`,
              }}
            >
              <path
                d="M5.5 12.5l4.2 4.2L18.5 7.8"
                stroke={COLORS.raised}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 340,
          top: 952,
          width: 1240,
          color: COLORS.ink3,
          fontSize: 32,
          letterSpacing: '0.06em',
          textAlign: 'center',
        }}
      >
        录音只用于本次识别 · 语音模型不读取历史账单
      </div>
    </AbsoluteFill>
  );
};
