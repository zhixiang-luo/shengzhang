#!/usr/bin/env bash
set -euo pipefail

report_date="${1:-$(TZ=Asia/Shanghai date -d 'yesterday' +%F)}"
report_directory=/opt/shengzhang/shared/reports
report_path="${report_directory}/daily-${report_date}.md"
notifier="${OPS_NOTIFIER:-/opt/shengzhang/ops/ops-notify.sh}"
alert_state_dir="${OPS_ALERT_STATE_DIR:-/opt/shengzhang/ops/alert-state}"
alerts_env="${OPS_ALERT_ENV_FILE:-/opt/shengzhang/ops/alerts.env}"
alert_log="${OPS_ALERT_LOG:-/opt/shengzhang/ops/ops-alerts.log}"
mkdir -p "$report_directory"

report_tmp="$(mktemp)"
trap 'rm -f "$report_tmp"' EXIT

analytics_output="$(
  /opt/shengzhang/bin/analytics-report.sh "--date=${report_date}" 2>&1 \
    || printf 'ANALYTICS_REPORT_FAILED\n'
)"
active_users="$(
  printf '%s\n' "$analytics_output" \
    | sed -n 's/^App 活跃安装[[:space:]]*//p' \
    | head -1
)"
voice_started="$(
  printf '%s\n' "$analytics_output" \
    | sed -n 's/^语音开始 \/ 完成[[:space:]]*\([0-9][0-9]*\).*/\1/p' \
    | head -1
)"
voice_failed="$(
  printf '%s\n' "$analytics_output" \
    | sed -n 's/^语音取消 \/ 失败[[:space:]]*[0-9][0-9]* \/ \([0-9][0-9]*\).*/\1/p' \
    | head -1
)"
active_users="${active_users:-0}"
voice_started="${voice_started:-0}"
voice_failed="${voice_failed:-0}"

user_milestone=""
user_capacity="正常"
if [ "$active_users" -ge 1000 ]; then
  user_milestone="1000"
  user_capacity="紧急：进入必须拆分数据库、限流和 API 实例的阶段"
elif [ "$active_users" -ge 500 ]; then
  user_milestone="500"
  user_capacity="预警：单机容量和语音出网带宽需要重点检查"
elif [ "$active_users" -ge 300 ]; then
  user_milestone="300"
  user_capacity="规划：准备持久化限流和第二个 API 实例"
elif [ "$active_users" -ge 100 ]; then
  user_milestone="100"
  user_capacity="里程碑：开始持续跟踪语音并发和带宽"
fi

voice_capacity="正常"
if [ "$voice_started" -ge 2500 ]; then
  voice_capacity="紧急：完整语音流程可能已触发当前全局限流折算上限"
elif [ "$voice_started" -ge 1500 ]; then
  voice_capacity="预警：接近当前全局限流与单机容量边界"
elif [ "$voice_started" -ge 500 ]; then
  voice_capacity="观察：开始记录峰值并发和供应商配额"
fi

{
  echo "# 声账每日运营简报"
  echo
  echo "- 统计日期：${report_date}"
  echo "- 生成时间：$(TZ=Asia/Shanghai date '+%F %T')"
  echo "- 主机：$(hostname)"
  echo "- 邮件告警配置：$([ -r "$alerts_env" ] && echo '已配置' || echo '未配置')"
  echo
  echo "## 服务器状态"
  echo
  echo '```text'
  echo "uptime: $(uptime -p)"
  if systemctl is-active --quiet nginx; then echo 'nginx: active'; else echo 'nginx: DOWN'; fi
  if systemctl is-active --quiet shengzhang-api; then echo 'shengzhang-api: active'; else echo 'shengzhang-api: DOWN'; fi
  echo "api_restarts: $(systemctl show shengzhang-api -p NRestarts --value 2>/dev/null || echo 'unknown')"
  echo "health: $(curl -fsS --max-time 5 http://127.0.0.1:8788/health || echo 'UNREACHABLE')"
  echo "disk: $(df -h / | awk 'NR==2 {print $3 " used / " $2 " (" $5 ")"}')"
  echo "memory: $(free -m | awk '/Mem:/ {print $3 " MiB used / " $2 " MiB, " $7 " MiB available"}')"
  echo "load: $(awk '{print $1 " / " $2 " / " $3}' /proc/loadavg) on $(nproc) CPU"
  echo "network_latest: $(tail -1 "$alert_log" 2>/dev/null || echo 'unavailable')"
  echo '```'
  echo
  echo "## 容量与告警判断"
  echo
  echo "- 昨日活跃安装：${active_users}"
  echo "- 用户量判断：${user_capacity}"
  echo "- 昨日语音开始：${voice_started}"
  echo "- 昨日语音失败：${voice_failed}"
  echo "- 语音容量判断：${voice_capacity}"
  echo "- 紧急邮件告警：服务器每 5 分钟检查一次，异常时发送；恢复后发送恢复通知"
  if [ -d "$alert_state_dir/active" ] && find "$alert_state_dir/active" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null | grep -q .; then
    echo "- 当前未恢复告警：$(find "$alert_state_dir/active" -mindepth 1 -maxdepth 1 -printf '%f ' 2>/dev/null)"
  else
    echo "- 当前未恢复告警：无"
  fi
  echo
  echo "## 产品数据"
  echo
  echo '```text'
  printf '%s\n' "$analytics_output"
  echo '```'
  echo
  echo "## 错误日志"
  echo
  echo '```text'
  journalctl -u shengzhang-api --since "${report_date} 00:00:00 +0800" --until "${report_date} 23:59:59 +0800" -p err --no-pager 2>/dev/null | tail -10 || true
  echo '```'
} > "$report_tmp"

tee "$report_path" < "$report_tmp"

if [ -n "$user_milestone" ]; then
  milestone_body="$(mktemp)"
  {
    echo "声账用户量里程碑"
    echo
    echo "统计日期：${report_date}"
    echo "昨日活跃安装：${active_users}"
    echo "容量判断：${user_capacity}"
    echo "昨日语音开始：${voice_started}"
    echo "语音容量判断：${voice_capacity}"
    echo
    echo "建议现在检查语音并发、ECS 公网带宽、全局限流计数和供应商并发额度。"
  } > "$milestone_body"
  if ! "$notifier" "user-milestone-${user_milestone}" "昨日活跃安装达到 ${active_users}" "$milestone_body" 31536000; then
    echo "用户里程碑邮件未发送：邮件通道不可用。" >&2
  fi
  rm -f "$milestone_body"
fi
