const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Drizzle göçleri .sql dosyası olarak içe aktarılıyor.
config.resolver.sourceExts.push('sql');

module.exports = config;
