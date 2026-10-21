const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withCleartextApi(config) {
  if (process.env.ALLOW_CLEARTEXT_API !== '1') return config;

  return withAndroidManifest(config, (manifestConfig) => {
    const application = manifestConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return manifestConfig;
  });
};
