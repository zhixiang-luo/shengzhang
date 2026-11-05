import { readFileSync } from 'node:fs';

import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';

describe('native splash wordmark asset', () => {
  it('renders as a sparse transparent wordmark instead of a full-size circular plate', () => {
    const source = readFileSync(
      new URL('../../../../../design/assets/splash-wordmark.svg', import.meta.url),
      'utf8',
    );
    const image = new Resvg(source, {
      fitTo: { mode: 'width', value: 720 },
    }).render();
    const pixels = image.pixels;

    expect(image.width).toBeGreaterThan(image.height);
    expect(image.height).toBeGreaterThan(100);

    const cornerAlpha = pixels[3];
    expect(cornerAlpha).toBe(0);

    let visiblePixels = 0;
    let darkPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (alpha > 0) visiblePixels += 1;
      if (alpha > 200 && pixels[index] < 80 && pixels[index + 1] < 80 && pixels[index + 2] < 80) {
        darkPixels += 1;
      }
    }

    const coverage = visiblePixels / (image.width * image.height);
    expect(coverage).toBeLessThan(0.2);
    expect(darkPixels).toBeGreaterThan(500);
  });

  it('ships the rendered wordmark as a landscape transparent PNG', () => {
    const png = readFileSync(new URL('../../../assets/splash-icon.png', import.meta.url));

    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBeGreaterThan(png.readUInt32BE(20));
    expect(png.readUInt32BE(20)).toBeGreaterThan(100);
    expect(png[25]).toBe(6);
  });
});
