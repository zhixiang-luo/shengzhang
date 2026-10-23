import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

const root = resolve(import.meta.dirname, '..');
mkdirSync(resolve(root, 'design/exports'), { recursive: true });

const render = (sourcePath, size) => {
  const source = readFileSync(resolve(root, sourcePath), 'utf8');
  return new Resvg(source, {
    fitTo: { mode: 'width', value: size },
  })
    .render()
    .asPng();
};

const outputs = [
  ['design/assets/app-icon.svg', 'apps/mobile/assets/icon.png', 1024],
  ['design/assets/monochrome-icon.svg', 'apps/mobile/assets/monochrome-icon.png', 1024],
  ['design/assets/splash-mark.svg', 'apps/mobile/assets/splash-icon.png', 2048],
  ['design/assets/adaptive-icon.svg', 'apps/mobile/assets/adaptive-icon.png', 1024],
  ['design/assets/piggy-mark.svg', 'design/exports/brand-mark.png', 1024],
  ['design/assets/brand-lockup.svg', 'design/exports/brand-lockup.png', 2400],
];

for (const [sourcePath, outputPath, size] of outputs) {
  writeFileSync(resolve(root, outputPath), render(sourcePath, size));
  console.log(`Rendered ${outputPath} at ${size}px wide.`);
}
