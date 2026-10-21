#!/usr/bin/env bash
set -euo pipefail

set -a
# shellcheck disable=SC1091
source /opt/shengzhang/shared/.env
set +a

cd /opt/shengzhang/current
pnpm --filter @shengzhang/api analytics:report -- "$@"
