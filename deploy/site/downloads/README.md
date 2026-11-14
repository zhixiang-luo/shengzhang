# Android 下载目录

该目录只在服务器上保留旧版兼容下载，APK 不提交到 Git。

当前正式下载入口使用服务器直连（OSS 凭据不在本机/服务器时使用）：

```text
https://bigai.xin/shengzhang/downloads/shengzhang-0.3.3-preview.apk?download=latest&version=0.3.3
```

网站与 App 更新接口应引用同一个版本化路径。旧的
`https://download.bigai.xin/releases/shengzhang-0.2.1-preview.apk` 仍指向 0.2.1，
在 OSS/CDN 凭据恢复前不再更新；服务器旧路径
`/downloads/shengzhang-android-preview.apk` 只作为过渡兼容。

当前线上版本为 `0.3.3 (41)`，文件来自：

```text
apps/mobile/build-production-pig-round.apk
```

发布新构建时，先把签名后的 APK 上传为
服务器 `/opt/shengzhang/site/downloads/shengzhang-<version>-preview.apk`，核对响应的大小与 SHA-256，
再更新网站、服务端更新策略和 GitHub Release。GitHub Release Notes 必须记录版本号、
文件大小和 SHA-256。
