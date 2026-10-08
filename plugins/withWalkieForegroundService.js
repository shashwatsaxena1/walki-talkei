const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const SERVICE = 'com.supersami.foregroundservice.ForegroundService';
const TASK_SERVICE = 'com.supersami.foregroundservice.ForegroundServiceTask';

function ensurePermission(manifest, permission) {
  manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
  const exists = manifest.manifest['uses-permission'].some(
    item => item?.$?.['android:name'] === permission
  );
  if (!exists) manifest.manifest['uses-permission'].push({ $: { 'android:name': permission } });
}

function ensureService(application, name, type) {
  application.service = application.service || [];
  const existing = application.service.find(item => item?.$?.['android:name'] === name);
  const attrs = {
    'android:name': name,
    'android:exported': 'false',
  };
  if (type) attrs['android:foregroundServiceType'] = type;
  if (existing) existing.$ = { ...existing.$, ...attrs };
  else application.service.push({ $: attrs });
}

module.exports = function withWalkieForegroundService(config) {
  return withAndroidManifest(config, configMod => {
    const manifest = configMod.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return configMod;

    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE');
    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE_MICROPHONE');
    ensurePermission(manifest, 'android.permission.POST_NOTIFICATIONS');
    ensurePermission(manifest, 'android.permission.RECORD_AUDIO');

    ensureService(application, SERVICE, 'microphone');
    ensureService(application, TASK_SERVICE);

    application['meta-data'] = application['meta-data'] || [];
    const addMeta = (name, value) => {
      const found = application['meta-data'].find(item => item?.$?.['android:name'] === name);
      const attrs = { 'android:name': name, 'android:value': value };
      if (found) found.$ = { ...found.$, ...attrs };
      else application['meta-data'].push({ $: attrs });
    };
    addMeta('com.supersami.foregroundservice.notification_channel_name', 'Walkie Talkie Voice');
    addMeta('com.supersami.foregroundservice.notification_channel_description', 'Keeps your active Walkie Talkie voice room connected.');

    return configMod;
  });
};
