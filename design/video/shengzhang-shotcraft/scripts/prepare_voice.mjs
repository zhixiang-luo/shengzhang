#!/usr/bin/env node
import { mkdirSync } from 'node:fs';

mkdirSync(new URL('../public/audio/vo-xiaoxiao', import.meta.url), { recursive: true });
console.log('旁白目录已就绪。若本机未安装 Edge TTS，请运行：');
console.log('  python3 -m pip install --user edge-tts');
