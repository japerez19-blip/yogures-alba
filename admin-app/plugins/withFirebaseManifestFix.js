const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin para resolver el conflicto de Manifest Merger entre
 * expo-notifications y @react-native-firebase/messaging inyectando tools:replace="android:resource"
 */
const withFirebaseManifestFix = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // 1. Asegurar que el namespace xmlns:tools esté declarado en la raíz
    if (!androidManifest.$) {
      androidManifest.$ = {};
    }
    androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // 2. Buscar la etiqueta <application>
    if (!androidManifest.application || !androidManifest.application[0]) {
      return config;
    }
    const app = androidManifest.application[0];

    if (!app['meta-data']) {
      app['meta-data'] = [];
    }

    // 3. Buscar si ya existe el meta-data de default_notification_color
    const colorMeta = app['meta-data'].find(
      (item) =>
        item.$ &&
        item.$['android:name'] ===
          'com.google.firebase.messaging.default_notification_color'
    );

    if (colorMeta) {
      colorMeta.$['tools:replace'] = 'android:resource';
    } else {
      app['meta-data'].push({
        $: {
          'android:name':
            'com.google.firebase.messaging.default_notification_color',
          'android:resource': '@color/notification_icon_color',
          'tools:replace': 'android:resource',
        },
      });
    }

    return config;
  });
};

module.exports = withFirebaseManifestFix;
