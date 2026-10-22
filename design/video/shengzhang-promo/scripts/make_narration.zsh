#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
VOICE_DIR="$ROOT/assets/audio/vo-xiaoxiao"
TMP_DIR="$(mktemp -d)"
VOICE_RAW_DIR="$TMP_DIR/vo-xiaoxiao-raw"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$VOICE_DIR"
PYTHONPATH="${EDGE_TTS_PYTHONPATH:-${PYTHONPATH:-}}" \
  python3 "$ROOT/scripts/make_voice_edge.py" --out "$VOICE_RAW_DIR"

for index in {1..8}; do
  source_file="$VOICE_RAW_DIR/$(printf '%02d' "$index").mp3"
  output_file="$VOICE_DIR/$(printf '%02d' "$index").wav"
  ffmpeg -hide_banner -loglevel error -y \
    -i "$source_file" \
    -ar 48000 -ac 1 \
    -af "highpass=f=90,lowpass=f=11000,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1:g=1.5,acompressor=threshold=0.11:ratio=2.8:attack=8:release=150,loudnorm=I=-18:TP=-2:LRA=5" \
    "$output_file"
done

if [[ ! -f "$ROOT/assets/audio/music.wav" ]]; then
  python3 "$ROOT/scripts/make_music.py"
fi

ffmpeg -hide_banner -loglevel error -y \
  -i "$VOICE_DIR/01.wav" \
  -i "$VOICE_DIR/02.wav" \
  -i "$VOICE_DIR/03.wav" \
  -i "$VOICE_DIR/04.wav" \
  -i "$VOICE_DIR/05.wav" \
  -i "$VOICE_DIR/06.wav" \
  -i "$VOICE_DIR/07.wav" \
  -i "$VOICE_DIR/08.wav" \
  -i "$ROOT/assets/audio/music.wav" \
  -filter_complex "\
[0:a]adelay=650|650,volume=1.18[vo1];\
[1:a]adelay=4350|4350,volume=1.18[vo2];\
[2:a]adelay=6900|6900,volume=1.18[vo3];\
[3:a]adelay=10750|10750,volume=1.18[vo4];\
[4:a]adelay=13750|13750,volume=1.12[vo5];\
[5:a]adelay=16650|16650,volume=1.15[vo6];\
[6:a]adelay=19850|19850,volume=1.15[vo7];\
[7:a]adelay=23350|23350,volume=1.2[vo8];\
[8:a]volume=0.23,highpass=f=40[music];\
[vo1][vo2][vo3][vo4][vo5][vo6][vo7][vo8][music]amix=inputs=9:duration=longest:normalize=0,\
alimiter=limit=0.92,loudnorm=I=-16:TP=-1.5:LRA=7[out]" \
  -map "[out]" -ar 48000 -ac 2 -t 27 \
  "$ROOT/assets/audio/soundtrack.wav"

printf 'Narration clips:\n'
for file in "$VOICE_DIR"/*.wav; do
  duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$file")"
  printf '  %s  %.2fs\n' "${file:t}" "$duration"
done
printf 'Soundtrack: %s\n' "$ROOT/assets/audio/soundtrack.wav"
