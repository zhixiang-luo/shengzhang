#!/usr/bin/env bash
set -euo pipefail

set -a
# shellcheck disable=SC1091
source /opt/shengzhang/shared/.env
set +a

cd /opt/shengzhang/current
DOTENV_CONFIG_QUIET=true
export DOTENV_CONFIG_QUIET
pnpm --silent --filter @shengzhang/api analytics:report -- "$@"
