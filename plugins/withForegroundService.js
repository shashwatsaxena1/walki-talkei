const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withForegroundService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return config;

    application.service = application.service || [];

    const addService = (name, type) => {
      const exists = application.service.some(
        (service) => service.$?.['android:name'] === name
      );
      if (!exists) {
        application.service.push({
          $: {
            'android:name': name,
            ...(type ? { 'android:foregroundServiceType': type } : {}),
            'android:exported': 'false',
          },
        });
      }
    };

    // LiveKit's current React Native example uses this foreground service
    // package to keep an active microphone/audio room alive in Android background.
    addService(
      'com.supersami.foregroundservice.ForegroundService',
      'microphone|mediaPlayback'
    );
    addService('com.supersami.foregroundservice.ForegroundServiceTask');

    return config;
  });
};
