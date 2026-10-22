# Android 下载目录

该目录在服务器上保存公开发布的内测 APK，但 APK 不提交到 Git。

当前稳定下载路径：

```text
/downloads/shengzhang-android-preview.apk
```

当前线上版本为 `0.1.3`，本地发布文件来自：

```text
dist/releases/shengzhang-0.1.3-preview.apk
```

发布新构建时，使用 `rsync` 或 `scp` 将签名后的 APK 覆盖到服务器该路径，并在 GitHub Release Notes 中记录版本号、文件大小和 SHA-256。
