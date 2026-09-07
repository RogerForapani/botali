const baseConfig = require("./app.json");

module.exports = () => ({
  ...baseConfig.expo,
  android: {
    ...baseConfig.expo.android,
    config: {
      ...baseConfig.expo.android.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? "",
      },
    },
  },
});
