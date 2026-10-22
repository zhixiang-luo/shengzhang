#!/usr/bin/env python3
"""Report prominent energy peaks from the SFX-only render."""

from __future__ import annotations

import array
import math
import subprocess
import sys
from pathlib import Path


SAMPLE_RATE = 48_000
FPS = 30
WINDOW = 480  # 10 ms
MIN_SEPARATION = int(0.22 * SAMPLE_RATE)


def decode(path: Path) -> array.array:
    process = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_RATE),
            "-f",
            "s16le",
            "-",
        ],
        check=True,
        stdout=subprocess.PIPE,
    )
    samples = array.array("h")
    samples.frombytes(process.stdout)
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("out/shengzhang-shotcraft-nobgm.mp4")
    samples = decode(path)
    candidates: list[tuple[float, int]] = []
    for index in range(0, len(samples) - WINDOW, WINDOW):
        energy = 0.0
        for sample in samples[index : index + WINDOW]:
            value = sample / 32768.0
            energy += value * value
        candidates.append((energy, index + WINDOW // 2))

    peaks: list[tuple[float, int]] = []
    for energy, index in sorted(candidates, reverse=True):
        if any(abs(index - other) < MIN_SEPARATION for _, other in peaks):
            continue
        peaks.append((energy, index))
        if len(peaks) >= 18:
            break

    for rank, (energy, index) in enumerate(sorted(peaks, key=lambda item: item[1]), start=1):
        seconds = index / SAMPLE_RATE
        frame = seconds * FPS
        rms = math.sqrt(energy / WINDOW)
        db = 20 * math.log10(max(1e-9, rms))
        print(f"{rank:02d}  {seconds:6.3f}s  frame={frame:6.2f}  rms={db:6.2f} dB")


if __name__ == "__main__":
    main()
