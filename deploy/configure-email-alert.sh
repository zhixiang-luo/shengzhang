#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
deploy_key="${SHENGZHANG_DEPLOY_KEY:-${repo_root}/.deploy/shengzhang_deploy_ed25519}"
remote_host="${SHENGZHANG_DEPLOY_HOST:-shengzhang@8.152.201.57}"
default_recipient="$(git -C "$repo_root" config user.email 2>/dev/null || true)"
smtp_host="${ALERT_SMTP_HOST:-smtp.gmail.com}"
smtp_port="${ALERT_SMTP_PORT:-465}"
smtp_security="${ALERT_SMTP_SECURITY:-ssl}"

printf '配置声账邮件告警。密码输入时不会显示。\n\n'
read -r -p "接收告警的邮箱 [${default_recipient}]: " recipient
recipient="${recipient:-$default_recipient}"
read -r -p "SMTP 登录邮箱 [${recipient}]: " smtp_user
smtp_user="${smtp_user:-$recipient}"
read -r -s -p "SMTP App Password: " smtp_password
printf '\n'

if [ -z "$recipient" ] || [ -z "$smtp_user" ] || [ -z "$smtp_password" ]; then
  printf '接收邮箱、SMTP 登录邮箱和 App Password 都不能为空。\n' >&2
  exit 1
fi

env_tmp="$(mktemp)"
chmod 600 "$env_tmp"
trap 'rm -f "$env_tmp"' EXIT
{
  printf 'ALERT_EMAIL_TO=%q\n' "$recipient"
  printf 'ALERT_EMAIL_FROM=%q\n' "$smtp_user"
  printf 'ALERT_SMTP_HOST=%q\n' "$smtp_host"
  printf 'ALERT_SMTP_PORT=%q\n' "$smtp_port"
  printf 'ALERT_SMTP_USER=%q\n' "$smtp_user"
  printf 'ALERT_SMTP_PASSWORD=%q\n' "$smtp_password"
  printf 'ALERT_SMTP_SECURITY=%q\n' "$smtp_security"
} > "$env_tmp"

scp -q -i "$deploy_key" "$env_tmp" "${remote_host}:/opt/shengzhang/ops/alerts.env.new"
ssh -i "$deploy_key" -o BatchMode=yes "$remote_host" '
  umask 077
  chmod 600 /opt/shengzhang/ops/alerts.env.new
  mv /opt/shengzhang/ops/alerts.env.new /opt/shengzhang/ops/alerts.env
  set -a
  . /opt/shengzhang/ops/alerts.env
  set +a
  printf "这是一封声账邮件告警测试。收到后，紧急监控邮件通道即已生效。\n" \
    | python3 /opt/shengzhang/ops/send-alert-email.py "邮件告警测试"
'

github_secret_state="未配置"
if command -v gh >/dev/null 2>&1 && gh auth status --hostname github.com >/dev/null 2>&1; then
  if repo_slug="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)" && [ -n "$repo_slug" ]; then
    github_secret_state="已配置"
    for secret_name in \
      ALERT_EMAIL_TO \
      ALERT_EMAIL_FROM \
      ALERT_SMTP_HOST \
      ALERT_SMTP_PORT \
      ALERT_SMTP_USER \
      ALERT_SMTP_PASSWORD \
      ALERT_SMTP_SECURITY; do
      case "$secret_name" in
        ALERT_EMAIL_TO) secret_value="$recipient" ;;
        ALERT_EMAIL_FROM) secret_value="$smtp_user" ;;
        ALERT_SMTP_HOST) secret_value="$smtp_host" ;;
        ALERT_SMTP_PORT) secret_value="$smtp_port" ;;
        ALERT_SMTP_USER) secret_value="$smtp_user" ;;
        ALERT_SMTP_PASSWORD) secret_value="$smtp_password" ;;
        ALERT_SMTP_SECURITY) secret_value="$smtp_security" ;;
      esac
      if ! printf '%s' "$secret_value" \
        | gh secret set "$secret_name" --repo "$repo_slug" >/dev/null; then
        github_secret_state="部分失败"
        break
      fi
    done
  fi
fi

keychain_state="未配置"
email_alert_helper="${CODEX_HOME:-$HOME/.codex}/skills/email-alert/scripts/email_alert.py"
if [ -f "$email_alert_helper" ]; then
  if printf '%s' "$smtp_password" \
    | python3 "$email_alert_helper" configure \
        --auth-stdin \
        --to "$recipient" \
        --smtp-user "$smtp_user" \
        --smtp-host "$smtp_host" \
        --smtp-port "$smtp_port" \
        --smtp-security "$smtp_security" >/dev/null; then
    keychain_state="已配置"
  fi
fi

printf '服务器邮件告警已配置，测试邮件已发送到 %s。\n' "$recipient"
printf 'GitHub Actions 外部看门狗邮件凭据：%s。\n' "$github_secret_state"
printf '其他 Codex 项目的 macOS 钥匙串邮件凭据：%s。\n' "$keychain_state"
if [ "$github_secret_state" != "已配置" ]; then
  printf '如需让 GitHub 在整台 ECS 失联时也能发邮件，请先确保 gh 已登录且仓库有 Secrets 写权限，然后重新运行本脚本。\n' >&2
fi
if [ "$keychain_state" != "已配置" ]; then
  printf 'macOS 钥匙串未配置；可在终端运行全局 email-alert 技能的 configure 命令后重试。\n' >&2
fi
