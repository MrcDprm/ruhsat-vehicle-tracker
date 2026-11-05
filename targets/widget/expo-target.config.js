// Ana ekran widget'ı (docs/plan.md "Ana ekran widget'ı"). @bacons/apple-targets bu klasörden bir iOS widget hedefi
// üretir; Mac olmadığı için EAS'ta derlenir. Veri uygulamanın yazdığı App Group'tan okunur (src/features/widget).
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'RuhsatWidget',
  displayName: 'Ruhsat',
  bundleIdentifier: '.widget',
  // containerBackground ve modern WidgetKit API'leri için.
  deploymentTarget: '17.0',
  // Uygulamanın App Group'u: uygulama yazar, widget okur.
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
  // Kimlik renkleri (src/theme/colors.ts); açık ve koyu temaya göre iOS seçer.
  // Anahtarlar light/dark olmalı: eklenti belgesindeki color/darkColor örneği yanlış, öyle yazılınca renkler boş üretilir.
  colors: {
    $accent: { light: '#C9821B', dark: '#E0A040' },
    $widgetBackground: { light: '#F2EEE5', dark: '#15171A' },
    paper: { light: '#F2EEE5', dark: '#15171A' },
    card: { light: '#FBF9F4', dark: '#1E2125' },
    ink: { light: '#23262B', dark: '#ECE7DD' },
    muted: { light: '#6E6A62', dark: '#9C978D' },
    line: { light: '#DDD6C8', dark: '#2F3338' },
    amber: { light: '#C9821B', dark: '#E0A040' },
    rust: { light: '#A6452E', dark: '#D9785F' },
  },
});
