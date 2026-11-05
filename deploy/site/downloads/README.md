# Android 下载目录

该目录只在服务器上保留旧版兼容下载，APK 不提交到 Git。

正式下载入口已经迁到阿里云 OSS + CDN：

```text
https://download.bigai.xin/releases/shengzhang-0.2.0-preview.apk?download=latest&version=0.2.0
```

网站与 App 更新接口只应引用 CDN 路径。服务器旧路径
`/downloads/shengzhang-android-preview.apk` 只作为过渡兼容，不再作为稳定分发入口。

当前线上版本为 `0.2.0 (17)`，版本化 OSS 对象来自：

```text
dist/releases/shengzhang-0.2.0-preview.apk
```

发布新构建时，先把签名后的 APK 上传为
`releases/shengzhang-<version>-preview.apk`，核对 OSS/CDN 响应的文件大小与 SHA-256，
再更新网站、服务端更新策略和 GitHub Release。GitHub Release Notes 必须记录版本号、
文件大小和 SHA-256。
