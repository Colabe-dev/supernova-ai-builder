# S4 — Mobile Sentry + Real IAP Verification Overlay

This overlay wires **Sentry for Expo** and adds **production-capable IAP verification**:
- Google Play: uses `googleapis` Android Publisher v3
- Apple: verifies StoreKit 2 `signedPayload` JWS with Apple JWKS (via `jose`), with optional legacy `verifyReceipt` fallback

## Install (root + server + mobile)
```bash
# Server
npm i googleapis jose undici

# Mobile (inside mobile-expo)
cd mobile-expo
npm i sentry-expo
```

## Wire Sentry (Expo)
1) Create `mobile-expo/app.config.js` (included here). If you currently use `app.json`, switch to `app.config.js`.
2) Import and initialize in your app entry:
```ts
// mobile-expo/src/sentry.ts (auto-initialized if imported once)
import './sentry';
```
3) Set env (GitHub Secrets or EAS Secrets):
```
EXPO_PUBLIC_SENTRY_DSN=your_dsn
EXPO_PUBLIC_SENTRY_ENV=preview
EXPO_PUBLIC_SENTRY_TRACES=0.1
```

## Wire IAP routes (server)
- Replace your existing `/api/iap` imports with:
```js
import iapRoutes from './iap/routes.real.js';
app.use('/api/iap', iapRoutes);
```
- Set env for strict mode:
```
IAP_STRICT=true
GOOGLE_SERVICE_ACCOUNT_KEY='{json}'   # service account JSON
GOOGLE_PACKAGE_NAME=com.collab.supernova
APPLE_BUNDLE_ID=com.collab.supernova
# Optional legacy receipt:
APPLE_SHARED_SECRET=
```

## Security notes
- Store the **Google service account JSON** in GitHub Actions secrets as a single JSON string (`GOOGLE_SERVICE_ACCOUNT_KEY`).
- Never expose `COLLAB_PAY_SECRET` to clients.
