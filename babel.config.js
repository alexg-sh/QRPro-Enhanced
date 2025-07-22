module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Performance optimizations
      ['react-native-reanimated/plugin', {
        globals: ['__scanCodes']
      }],
      // Remove console logs in production
      process.env.NODE_ENV === 'production' && ['transform-remove-console'],
    ].filter(Boolean),
  };
};
