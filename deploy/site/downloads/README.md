# Android 下载目录

该目录在服务器上保存公开发布的内测 APK，但 APK 不提交到 Git。

当前稳定下载路径：

```text
/downloads/shengzhang-android-preview.apk
```

当前线上版本为 `0.2.0 (17)`，本地发布文件来自：

```text
dist/releases/shengzhang-0.2.0-preview.apk
```

发布新构建时，先把签名后的 APK 上传到同目录临时文件，核对文件大小和 SHA-256，再将旧稳定包备份到 `/opt/shengzhang/releases/`，最后原子替换稳定路径。GitHub Release Notes 必须记录版本号、文件大小和 SHA-256。
