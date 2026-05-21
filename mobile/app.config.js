/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === 'production';
const prodApi = String(process.env.EXPO_PUBLIC_API_URL_PRODUCTION || '');
const allowHttpApi = prodApi.startsWith('http://');

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [...(appJson.expo.plugins || []), 'expo-secure-store'],
    android: {
      ...appJson.expo.android,
      // Standalone release: allow HTTP when API URL is http (e.g. VPS IP). Use HTTPS in prod when possible.
      usesCleartextTraffic: !isProduction || allowHttpApi,
    },
  },
};
