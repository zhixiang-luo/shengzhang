#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
retention_days="${FEEDBACK_RETENTION_DAYS:-180}"
cutoff_date="$(TZ=Asia/Shanghai date -d "${retention_days} days ago" +%F)"

"${script_dir}/feedback-report.sh" "--prune-before=${cutoff_date}"
