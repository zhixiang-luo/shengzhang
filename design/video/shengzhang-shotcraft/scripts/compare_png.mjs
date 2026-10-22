#!/usr/bin/env node
// Pixel comparison fallback for video-shotcraft parity when Pillow is unavailable.
// Usage: node scripts/compare_png.mjs <image-a> <image-b> <channel-tolerance>
import { spawnSync } from 'node:child_process';

const [aPath, bPath, toleranceArg] = process.argv.slice(2);
const tolerance = Number(toleranceArg ?? 2);

if (!aPath || !bPath || !Number.isFinite(tolerance)) {
  console.error('usage: node scripts/compare_png.mjs <image-a> <image-b> <channel-tolerance>');
  process.exit(2);
}

const decodeRgb = (path) => {
  const result = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { encoding: null, maxBuffer: 128 * 1024 * 1024 },
  );
  if (result.status !== 0 || !result.stdout?.length) {
    throw new Error(result.stderr?.toString() || `unable to decode ${path}`);
  }
  return result.stdout;
};

try {
  const a = decodeRgb(aPath);
  const b = decodeRgb(bPath);
  if (a.length !== b.length || a.length % 3 !== 0) {
    console.error(`SIZE ${a.length} ${b.length}`);
    process.exit(3);
  }

  let bad = 0;
  let maxDifference = 0;
  for (let offset = 0; offset < a.length; offset += 3) {
    const difference = Math.max(
      Math.abs(a[offset] - b[offset]),
      Math.abs(a[offset + 1] - b[offset + 1]),
      Math.abs(a[offset + 2] - b[offset + 2]),
    );
    maxDifference = Math.max(maxDifference, difference);
    if (difference > tolerance) bad += 1;
  }

  console.log(`${bad} ${a.length / 3} ${maxDifference}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(3);
}
