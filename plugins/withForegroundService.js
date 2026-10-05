const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withForegroundService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return config;
    application.service = application.service || [];
    const exists = application.service.some(
      (service) => service.$?.['android:name'] === 'com.supersami.foregroundservice.ForegroundService'
    );
    if (!exists) {
      application.service.push({
        $: {
          'android:name': 'com.supersami.foregroundservice.ForegroundService',
          'android:foregroundServiceType': 'microphone|mediaPlayback',
          'android:exported': 'false',
        },
      });
    }
    return config;
  });
};
