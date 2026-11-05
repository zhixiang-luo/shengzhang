#!/usr/bin/env python3
"""Send one plain-text alert email using SMTP settings from the environment."""

from __future__ import annotations

import os
import smtplib
import ssl
import sys
from email.message import EmailMessage
from email.utils import parseaddr


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"missing {name}")
    return value


def main() -> int:
    try:
        recipient_raw = required("ALERT_EMAIL_TO")
        recipients = [
            address
            for _, address in (parseaddr(item.strip()) for item in recipient_raw.split(","))
            if address
        ]
        if not recipients:
            raise ValueError("ALERT_EMAIL_TO contains no valid address")

        smtp_host = required("ALERT_SMTP_HOST")
        smtp_port = int(os.environ.get("ALERT_SMTP_PORT", "465"))
        smtp_user = required("ALERT_SMTP_USER")
        smtp_password = required("ALERT_SMTP_PASSWORD")
        sender = os.environ.get("ALERT_EMAIL_FROM", smtp_user).strip() or smtp_user
        security = os.environ.get(
            "ALERT_SMTP_SECURITY",
            "ssl" if smtp_port == 465 else "starttls",
        ).strip().lower()
    except (ValueError, TypeError) as error:
        print(f"email configuration unavailable: {error}", file=sys.stderr)
        return 2

    subject = sys.argv[1] if len(sys.argv) > 1 else "声账运维告警"
    subject = subject.replace("\r", " ").replace("\n", " ").strip()[:180]
    body = sys.stdin.read()
    if not body.strip():
        body = "声账监控发现问题，请登录服务器检查。\n"

    message = EmailMessage()
    message["Subject"] = f"[声账] {subject}"
    message["From"] = sender
    message["To"] = ", ".join(recipients)
    message.set_content(body)

    context = ssl.create_default_context()
    timeout = 15
    try:
        if security == "ssl":
            with smtplib.SMTP_SSL(
                smtp_host,
                smtp_port,
                timeout=timeout,
                context=context,
            ) as smtp:
                smtp.login(smtp_user, smtp_password)
                smtp.send_message(message)
        elif security == "starttls":
            with smtplib.SMTP(smtp_host, smtp_port, timeout=timeout) as smtp:
                smtp.ehlo()
                smtp.starttls(context=context)
                smtp.ehlo()
                smtp.login(smtp_user, smtp_password)
                smtp.send_message(message)
        else:
            raise ValueError("ALERT_SMTP_SECURITY must be ssl or starttls")
    except (OSError, smtplib.SMTPException, ValueError) as error:
        print(f"email delivery failed: {error}", file=sys.stderr)
        return 1

    print(f"email sent to {len(recipients)} recipient(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
