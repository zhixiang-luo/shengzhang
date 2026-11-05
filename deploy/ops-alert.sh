#!/usr/bin/env bash
set -euo pipefail

alert_state_dir="${OPS_ALERT_STATE_DIR:-/opt/shengzhang/ops/alert-state}"
alert_log="${OPS_ALERT_LOG:-/opt/shengzhang/ops/ops-alerts.log}"
notifier="${OPS_NOTIFIER:-/opt/shengzhang/ops/ops-notify.sh}"
network_state="${OPS_NETWORK_STATE_FILE:-${alert_state_dir}/network.last}"
seen_keys=""
delivery_failed=0

mkdir -p "$alert_state_dir/active"

rotate_log() {
  local path="$1"
  local max_bytes="$2"
  local keep_files="$3"
  local index
  local current_size

  [ -f "$path" ] || return 0
  current_size="$(wc -c < "$path" | tr -d ' ')"
  [ "$current_size" -ge "$max_bytes" ] || return 0

  index="$keep_files"
  while [ "$index" -gt 1 ]; do
    if [ -f "${path}.$((index - 1))" ]; then
      mv -f "${path}.$((index - 1))" "${path}.${index}"
    fi
    index="$((index - 1))"
  done
  mv -f "$path" "${path}.1"
  : > "$path"
}

rotate_log \
  "$alert_log" \
  "${OPS_ALERT_LOG_MAX_BYTES:-10485760}" \
  "${OPS_ALERT_LOG_KEEP_FILES:-5}"

now_text="$(TZ=Asia/Shanghai date '+%F %T %Z')"
host_name="$(hostname)"
api_active="$(systemctl is-active shengzhang-api 2>/dev/null || true)"
nginx_active="$(systemctl is-active nginx 2>/dev/null || true)"
health_code="$(
  curl -sS -o /dev/null -w '%{http_code}' --max-time 5 \
    http://127.0.0.1:8788/health 2>/dev/null || true
)"
health_code="${health_code:-000}"
disk_pct="$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
mem_total_mib="$(awk '/MemTotal:/ {print int($2 / 1024)}' /proc/meminfo)"
mem_avail_mib="$(awk '/MemAvailable:/ {print int($2 / 1024)}' /proc/meminfo)"
load_1m="$(awk '{print $1}' /proc/loadavg)"
cpu_count="$(nproc)"
network_interface="$(
  OPS_NETWORK_INTERFACE="${OPS_NETWORK_INTERFACE:-}" \
    bash -c 'if [ -n "$OPS_NETWORK_INTERFACE" ]; then printf "%s" "$OPS_NETWORK_INTERFACE"; else ip route show default 2>/dev/null | awk "/default/ {print \$5; exit}"; fi'
)"
network_interface="${network_interface:-eth0}"
network_counters="$(
  awk -v iface="$network_interface" '
    $0 ~ "^[[:space:]]*" iface ":" {
      gsub(":", "", $1)
      print $2, $10
      exit
    }
  ' /proc/net/dev
)"
rx_bytes="$(printf '%s\n' "$network_counters" | awk '{print $1}')"
tx_bytes="$(printf '%s\n' "$network_counters" | awk '{print $2}')"
rx_bytes="${rx_bytes:-0}"
tx_bytes="${tx_bytes:-0}"
rx_mbps="unknown"
tx_mbps="unknown"
sample_epoch="$(date +%s)"
if [ -r "$network_state" ]; then
  read -r previous_epoch previous_rx previous_tx < "$network_state" || true
  if [ -n "${previous_epoch:-}" ] && [ "$sample_epoch" -gt "$previous_epoch" ]; then
    elapsed="$((sample_epoch - previous_epoch))"
    rx_delta="$((rx_bytes - previous_rx))"
    tx_delta="$((tx_bytes - previous_tx))"
    if [ "$elapsed" -ge 60 ] && [ "$rx_delta" -ge 0 ] && [ "$tx_delta" -ge 0 ]; then
      rx_mbps="$(awk -v bytes="$rx_delta" -v seconds="$elapsed" 'BEGIN {printf "%.2f", bytes * 8 / seconds / 1000000}')"
      tx_mbps="$(awk -v bytes="$tx_delta" -v seconds="$elapsed" 'BEGIN {printf "%.2f", bytes * 8 / seconds / 1000000}')"
    fi
  fi
