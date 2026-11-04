module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Drizzle göç dosyaları (.sql) uygulamaya metin olarak gömülür.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
