const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
  withAppBuildGradle,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
module.exports = (config) => {
  config = withAndroidManifest(config, (result) => {
    const app = result.modResults.manifest.application[0];
    app.$["android:allowBackup"] = "false";
    app.service = (app.service || []).filter(
      (s) => s.$["android:name"] !== ".updates.BankNotificationListener",
    );
    app.service.push({
      $: {
        "android:name": ".updates.BankNotificationListener",
        "android:label": "Gastos do Floco",
        "android:permission":
          "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name":
                  "android.service.notification.NotificationListenerService",
              },
            },
          ],
        },
      ],
    });
    app.provider = (app.provider || []).filter(
      (p) => p.$["android:authorities"] !== "${applicationId}.updates",
    );
    app.provider.push({
      $: {
        "android:name": "androidx.core.content.FileProvider",
        "android:authorities": "${applicationId}.updates",
        "android:exported": "false",
        "android:grantUriPermissions": "true",
      },
      "meta-data": [
        {
          $: {
            "android:name": "android.support.FILE_PROVIDER_PATHS",
            "android:resource": "@xml/floco_update_paths",
          },
        },
      ],
    });
    return result;
  });
  config = withMainApplication(config, (result) => {
    if (!result.modResults.contents.includes("FlocoUpdaterPackage()"))
      result.modResults.contents = result.modResults.contents.replace(
        "PackageList(this).packages.apply {",
        "PackageList(this).packages.apply {\n          add(br.com.kat.flocofinancas.updates.FlocoUpdaterPackage())",
      );
    return result;
  });
  config = withAppBuildGradle(config, (result) => {
    if (
      !result.modResults.contents.includes("com.google.mlkit:text-recognition")
    )
      result.modResults.contents +=
        "\ndependencies { implementation 'com.google.mlkit:text-recognition:16.0.1' }\n";
    if (!result.modResults.contents.includes("FLOCO_KEYSTORE_FILE")) {
      result.modResults.contents = result.modResults.contents.replace(
        "signingConfigs {",
        `signingConfigs {\n        floco {\n            storeFile file(System.getenv('FLOCO_KEYSTORE_FILE') ?: '../../.signing/floco-release.keystore')\n            storePassword System.getenv('FLOCO_KEYSTORE_PASSWORD') ?: ''\n            keyAlias 'floco'\n            keyPassword System.getenv('FLOCO_KEYSTORE_PASSWORD') ?: ''\n        }`,
      );
      result.modResults.contents = result.modResults.contents.replace(
        /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
        "$1signingConfig signingConfigs.floco",
      );
    }
    return result;
  });
  return withDangerousMod(config, [
    "android",
    async (result) => {
      const root = result.modRequest.projectRoot;
      const android = result.modRequest.platformProjectRoot;
      const destination = path.join(
        android,
        "app/src/main/java/br/com/kat/flocofinancas/updates",
      );
      fs.mkdirSync(destination, { recursive: true });
      for (const file of [
        "FlocoUpdaterModule.kt",
        "FlocoUpdaterPackage.kt",
        "BankNotifications.kt",
        "ReceiptReader.kt",
        "FinanceToolsModule.kt",
      ])
        fs.copyFileSync(
          path.join(root, "native/updates", file),
          path.join(destination, file),
        );
      const xml = path.join(android, "app/src/main/res/xml");
      fs.mkdirSync(xml, { recursive: true });
      fs.writeFileSync(
        path.join(xml, "floco_update_paths.xml"),
        '<?xml version="1.0" encoding="utf-8"?><paths xmlns:android="http://schemas.android.com/apk/res/android"><cache-path name="updates" path="updates/"/></paths>',
      );
      return result;
    },
  ]);
};
