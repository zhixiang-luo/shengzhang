import React from 'react';
import { Img, staticFile } from 'remotion';
import { COLORS, alpha, softShadow } from './theme';

export const PHONE_ASPECT = 1688 / 780;

export const PhoneMock: React.FC<{
  x: number;
  y: number;
  width: number;
  screen: string;
  transform?: string;
  opacity?: number;
  screenScale?: number;
  screenOffsetY?: number;
}> = ({ x, y, width, screen, transform, opacity = 1, screenScale = 1, screenOffsetY = 0 }) => {
  const height = width * PHONE_ASPECT;
  const rim = Math.max(8, width * 0.025);
  const screenRadius = width * 0.115;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        opacity,
        transform,
        transformOrigin: '50% 100%',
        borderRadius: screenRadius + rim,
        padding: rim,
        background:
          'linear-gradient(145deg, #efe0cf 0%, #b7a18d 26%, #f4eadc 48%, #8d7968 76%, #d5c2ae 100%)',
        boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,.62), inset 0 0 0 3px rgba(41,38,36,.14), ${softShadow(
          46,
          '#5a4234',
        )}, 0 80px 130px -44px ${alpha(COLORS.ink, 0.34)}`,
        boxSizing: 'border-box',
      }}
    >
      {[-1, 1].map((side) => (
        <React.Fragment key={side}>
          <div
            style={{
              position: 'absolute',
              top: '19%',
              left: side < 0 ? -4 : width - 2,
              width: 4,
              height: '8%',
              borderRadius: 4,
              background: 'linear-gradient(180deg, #9d8b79, #e4d6c6, #8c7867)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '32%',
              left: side < 0 ? -4 : width - 2,
              width: 4,
              height: '11%',
              borderRadius: 4,
              background: 'linear-gradient(180deg, #9d8b79, #e4d6c6, #8c7867)',
            }}
          />
        </React.Fragment>
      ))}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: screenRadius,
          padding: rim * 0.55,
          overflow: 'hidden',
          background: '#0d0b09',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: rim * 0.55,
            borderRadius: screenRadius - rim * 0.4,
            overflow: 'hidden',
            background: COLORS.canvas,
          }}
        >
          <Img
            src={staticFile(screen)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `translateY(${screenOffsetY}px) scale(${screenScale})`,
              transformOrigin: '50% 45%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(116deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 74%, rgba(255,255,255,.07) 100%)',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: rim * 1.2,
            left: '50%',
            width: width * 0.22,
            height: width * 0.055,
            marginLeft: -width * 0.11,
            borderRadius: 999,
            background: '#0b0908',
          }}
        />
      </div>
    </div>
  );
};

