const path = require('path');
const fs = require('fs');
const { withAndroidManifest, withProjectBuildGradle } = require('@expo/config-plugins');

function copyWidgetFiles(projectRoot) {
  const srcDir = path.join(projectRoot, 'widget-native');
  const androidDir = path.join(projectRoot, 'android');

  // If android dir doesn't exist yet (prebuild hasn't run), skip
  if (!fs.existsSync(androidDir)) return;

  const pkgDir = path.join(androidDir, 'app', 'src', 'main', 'java', 'com', 'taskbattles', 'widget');
  const resLayoutDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'layout');
  const resXmlDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'xml');

  fs.mkdirSync(pkgDir, { recursive: true });
  fs.mkdirSync(resLayoutDir, { recursive: true });
  fs.mkdirSync(resXmlDir, { recursive: true });

  // Copy Kotlin provider
  const ktSrc = path.join(srcDir, 'TaskWidgetProvider.kt');
  const ktDst = path.join(pkgDir, 'TaskWidgetProvider.kt');
  if (fs.existsSync(ktSrc)) {
    fs.copyFileSync(ktSrc, ktDst);
  }

  // Copy layout
  const layoutSrc = path.join(srcDir, 'widget_tasks.xml');
  const layoutDst = path.join(resLayoutDir, 'widget_tasks.xml');
  if (fs.existsSync(layoutSrc)) {
    fs.copyFileSync(layoutSrc, layoutDst);
  }

  // Create widget metadata
  const widgetInfo = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_tasks"
    android:previewImage="@mipmap/ic_launcher"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />`;
  fs.writeFileSync(path.join(resXmlDir, 'widget_info.xml'), widgetInfo);
}

function withAndroidWidget(config) {
  // After prebuild runs and android/ exists, copy files
  const projectRoot = config.modRequest?.projectRoot || process.cwd();
  copyWidgetFiles(projectRoot);

  // Modify AndroidManifest to register widget provider
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (application) {
      if (!application.receiver) application.receiver = [];
      
      // Check if already added
      const exists = application.receiver.some(
        (r) => r.$?.['android:name'] === 'com.taskbattles.widget.TaskWidgetProvider'
      );
      
      if (!exists) {
        application.receiver.push({
          $: {
            'android:name': 'com.taskbattles.widget.TaskWidgetProvider',
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
            },
          ],
          metaData: [
            {
              $: {
                'android:name': 'android.appwidget.provider',
                'android:resource': '@xml/widget_info',
              },
            },
          ],
        });
      }
    }
    return config;
  });

  return config;
}

module.exports = withAndroidWidget;
