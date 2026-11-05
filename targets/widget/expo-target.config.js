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
  colors: {
    $accent: { color: '#C9821B', darkColor: '#E0A040' },
    $widgetBackground: { color: '#F2EEE5', darkColor: '#15171A' },
    paper: { color: '#F2EEE5', darkColor: '#15171A' },
    card: { color: '#FBF9F4', darkColor: '#1E2125' },
    ink: { color: '#23262B', darkColor: '#ECE7DD' },
    muted: { color: '#6E6A62', darkColor: '#9C978D' },
    line: { color: '#DDD6C8', darkColor: '#2F3338' },
    amber: { color: '#C9821B', darkColor: '#E0A040' },
    rust: { color: '#A6452E', darkColor: '#D9785F' },
  },
});
