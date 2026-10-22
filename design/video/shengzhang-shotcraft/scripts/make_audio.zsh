#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
AUDIO_DIR="$ROOT/public/audio"
VOICE_DIR="$AUDIO_DIR/vo-xiaoxiao"
TMP_DIR="$(mktemp -d)"
VOICE_RAW_DIR="$TMP_DIR/vo-xiaoxiao-raw"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$VOICE_DIR"
python3 "$ROOT/scripts/make_score.py" --music-only
python3 "$ROOT/scripts/make_score.py" --sfx-only
PYTHONPATH="${EDGE_TTS_PYTHONPATH:-${PYTHONPATH:-}}" \
  python3 "$ROOT/scripts/make_voice_edge.py" --out "$VOICE_RAW_DIR"

# Remotion 4 + AAC 48k 实测音频比目标帧晚约 1.2f；所有 stem 统一裁掉 40ms，
# 尾部补等长静音以保持精确 25.233s。
for stem in music sfx; do
  ffmpeg -hide_banner -loglevel error -y \
    -i "$AUDIO_DIR/${stem}-source.wav" \
    -af "atrim=start=0.04,asetpts=PTS-STARTPTS,apad=pad_dur=0.04" \
    -t 25.233333 -ar 48000 -ac 2 \
    "$AUDIO_DIR/${stem}.wav"
done

# Lines 01 and 02 stay silent so the waveform scene remains a synthetic demo.
for index in {1..8}; do
  output_file="$VOICE_DIR/$(printf '%02d' "$index").wav"
  source_file="$VOICE_RAW_DIR/$(printf '%02d' "$index").mp3"
  if [[ ! -f "$source_file" ]]; then
    ffmpeg -hide_banner -loglevel error -y \
      -f lavfi -i "anullsrc=r=48000:cl=mono" \
      -t 0.01 -ar 48000 -ac 1 "$output_file"
    continue
  fi
  ffmpeg -hide_banner -loglevel error -y \
    -i "$source_file" \
    -af "highpass=f=90,lowpass=f=11000,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1:g=1.5,acompressor=threshold=0.11:ratio=2.8:attack=8:release=150,loudnorm=I=-18:TP=-2:LRA=5,atrim=start=0.04,asetpts=PTS-STARTPTS" \
    -ar 48000 -ac 1 \
    "$output_file"
done

# Preview mix only. Remotion itself mounts music, SFX and narration as separate tracks.
ffmpeg -hide_banner -loglevel error -y \
  -i "$AUDIO_DIR/music.wav" \
  -i "$AUDIO_DIR/sfx.wav" \
  -i "$VOICE_DIR/03.wav" \
  -i "$VOICE_DIR/04.wav" \
  -i "$VOICE_DIR/05.wav" \
  -i "$VOICE_DIR/06.wav" \
  -i "$VOICE_DIR/07.wav" \
  -i "$VOICE_DIR/08.wav" \
  -filter_complex "\
[2:a]adelay=5767|5767,volume=1.35[vo3];\
[3:a]adelay=7850|7850,volume=1.35[vo4];\
[4:a]adelay=10233|10233,volume=1.35[vo5];\
[5:a]adelay=13350|13350,volume=1.35[vo6];\
[6:a]adelay=16267|16267,volume=1.35[vo7];\
[7:a]adelay=20650|20650,volume=1.38[vo8];\
[0:a]volume=1[music];[1:a]volume=1[sfx];\
[vo3][vo4][vo5][vo6][vo7][vo8][music][sfx]amix=inputs=8:duration=longest:normalize=0,\
alimiter=limit=0.94,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000[out]" \
  -map "[out]" -t 25.233333 -ar 48000 -ac 2 \
  "$AUDIO_DIR/soundtrack.wav"

printf 'Wrote %s\n' "$AUDIO_DIR/music.wav"
printf 'Wrote %s\n' "$AUDIO_DIR/sfx.wav"
printf 'Wrote %s\n' "$AUDIO_DIR/soundtrack.wav"

for file in "$VOICE_DIR"/*.wav; do
  duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$file")"
  printf '  %s  %.2fs\n' "$(basename "$file")" "$duration"
done
