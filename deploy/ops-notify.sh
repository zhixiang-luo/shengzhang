#!/usr/bin/env bash
set -euo pipefail

key="${1:?alert key is required}"
subject="${2:?email subject is required}"
body_path="${3:?email body file is required}"
cooldown_seconds="${4:-3600}"

state_dir="${OPS_ALERT_STATE_DIR:-/opt/shengzhang/ops/alert-state}"
env_file="${OPS_ALERT_ENV_FILE:-/opt/shengzhang/ops/alerts.env}"
email_helper="${OPS_EMAIL_HELPER:-/opt/shengzhang/ops/send-alert-email.py}"
safe_key="$(printf '%s' "$key" | tr -cd 'A-Za-z0-9._-')"
last_sent_path="${state_dir}/last-${safe_key}"
last_attempt_path="${state_dir}/attempt-${safe_key}"
retry_seconds="${OPS_EMAIL_RETRY_SECONDS:-300}"
mkdir -p "$state_dir"

if [ -r "$env_file" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
fi

now="$(date +%s)"
if [ -f "$last_attempt_path" ]; then
  last_attempt="$(cat "$last_attempt_path" 2>/dev/null || printf '0')"
  if [ $((now - last_attempt)) -lt "$retry_seconds" ]; then
    printf 'delivery retry suppressed key=%s remaining=%ss\n' "$key" "$((retry_seconds - (now - last_attempt)))"
    exit 2
  fi
fi

if [ -f "$last_sent_path" ]; then
  last_sent="$(cat "$last_sent_path" 2>/dev/null || printf '0')"
  if [ "$cooldown_seconds" -gt 0 ] && [ $((now - last_sent)) -lt "$cooldown_seconds" ]; then
    printf 'suppressed key=%s remaining=%ss\n' "$key" "$((cooldown_seconds - (now - last_sent)))"
    exit 0
  fi
fi

if [ ! -r "$body_path" ]; then
  printf 'email body is unavailable: %s\n' "$body_path" >&2
  exit 1
fi

if ! python3 "$email_helper" "$subject" < "$body_path"; then
  printf '%s\n' "$now" > "$last_attempt_path"
  printf 'email unavailable or delivery failed for key=%s\n' "$key" >&2
  exit 2
fi

printf '%s\n' "$now" > "$last_sent_path"
rm -f "$last_attempt_path"
printf 'sent key=%s subject=%s\n' "$key" "$subject"
