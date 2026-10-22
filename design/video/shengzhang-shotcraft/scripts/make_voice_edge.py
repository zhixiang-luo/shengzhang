#!/usr/bin/env python3
"""Generate the narration stems with an Edge TTS Mandarin voice."""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

import edge_tts


async def generate(project_root: Path, output_dir: Path) -> None:
    config = json.loads((project_root / "scripts" / "voice_lines.json").read_text())
    output_dir.mkdir(parents=True, exist_ok=True)

    for line in config["lines"]:
        output = output_dir / f"{line['id']}.mp3"
        communicate = edge_tts.Communicate(
            line["text"],
            voice=config["voice"],
            rate=line.get("rate", config.get("rate", "+0%")),
            pitch=config.get("pitch", "+0Hz"),
        )
        await communicate.save(str(output))
        print(f"{output.name}: {line['text']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    asyncio.run(generate(project_root, args.out.resolve()))


if __name__ == "__main__":
    main()
