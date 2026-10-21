#!/usr/bin/env bash
set -euo pipefail

report_date="${1:-$(TZ=Asia/Shanghai date -d 'yesterday' +%F)}"
report_directory=/opt/shengzhang/shared/reports
report_path="${report_directory}/daily-${report_date}.md"
mkdir -p "$report_directory"

{
  echo "# 声账每日运营简报"
  echo
  echo "- 统计日期：${report_date}"
  echo "- 生成时间：$(TZ=Asia/Shanghai date '+%F %T')"
  echo "- 主机：$(hostname)"
  echo
  echo "## 服务器状态"
  echo
  echo '```text'
  echo "uptime: $(uptime -p)"
  if systemctl is-active --quiet nginx; then echo 'nginx: active'; else echo 'nginx: DOWN'; fi
  if systemctl is-active --quiet shengzhang-api; then echo 'shengzhang-api: active'; else echo 'shengzhang-api: DOWN'; fi
  echo "health: $(curl -fsS --max-time 5 http://127.0.0.1:8788/health || echo 'UNREACHABLE')"
  echo "disk: $(df -h / | awk 'NR==2 {print $3 " used / " $2 " (" $5 ")"}')"
  echo "memory: $(free -m | awk '/Mem:/ {print $3 " MiB used / " $2 " MiB"}')"
  echo '```'
  echo
  echo "## 产品数据"
  echo
  /opt/shengzhang/bin/analytics-report.sh "--date=${report_date}"
  echo
  echo "## 错误日志"
  echo
  echo '```text'
  journalctl -u shengzhang-api --since "${report_date} 00:00:00 +0800" --until "${report_date} 23:59:59 +0800" -p err --no-pager 2>/dev/null | tail -10 || true
  echo '```'
} | tee "$report_path"
