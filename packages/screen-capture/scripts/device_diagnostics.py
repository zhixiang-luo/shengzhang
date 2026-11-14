"""Read-only, redacted Android diagnostics; never collects screenshots or UI text."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

PACKAGE = "com.shengzhang.ledger"
SERVICE = f"{PACKAGE}/com.shengzhang.screencapture.BillCaptureAccessibilityService"
SOURCES = {
    "com.tencent.mm": "wechat",
    "com.eg.android.AlipayGphone": "alipay",
    PACKAGE: "shengzhang",
    "com.android.systemui": "systemui",
}


def device_states(output):
    return [match[1] for line in output.splitlines()
            if (match := re.match(r"^\S+\s+(device|unauthorized|offline)\b", line))]


def accessibility_windows(output):
    windows = []
    for match in re.finditer(r"AccessibilityWindowInfo\[(.*?)(?=AccessibilityWindowInfo\[|\n|$)", output):
        # Ignore titles before parsing anything; titles may themselves contain
        # text resembling structural fields. Unknown vendor formats stay unknown.
        structural = re.split(r",\s*title=", match[1], maxsplit=1)[0]
        identity = re.search(r"(?:^|,\s*)id=(-?\d+)\b", structural)
        kind = re.search(r"(?:^|,\s*)type=(TYPE_[A-Z_]+)\b", structural)
        if not identity or not kind:
            continue
        def flag(name):
            value = re.search(rf"(?:^|,\s*){name}=(true|false)\b", structural)
            return value[1] == "true" if value else None
        row = {"id": int(identity[1]), "type": kind[1],
               "focused": flag("focused"), "active": flag("active")}
        if row not in windows:
            windows.append(row)
    return windows


def focus_source(output):
    line = next((line for line in output.splitlines() if "mCurrentFocus=" in line), "")
    package = re.search(r"\b([A-Za-z][A-Za-z0-9_.]*)/[A-Za-z0-9_.$]+", line)
    return SOURCES.get(package[1], "other") if package else None


def installed_version(output):
    name = re.search(r"\bversionName=(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9_.-]+)?)\b", output)
    code = re.search(r"\bversionCode=(\d+)\b", output)
    return {"name": name[1], "code": int(code[1])} if name and code else None


def service_enabled(output):
    return SERVICE in output.strip().split(":")


class DiagnosticError(Exception):
    pass


def adb_query(adb, arguments):
    try:
        result = subprocess.run([adb, *arguments], capture_output=True, text=True, timeout=12)
    except (OSError, subprocess.TimeoutExpired):
        raise DiagnosticError("ADB_UNAVAILABLE_OR_TIMEOUT") from None
    if result.returncode:
        # Raw stderr can contain device identifiers. It is intentionally omitted.
        raise DiagnosticError("ADB_QUERY_FAILED")
    return result.stdout


def find_adb():
    candidates = [shutil.which("adb")]
    for name in ["ANDROID_HOME", "ANDROID_SDK_ROOT"]:
        if os.environ.get(name):
            candidates.append(str(Path(os.environ[name]) / "platform-tools/adb"))
    candidates.extend(["/opt/homebrew/share/android-commandlinetools/platform-tools/adb",
                       str(Path.home() / "Library/Android/sdk/platform-tools/adb")])
    return next((path for path in candidates if path and Path(path).is_file()), None)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--adb", default=find_adb(), help="Path to Android SDK adb")
    parser.add_argument("--serial", help="Select one device; its identifier is never included in output")
    parser.add_argument("--seconds", type=int, default=0, help="Observe for 1–60 seconds; default is one snapshot")
    parser.add_argument("--output", type=Path, help="Save redacted JSON lines to a NEW file; never saves raw dumps")
    args = parser.parse_args()
    if not 0 <= args.seconds <= 60:
        parser.error("--seconds must be between 0 and 60")
    output_file = None
    def emit(value):
        line = json.dumps(value, ensure_ascii=False)
        print(line, flush=True)
        if output_file:
            output_file.write(line + "\n")
            output_file.flush()
    try:
        if not args.adb:
            raise DiagnosticError("ADB_NOT_FOUND")
        states = device_states(adb_query(args.adb, ["devices"]))
        if not states:
            emit({"connection": "no_device", "next": "Connect the phone and enable USB debugging."})
            return 2
        if "device" not in states:
            emit({"connection": "unauthorized_or_offline", "next": "Unlock the phone and accept USB debugging authorization."})
            return 2
        if len(states) != 1 and not args.serial:
            raise DiagnosticError("MULTIPLE_DEVICES_SELECT_SERIAL")
        prefix = ["-s", args.serial] if args.serial else []
        def query(*command):
            return adb_query(args.adb, [*prefix, "shell", *command])
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            output_file = args.output.open("x", encoding="utf-8")
        # Read only named build properties, our package and system metadata.
        emit({"connection": "device", "androidApi": query("getprop", "ro.build.version.sdk").strip(),
              "app": installed_version(query("dumpsys", "package", PACKAGE)),
              "accessibilitySettingEnabled": service_enabled(query("settings", "get", "secure", "enabled_accessibility_services")),
              "note": "Setting enabled does not prove the service is connected. OS windows do not prove what the app received."})
        started = time.monotonic()
        while True:
            accessibility = query("dumpsys", "accessibility")
            focus = query("dumpsys", "window", "displays")
            emit({"elapsedSeconds": round(time.monotonic() - started, 1),
                  "systemFocusSource": focus_source(focus),
                  "serviceMentionedInSystemDump": "com.shengzhang.screencapture.BillCaptureAccessibilityService" in accessibility,
                  "accessibilityWindows": accessibility_windows(accessibility)})
            if not args.seconds or time.monotonic() - started >= args.seconds:
                break
            time.sleep(0.5)
        return 0
    except DiagnosticError as error:
        emit({"error": str(error)})
        return 2
    except OSError:
        emit({"error": "OUTPUT_FILE_UNAVAILABLE_OR_ALREADY_EXISTS"})
        return 2
    finally:
        if output_file:
            output_file.close()


if __name__ == "__main__":
    raise SystemExit(main())
