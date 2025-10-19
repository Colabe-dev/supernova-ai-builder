import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';

const dsn = Constants.expoConfig?.extra?.expoPublic?.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;
const env = Constants.expoConfig?.extra?.expoPublic?.SENTRY_ENV || process.env.EXPO_PUBLIC_SENTRY_ENV || 'development';
const traces = Number(Constants.expoConfig?.extra?.expoPublic?.SENTRY_TRACES || process.env.EXPO_PUBLIC_SENTRY_TRACES || 0.1);

if (dsn) {
  Sentry.init({
    dsn,
    enableInExpoDevelopment: true,
    debug: false,
    tracesSampleRate: traces,
    enableNative: true
  });
  Sentry.Native.setTag('environment', env);
}
