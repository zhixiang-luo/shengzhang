#!/usr/bin/env python3
"""Generate the deterministic original score for the Shengzhang shotcraft promo."""

from __future__ import annotations

import math
import random
import struct
import sys
import wave
from pathlib import Path


SAMPLE_RATE = 48_000
DURATION = 757 / 30
FRAME_COUNT = int(round(SAMPLE_RATE * DURATION))
TAU = math.tau

ROOT = Path(__file__).resolve().parent.parent
MODE = "full"
if "--music-only" in sys.argv:
    MODE = "music-only"
elif "--sfx-only" in sys.argv:
    MODE = "sfx-only"
OUTPUT = ROOT / "public" / "audio" / (
    "music-source.wav" if MODE == "music-only" else "sfx-source.wav" if MODE == "sfx-only" else "score.wav"
)

left = [0.0] * FRAME_COUNT
right = [0.0] * FRAME_COUNT

BAR_SECONDS = 2.1
CHORDS = (
    (174.61, 220.00, 261.63, 329.63),  # Fmaj7
    (146.83, 174.61, 220.00, 261.63, 329.63),  # Dm9
    (116.54, 146.83, 174.61, 220.00),  # Bbmaj7
    (130.81, 164.81, 196.00, 293.66),  # C6/9
)


def pan_gains(pan: float) -> tuple[float, float]:
    angle = max(0.0, min(1.0, pan)) * math.pi / 2
    return math.cos(angle), math.sin(angle)


def section_gain(time: float) -> float:
    if time < 7.733:
        return 0.64
    if time < 13.333:
        return 0.88
    if time < 15.0:
        return 0.48
    if time < 20.333:
        return 0.82
    return 0.62


def add_tone(
    start: float,
    duration: float,
    frequency: float,
    amplitude: float,
    *,
    pan: float = 0.5,
    attack: float = 0.015,
    release: float = 0.2,
    harmonic: float = 0.16,
) -> None:
    first = max(0, int(start * SAMPLE_RATE))
    count = min(FRAME_COUNT - first, int(duration * SAMPLE_RATE))
    if count <= 0:
        return
    gl, gr = pan_gains(pan)
    for index in range(count):
        time = index / SAMPLE_RATE
        if time < attack:
            env = time / attack
        elif time > duration - release:
            env = max(0.0, (duration - time) / release)
        else:
            env = 1.0
        env = env * env * (3.0 - 2.0 * env)
        phase = TAU * frequency * time
        sample = math.sin(phase) + harmonic * math.sin(phase * 2.002)
        sample *= amplitude * env
        target = first + index
        left[target] += sample * gl
        right[target] += sample * gr


def add_kick(start: float, amplitude: float = 0.15) -> None:
    first = max(0, int(start * SAMPLE_RATE))
    count = min(FRAME_COUNT - first, int(0.25 * SAMPLE_RATE))
    for index in range(count):
        time = index / SAMPLE_RATE
        env = math.exp(-time * 18.0)
        frequency = 80.0 * math.exp(-time * 9.0) + 42.0
        sample = math.sin(TAU * frequency * time) * env * amplitude
        target = first + index
        left[target] += sample
        right[target] += sample


def add_brush(start: float, amplitude: float = 0.022, pan: float = 0.52) -> None:
    rng = random.Random(int(start * 10_000))
    first = max(0, int(start * SAMPLE_RATE))
    count = min(FRAME_COUNT - first, int(0.075 * SAMPLE_RATE))
    gl, gr = pan_gains(pan)
    previous = 0.0
    for index in range(count):
        time = index / SAMPLE_RATE
        noise = rng.uniform(-1.0, 1.0)
        high = noise - previous * 0.86
        previous = noise
        env = math.exp(-time * 42.0)
        sample = high * env * amplitude
        target = first + index
        left[target] += sample * gl
        right[target] += sample * gr


def add_bell(start: float, notes: tuple[float, ...], amplitude: float = 0.1) -> None:
    for offset, frequency in enumerate(notes):
        add_tone(
            start + offset * 0.072,
            0.92,
            frequency,
            amplitude / (1.0 + offset * 0.18),
            pan=0.36 + offset * 0.09,
            attack=0.005,
            release=0.8,
            harmonic=0.34,
        )


def add_swoosh(start: float, duration: float = 0.78, amplitude: float = 0.048) -> None:
    rng = random.Random(int(start * 1_000))
    first = max(0, int(start * SAMPLE_RATE))
    count = min(FRAME_COUNT - first, int(duration * SAMPLE_RATE))
    smoothed = 0.0
    for index in range(count):
        progress = index / max(1, count - 1)
        time = index / SAMPLE_RATE
        noise = rng.uniform(-1.0, 1.0)
        smoothed = smoothed * 0.74 + noise * 0.26
        shaped = noise - smoothed
        env = math.sin(math.pi * progress) ** 1.8
        shimmer = 0.72 + 0.28 * math.sin(TAU * 7.5 * time)
        sample = shaped * env * shimmer * amplitude
        target = first + index
        left[target] += sample * (1.0 - progress * 0.22)
        right[target] += sample * (0.78 + progress * 0.22)


