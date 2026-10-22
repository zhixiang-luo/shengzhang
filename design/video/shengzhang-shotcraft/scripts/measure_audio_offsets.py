#!/usr/bin/env python3
"""Measure each SFX file's audible peak lag for frame-aligned placement."""

from __future__ import annotations

import array
import subprocess
import sys
from pathlib import Path


SAMPLE_RATE = 48_000
FPS = 30
WINDOW = 960  # 20 ms energy window


def peak_lag_frames(path: Path) -> tuple[float, float]:
    process = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(path),
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

    best_index = 0
    best_energy = -1.0
    for index in range(0, len(samples) - WINDOW, WINDOW // 2):
        energy = 0.0
        for sample in samples[index : index + WINDOW]:
            value = sample / 32768.0
            energy += value * value
        if energy > best_energy:
            best_energy = energy
            best_index = index

    seconds = best_index / SAMPLE_RATE
    return seconds * FPS, seconds


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    names = [
        "transition-soft.mp3",
        "whoosh-fast.mp3",
        "whoosh-big.mp3",
        "swoosh-quick.mp3",
        "transition-snap.mp3",
        "click-camera.mp3",
        "sparkle.mp3",
        "riser-cine.mp3",
        "impact-deep-whoosh.mp3",
    ]
    for name in names:
        path = root / "public" / "audio" / name
        frames, seconds = peak_lag_frames(path)
        print(f"{name:28s} peak={seconds:6.3f}s  lag={frames:5.2f}f")


if __name__ == "__main__":
    main()
