const localAndroidPackage = process.env.SHENGZHANG_LOCAL_ANDROID_PACKAGE?.trim();

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(localAndroidPackage ? { package: localAndroidPackage } : {}),
  },
});
