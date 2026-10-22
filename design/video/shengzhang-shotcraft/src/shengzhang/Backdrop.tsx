import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, alpha } from './theme';

const hash = (value: number) => {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const grainUrl = (() => {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.83' numOctaves='3' stitchTiles='stitch'/>" +
    "<feColorMatrix type='saturate' values='0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)' opacity='0.5'/></svg>";
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.045 }) => {
  const frame = useCurrentFrame();
  const shift = Math.floor(frame / 2);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        mixBlendMode: 'multiply',
        backgroundImage: grainUrl,
        backgroundPosition: `${Math.floor(hash(shift + 1) * 220)}px ${Math.floor(hash(shift + 7) * 220)}px`,
      }}
    />
  );
};

export const Stage: React.FC<{
  children?: React.ReactNode;
  dark?: boolean;
  blushAt?: [number, number];
  sageAt?: [number, number];
}> = ({ children, dark = false, blushAt = [0.1, 0.12], sageAt = [0.9, 0.8] }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 18;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: dark ? COLORS.dark : COLORS.canvas,
        backgroundImage: dark
          ? `
            radial-gradient(circle at ${blushAt[0] * 100}% ${blushAt[1] * 100}%, ${alpha(COLORS.blush, 0.16)} 0%, ${alpha(COLORS.blush, 0)} 30%),
            radial-gradient(circle at ${sageAt[0] * 100}% ${sageAt[1] * 100}%, ${alpha(COLORS.sage, 0.14)} 0%, ${alpha(COLORS.sage, 0)} 34%)
          `
          : `
            radial-gradient(circle at ${blushAt[0] * 100}% ${blushAt[1] * 100}%, ${alpha(COLORS.blush, 0.24)} 0%, ${alpha(COLORS.blush, 0)} 31%),
            radial-gradient(circle at ${sageAt[0] * 100}% ${sageAt[1] * 100}%, ${alpha(COLORS.sage, 0.2)} 0%, ${alpha(COLORS.sage, 0)} 34%)
          `,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -80,
          background: dark
            ? `radial-gradient(ellipse 44% 58% at 53% 46%, ${alpha(COLORS.raised, 0.08)} 0%, ${alpha(COLORS.raised, 0)} 72%)`
            : `radial-gradient(ellipse 48% 64% at 52% 47%, ${alpha(COLORS.raised, 0.9)} 0%, ${alpha(COLORS.raised, 0)} 68%)`,
          transform: `translate(${drift}px, ${-drift * 0.35}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: dark
            ? `radial-gradient(ellipse 80% 82% at 50% 50%, ${alpha(COLORS.ink, 0)} 50%, ${alpha('#000000', 0.42)} 100%)`
            : `radial-gradient(ellipse 82% 84% at 50% 49%, ${alpha(COLORS.ink, 0)} 56%, ${alpha(COLORS.ink, 0.09)} 100%)`,
          pointerEvents: 'none',
        }}
      />
      {children}
      <Grain opacity={dark ? 0.065 : 0.04} />
    </div>
  );
};

