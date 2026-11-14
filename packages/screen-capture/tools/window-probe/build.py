#!/usr/bin/env python3
"""Build the disposable metadata-only Android probe without modifying the app."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parent


def run(*command: str, cwd: Path | None = None) -> None:
    subprocess.run(command, cwd=cwd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--android-home", default=os.environ.get("ANDROID_HOME",
        "/opt/homebrew/share/android-commandlinetools"))
    parser.add_argument("--java-home", default=os.environ.get("JAVA_HOME",
        "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"))
    parser.add_argument("--output", type=Path, default=Path("/private/tmp/shengzhang-window-probe.apk"))
    args = parser.parse_args()

    android_home = Path(args.android_home)
    java_home = Path(args.java_home)
    os.environ["JAVA_HOME"] = str(java_home)
    os.environ["PATH"] = f"{java_home / 'bin'}{os.pathsep}{os.environ.get('PATH', '')}"
    build_tools = max((android_home / "build-tools").iterdir())
    android_jar = android_home / "platforms/android-36/android.jar"
    for path in (build_tools / "aapt2", build_tools / "d8", build_tools / "zipalign",
                 build_tools / "apksigner", java_home / "bin/javac", java_home / "bin/keytool",
                 android_jar):
        if not path.exists():
            raise SystemExit(f"missing tool: {path}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="shengzhang-window-probe.") as directory:
        work = Path(directory)
        (work / "classes").mkdir()
        (work / "dex").mkdir()
        run(str(build_tools / "aapt2"), "compile", "--dir", str(ROOT / "res"),
            "-o", str(work / "resources.zip"))
        run(str(build_tools / "aapt2"), "link", "-o", str(work / "base.apk"),
            "-I", str(android_jar), "--manifest", str(ROOT / "AndroidManifest.xml"),
            str(work / "resources.zip"), "--auto-add-overlay")
        sources = sorted(str(path) for path in (ROOT / "src").glob("*.java"))
        run(str(java_home / "bin/javac"), "-encoding", "UTF-8", "-source", "8", "-target", "8",
            "-classpath", str(android_jar), "-d", str(work / "classes"), *sources)
        run(str(build_tools / "d8"), "--lib", str(android_jar), "--min-api", "30",
            "--output", str(work / "dex"), *sorted(str(path) for path in (work / "classes").glob("**/*.class")))
        shutil.copy2(work / "base.apk", work / "unsigned.apk")
        run("zip", "-j", str(work / "unsigned.apk"), str(work / "dex/classes.dex"), cwd=work)
        run(str(build_tools / "zipalign"), "-f", "4", str(work / "unsigned.apk"),
            str(work / "aligned.apk"))

        keystore = Path("/private/tmp/shengzhang-window-probe-debug.keystore")
        if not keystore.exists():
            run(str(java_home / "bin/keytool"), "-genkeypair", "-keystore", str(keystore),
                "-storepass", "android", "-keypass", "android", "-alias", "androiddebugkey",
                "-keyalg", "RSA", "-keysize", "2048", "-validity", "3650",
                "-dname", "CN=Android Debug,O=Android,C=US")
        run(str(build_tools / "apksigner"), "sign", "--ks", str(keystore),
            "--ks-pass", "pass:android", "--key-pass", "pass:android",
            "--out", str(args.output), str(work / "aligned.apk"))
        run(str(build_tools / "apksigner"), "verify", "--print-certs", str(args.output))
    print(args.output)


if __name__ == "__main__":
    main()
