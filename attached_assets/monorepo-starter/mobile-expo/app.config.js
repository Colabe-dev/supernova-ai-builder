export default ({ config }) => ({
  expo: {
    name: "Supernova",
    slug: "supernova",
    scheme: "supernova",
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#0b1f3a" },
    ios: { supportsTablet: true, bundleIdentifier: "com.collab.supernova" },
    android: { adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#0b1f3a" }, package: "com.collab.supernova" },
    web: { bundler: "metro" },
    updates: { url: "https://u.expo.dev/PROJECT_ID" },
    runtimeVersion: { policy: "appVersion" },
    extra: {
      expoPublic: {
        API_BASE: process.env.EXPO_PUBLIC_API_BASE || "http://localhost:3001"
      }
    }
  }
});