fi
printf '%s %s %s\n' "$sample_epoch" "$rx_bytes" "$tx_bytes" > "$network_state"
api_errors="$(
  journalctl -u shengzhang-api --since '15 minutes ago' -p err --no-pager -q 2>/dev/null \
    | wc -l | tr -d ' '
)"

disk_warn="${OPS_DISK_WARN_PERCENT:-80}"
disk_critical="${OPS_DISK_CRITICAL_PERCENT:-90}"
mem_warn="${OPS_MEMORY_WARN_MIB:-250}"
mem_critical="${OPS_MEMORY_CRITICAL_MIB:-150}"
load_warn="${OPS_LOAD_WARN:-2.4}"
load_critical="${OPS_LOAD_CRITICAL:-4.0}"
error_warn="${OPS_ERROR_WARN_COUNT:-5}"
error_critical="${OPS_ERROR_CRITICAL_COUNT:-25}"
network_warn="${OPS_NETWORK_WARN_MBPS:-2.5}"
network_critical="${OPS_NETWORK_CRITICAL_MBPS:-4.0}"

trigger_alert() {
  local key="$1"
  local severity="$2"
  local title="$3"
  local detail="$4"
  local cooldown_seconds
  local active_path="${alert_state_dir}/active/${key}"
  local body_path="${alert_state_dir}/${key}.body"
  seen_keys="${seen_keys} ${key} "

  if [ "$severity" = "critical" ]; then
    cooldown_seconds="${OPS_CRITICAL_COOLDOWN_SECONDS:-3600}"
  else
    cooldown_seconds="${OPS_WARNING_COOLDOWN_SECONDS:-21600}"
  fi

  {
    printf '声账运维告警\n\n'
    printf '级别：%s\n' "$severity"
    printf '主机：%s\n' "$host_name"
    printf '时间：%s\n' "$now_text"
    printf '问题：%s\n' "$title"
    printf '%s\n\n' "$detail"
    printf '当前指标\n'
    printf -- '- API：%s\n' "${api_active:-unknown}"
    printf -- '- Nginx：%s\n' "${nginx_active:-unknown}"
    printf -- '- 健康检查 HTTP：%s\n' "$health_code"
    printf -- '- 磁盘使用率：%s%%\n' "$disk_pct"
    printf -- '- 可用内存：%s MiB / %s MiB\n' "$mem_avail_mib" "$mem_total_mib"
    printf -- '- 1 分钟负载：%s / %s CPU\n' "$load_1m" "$cpu_count"
    printf -- '- 网络 %s：接收 %s Mbps / 发送 %s Mbps\n' "$network_interface" "$rx_mbps" "$tx_mbps"
    printf -- '- 最近 15 分钟 API 错误日志：%s 行\n' "$api_errors"
    printf '\n处理建议\n'
    printf '登录服务器检查 systemctl、journalctl、df -h 和 free -m；如无法及时恢复，先确认语音接口是否需要限流或停机保护。\n'
  } > "$body_path"

  touch "$active_path"
  if ! "$notifier" "$key" "$title" "$body_path" "$cooldown_seconds"; then
    delivery_failed=1
  fi
}

if [ "$api_active" != "active" ]; then
  trigger_alert \
    "api-down" \
    "critical" \
    "声账 API 已停止" \
    "shengzhang-api 服务当前不是 active 状态，语音和 App 更新策略可能不可用。"
fi

if [ "$nginx_active" != "active" ]; then
  trigger_alert \
    "nginx-down" \
    "critical" \
    "Nginx 已停止" \
    "Nginx 当前不是 active 状态，官网、HTTPS、API 和 WSS 都可能不可用。"
fi

if [ "$health_code" != "200" ]; then
  trigger_alert \
    "health-failed" \
    "critical" \
    "声账健康检查失败" \
    "本机 /health 返回 HTTP ${health_code}，需要检查 API 进程和反向代理。"
fi

if [ "$disk_pct" -ge "$disk_critical" ]; then
  trigger_alert \
    "disk-critical" \
    "critical" \
    "服务器磁盘空间严重不足" \
    "根分区使用率 ${disk_pct}%，达到紧急阈值 ${disk_critical}%。"
elif [ "$disk_pct" -ge "$disk_warn" ]; then
  trigger_alert \
    "disk-warning" \
    "warning" \
    "服务器磁盘空间偏高" \
    "根分区使用率 ${disk_pct}%，达到预警阈值 ${disk_warn}%。"