def add_riser(start: float, end: float, amplitude: float = 0.04) -> None:
    rng = random.Random(int(start * 777))
    first = max(0, int(start * SAMPLE_RATE))
    count = min(FRAME_COUNT - first, int((end - start) * SAMPLE_RATE))
    smoothed = 0.0
    for index in range(count):
        progress = index / max(1, count - 1)
        noise = rng.uniform(-1.0, 1.0)
        smoothing = 0.9 - 0.55 * progress
        smoothed = smoothed * smoothing + noise * (1.0 - smoothing)
        shaped = noise - smoothed
        env = progress**1.7
        sample = shaped * env * amplitude
        target = first + index
        left[target] += sample * (0.52 + progress * 0.35)
        right[target] += sample * (0.48 + progress * 0.38)


def add_impact(start: float, amplitude: float = 0.2) -> None:
    first = max(0, int(start * SAMPLE_RATE))
    count = min(FRAME_COUNT - first, int(1.5 * SAMPLE_RATE))
    rng = random.Random(int(start * 100))
    for index in range(count):
        time = index / SAMPLE_RATE
        env = math.exp(-time * 4.6)
        low = math.sin(TAU * (54.0 - 12.0 * min(time, 0.8)) * time)
        air = rng.uniform(-1.0, 1.0) * math.exp(-time * 15.0) * 0.26
        sample = (low + air) * env * amplitude
        target = first + index
        left[target] += sample
        right[target] += sample


def build_score() -> None:
    if MODE != "sfx-only":
        bars = math.ceil(DURATION / BAR_SECONDS)
        for bar in range(bars):
            start = bar * BAR_SECONDS
            chord = CHORDS[bar % len(CHORDS)]
            gain = section_gain(start)
            for note_index, note in enumerate(chord):
                add_tone(
                    start,
                    BAR_SECONDS + 0.16,
                    note,
                    0.04 * gain,
                    pan=0.24 + note_index * 0.12,
                    attack=0.22,
                    release=0.46,
                    harmonic=0.12,
                )
            add_tone(
                start,
                BAR_SECONDS,
                chord[0] / 2,
                0.028 * gain,
                attack=0.14,
                release=0.38,
                harmonic=0.05,
            )

        # A sparse arpeggio gives the piece a human pulse without crowding the voiceover.
        for index in range(90):
            time = 0.55 + index * 0.28
            if time >= DURATION - 1.05:
                break
            if 13.0 <= time <= 14.75:
                continue
            chord = CHORDS[int(time // BAR_SECONDS) % len(CHORDS)]
            note = chord[(index * 2 + 1) % len(chord)]
            if index % 5 == 3:
                note *= 2
            add_tone(
                time,
                0.32,
                note,
                0.023 * section_gain(time),
                pan=0.38 + (index % 4) * 0.08,
                attack=0.004,
                release=0.26,
                harmonic=0.28,
            )

        beat = 0.484
        beat_index = 0
        while beat_index * beat < 20.25:
            time = beat_index * beat
            if 7.7 <= time < 13.333 or 15.0 <= time < 20.333:
                if beat_index % 4 == 0:
                    add_kick(time, 0.14)
                elif beat_index % 2 == 0:
                    add_kick(time, 0.065)
                add_brush(time + 0.028, 0.014 if beat_index % 2 else 0.02)
            beat_index += 1

    if MODE != "music-only":
        # Picture-sync events from the shotcraft timeline.
        add_swoosh(3.72, 0.68, 0.034)
        add_bell(4.2, (523.25, 659.25), 0.085)
        add_swoosh(5.733, 0.62, 0.035)
        add_bell(5.86, (392.00, 523.25, 783.99), 0.085)
        add_impact(7.733, 0.12)
        add_bell(7.86, (440.00, 523.25, 659.25), 0.07)
        add_bell(8.967, (523.25, 659.25), 0.056)
        add_bell(9.967, (587.33, 698.46), 0.054)
        add_bell(10.967, (659.25, 783.99), 0.052)
        add_swoosh(13.333, 0.62, 0.035)
        add_bell(15.0, (440.00, 523.25, 659.25), 0.068)
        add_bell(18.467, (523.25, 659.25), 0.052)
        add_riser(19.0, 20.333, 0.035)
        add_impact(20.333, 0.18)
        add_bell(20.65, (349.23, 523.25, 698.46, 1046.50), 0.095)
        add_impact(22.733, 0.15)
        add_bell(23.567, (523.25, 783.99, 1046.50), 0.075)
        add_bell(22.0, (349.23, 523.25, 783.99), 0.055)

    fade_in = int(0.18 * SAMPLE_RATE)
    fade_out = int(1.1 * SAMPLE_RATE)
    for index in range(fade_in):
        gain = index / fade_in
        left[index] *= gain
        right[index] *= gain
    for offset in range(fade_out):
        index = FRAME_COUNT - 1 - offset
        gain = offset / fade_out
        left[index] *= gain
        right[index] *= gain

    peak = max(max(abs(value) for value in left), max(abs(value) for value in right))
    normalise = 0.48 / peak if peak else 1.0
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "wb") as audio:
        audio.setnchannels(2)
        audio.setsampwidth(2)
        audio.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for l_sample, r_sample in zip(left, right):
            l_int = int(max(-1.0, min(1.0, l_sample * normalise)) * 32767)
            r_int = int(max(-1.0, min(1.0, r_sample * normalise)) * 32767)
            frames.extend(struct.pack("<hh", l_int, r_int))
        audio.writeframes(frames)

    print(f"Wrote {OUTPUT} ({DURATION:.3f}s)")


if __name__ == "__main__":
    build_score()
