#!/usr/bin/env python3
"""Generate the deterministic, original soundtrack for the Shengzhang promo."""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 48_000
DURATION = 27.0
FRAME_COUNT = int(SAMPLE_RATE * DURATION)
TAU = math.tau

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "audio" / "music.wav"

left = [0.0] * FRAME_COUNT
right = [0.0] * FRAME_COUNT

BARS = 12
BAR_SECONDS = 2.4
CHORDS = [
    (174.61, 220.00, 261.63, 329.63),  # Fmaj7
    (146.83, 174.61, 220.00, 261.63, 329.63),  # Dm9
    (116.54, 146.83, 174.61, 220.00),  # Bbmaj7
    (130.81, 164.81, 196.00, 293.66),  # C6/9
]


def pan_gains(pan: float) -> tuple[float, float]:
    angle = max(0.0, min(1.0, pan)) * math.pi / 2
    return math.cos(angle), math.sin(angle)


def add_tone(
    start: float,
    duration: float,
    frequency: float,
    amplitude: float,
    pan: float = 0.5,
    attack: float = 0.015,
    release: float = 0.2,
    harmonic: float = 0.18,
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


def add_kick(start: float, amplitude: float = 0.17) -> None:
    first = max(0, int(start * SAMPLE_RATE))
    count = min(FRAME_COUNT - first, int(0.24 * SAMPLE_RATE))
    for index in range(count):
        time = index / SAMPLE_RATE
        env = math.exp(-time * 18.0)
        frequency = 78.0 * math.exp(-time * 9.0) + 43.0
        sample = math.sin(TAU * frequency * time) * env * amplitude
        target = first + index
        left[target] += sample
        right[target] += sample


def add_brush(start: float, amplitude: float = 0.026, pan: float = 0.52) -> None:
    rng = random.Random(int(start * 10_000))
    first = max(0, int(start * SAMPLE_RATE))
    count = min(FRAME_COUNT - first, int(0.07 * SAMPLE_RATE))
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


def add_bell(start: float, notes: tuple[float, ...], amplitude: float = 0.12) -> None:
    for offset, frequency in enumerate(notes):
        add_tone(
            start + offset * 0.075,
            0.9,
            frequency,
            amplitude / (1.0 + offset * 0.2),
            pan=0.38 + offset * 0.08,
            attack=0.006,
            release=0.78,
            harmonic=0.32,
        )


def add_swoosh(start: float, duration: float = 0.8, amplitude: float = 0.055) -> None:
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
        left[target] += sample * (1.0 - progress * 0.2)
        right[target] += sample * (0.8 + progress * 0.2)


def section_gain(time: float) -> float:
    if time < 3.3:
        return 0.66
    if time < 15.0:
        return 0.86
    if time < 19.4:
        return 0.58
    if time < 23.0:
        return 0.88
    return 0.68


def build_music() -> None:
    # Warm pad and low root movement.
    for bar in range(BARS):
        start = bar * BAR_SECONDS
        chord = CHORDS[bar % len(CHORDS)]
        gain = section_gain(start)
        for note_index, note in enumerate(chord):
            add_tone(
                start,
                BAR_SECONDS + 0.18,
                note,
                0.043 * gain,
                pan=0.25 + note_index * 0.12,
                attack=0.24,
                release=0.48,
                harmonic=0.12,
            )
        add_tone(
            start,
            BAR_SECONDS,
            chord[0] / 2,
            0.031 * gain,
            pan=0.5,
            attack=0.16,
            release=0.4,
            harmonic=0.05,
        )

    # Sparse, human-scale arpeggio; it leaves the opening and trust scene quiet.
    for index in range(88):
        time = 0.8 + index * 0.27
        if 14.7 <= time <= 17.9:
            continue
        if time >= 26.2:
            break
        chord = CHORDS[int(time // BAR_SECONDS) % len(CHORDS)]
        note = chord[(index * 2 + 1) % len(chord)]
        if index % 4 == 2:
            note *= 2
        add_tone(
            time,
            0.34,
            note,
            0.026 * section_gain(time),
            pan=0.38 + (index % 4) * 0.08,
            attack=0.004,
            release=0.28,
            harmonic=0.28,
        )

    # Soft pulse from the first interaction through the statistics reveal.
    beat = 0.6
    beat_index = 0
    while beat_index * beat < 23.1:
        time = beat_index * beat
        if 4.1 <= time < 14.9 or 18.2 <= time < 23.0:
            if beat_index % 4 == 0:
                add_kick(time)
            elif beat_index % 2 == 0:
                add_kick(time, 0.075)
            add_brush(time + 0.03, 0.018 if beat_index % 2 else 0.025, 0.55)
        beat_index += 1

    # Signature moments: ripple in, three bill cards, saved, wipe, stats, outro.
    add_swoosh(3.0, 0.7, 0.045)
    add_bell(6.3, (523.25, 659.25), 0.09)
    add_bell(6.72, (587.33, 698.46), 0.08)
    add_bell(7.12, (659.25, 783.99), 0.085)
    add_bell(9.8, (523.25, 659.25, 783.99, 1046.50), 0.095)
    add_swoosh(14.72, 0.75, 0.04)
    add_bell(19.16, (440.00, 523.25, 659.25), 0.07)
    add_swoosh(22.72, 0.7, 0.036)
    add_bell(23.15, (349.23, 523.25, 698.46, 1046.50), 0.11)

    # Fade the edges so the audio starts and ends cleanly.
    fade_in = int(0.18 * SAMPLE_RATE)
    fade_out = int(1.25 * SAMPLE_RATE)
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
    normalise = 0.78 / peak if peak else 1.0
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

    print(f"Wrote {OUTPUT} ({DURATION:.1f}s, peak {normalise:.3f} gain)")


if __name__ == "__main__":
    build_music()