fi

if [ "$mem_avail_mib" -le "$mem_critical" ]; then
  trigger_alert \
    "memory-critical" \
    "critical" \
    "服务器可用内存严重不足" \
    "可用内存仅 ${mem_avail_mib} MiB，达到紧急阈值 ${mem_critical} MiB。"
elif [ "$mem_avail_mib" -le "$mem_warn" ]; then
  trigger_alert \
    "memory-warning" \
    "warning" \
    "服务器可用内存偏低" \
    "可用内存 ${mem_avail_mib} MiB，达到预警阈值 ${mem_warn} MiB。"
fi

if awk -v load_value="$load_1m" -v limit="$load_critical" 'BEGIN {exit !(load_value >= limit)}'; then
  trigger_alert \
    "load-critical" \
    "critical" \
    "服务器负载过高" \
    "1 分钟负载 ${load_1m}，达到紧急阈值 ${load_critical}。"
elif awk -v load_value="$load_1m" -v limit="$load_warn" 'BEGIN {exit !(load_value >= limit)}'; then
  trigger_alert \
    "load-warning" \
    "warning" \
    "服务器负载偏高" \
    "1 分钟负载 ${load_1m}，达到预警阈值 ${load_warn}。"
fi

if [ "$api_errors" -ge "$error_critical" ]; then
  trigger_alert \
    "api-errors-critical" \
    "critical" \
    "API 错误日志激增" \
    "最近 15 分钟检测到 ${api_errors} 行 error 级日志，达到紧急阈值 ${error_critical}。"
elif [ "$api_errors" -ge "$error_warn" ]; then
  trigger_alert \
    "api-errors-warning" \
    "warning" \
    "API 错误日志增多" \
    "最近 15 分钟检测到 ${api_errors} 行 error 级日志，达到预警阈值 ${error_warn}。"
fi

if [ "$tx_mbps" != "unknown" ]; then
  if awk -v mbps="$tx_mbps" -v limit="$network_critical" 'BEGIN {exit !(mbps >= limit)}'; then
    trigger_alert \
      "network-egress-critical" \
      "critical" \
      "服务器出网带宽接近或达到上限" \
      "${network_interface} 最近采样平均发送速率 ${tx_mbps} Mbps，达到紧急阈值 ${network_critical} Mbps。"
  elif awk -v mbps="$tx_mbps" -v limit="$network_warn" 'BEGIN {exit !(mbps >= limit)}'; then
    trigger_alert \
      "network-egress-warning" \
      "warning" \
      "服务器出网带宽偏高" \
      "${network_interface} 最近采样平均发送速率 ${tx_mbps} Mbps，达到预警阈值 ${network_warn} Mbps。"
  fi
fi

for active_file in "$alert_state_dir"/active/*; do
  [ -e "$active_file" ] || continue
  key="$(basename "$active_file")"
  case " $seen_keys " in
    *" $key "*) continue ;;
  esac
  body_path="${alert_state_dir}/recovered-${key}.body"
  {
    printf '声账恢复通知\n\n'
    printf '主机：%s\n' "$host_name"
    printf '时间：%s\n' "$now_text"
    printf '原问题：%s\n\n' "$key"
    printf '对应异常已连续通过本轮检查，系统指标恢复或服务已重新可用。\n'
    printf '当前健康检查 HTTP：%s\n' "$health_code"
    printf '当前 API：%s\n' "${api_active:-unknown}"
    printf '当前 Nginx：%s\n' "${nginx_active:-unknown}"
  } > "$body_path"
  if ! "$notifier" "recovered-${key}" "异常已恢复：${key}" "$body_path" 0; then
    delivery_failed=1
  fi
  rm -f "$active_file"
done

printf '%s api=%s nginx=%s health=%s disk=%s%% mem_available=%sMiB load=%s iface=%s rx_mbps=%s tx_mbps=%s errors_15m=%s alerts=%s\n' \
  "$now_text" "$api_active" "$nginx_active" "$health_code" "$disk_pct" \
  "$mem_avail_mib" "$load_1m" "$network_interface" "$rx_mbps" "$tx_mbps" \
  "$api_errors" "${seen_keys:-none}" >> "$alert_log"

if [ "$delivery_failed" -ne 0 ]; then
  exit 2
fi
