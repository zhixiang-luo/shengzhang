#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg nginx rsync ufw

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(\".\")[0]')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

corepack enable
corepack prepare pnpm@11.25.0 --activate

if ! id shengzhang >/dev/null 2>&1; then
  useradd --create-home --home-dir /opt/shengzhang --shell /bin/bash shengzhang
fi

install -d -m 0755 /opt/shengzhang/releases /opt/shengzhang/site
install -d -m 0700 -o shengzhang -g shengzhang /opt/shengzhang/.ssh
install -m 0600 -o shengzhang -g shengzhang \
  /opt/shengzhang-bootstrap/shengzhang-deploy.pub \
  /opt/shengzhang/.ssh/authorized_keys

install -m 0644 \
  /opt/shengzhang-bootstrap/shengzhang-test.conf \
  /etc/nginx/sites-available/shengzhang-test
ln -sfn /etc/nginx/sites-available/shengzhang-test /etc/nginx/sites-enabled/shengzhang-test
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx

install -m 0644 \
  /opt/shengzhang-bootstrap/shengzhang-api.service \
  /etc/systemd/system/shengzhang-api.service
systemctl daemon-reload

ufw allow 22/tcp
ufw allow 8080/tcp
ufw allow 8787/tcp
ufw --force enable

chown -R shengzhang:shengzhang /opt/shengzhang

echo "Bootstrap complete."
