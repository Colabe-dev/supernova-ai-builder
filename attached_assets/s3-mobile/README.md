# Sprint 3 — Mobile Base + EAS CI (Expo)

This overlay gives you a ready **mobile-expo/** app plus **EAS CI workflows**.

## What’s included
- mobile-expo/ (Expo SDK 51 minimal app)
- eas.json (build profiles)
- .github/workflows/
  - eas-build-mobile.yml (CI builds for Android/iOS, preview profile)
  - eas-update-ota.yml (CI OTA updates to preview on push to main)
  - eas-submit-store.yml (manual submit to stores)
- scripts/version-bump.mjs (bumps app.json version)
- tools/store-meta.mjs + store templates (optional store listing generator)

## Setup
```bash
npm i -D eas-cli
npx eas login
cd mobile-expo && npx eas init    # sets updates.url
```

## GitHub Secrets (Settings → Secrets → Actions)
- EAS_TOKEN (from `npx eas token:create`)
- (optional for submit) GOOGLE_SERVICE_ACCOUNT_KEY, APP_STORE_CONNECT_API_*

## Local commands
```bash
# Preview builds
cd mobile-expo
npx eas build -p android --profile preview
npx eas build -p ios --profile preview

# OTA to preview
npx eas update --branch preview --message "feat: preview"

# Bump version
node ../scripts/version-bump.mjs patch
```
