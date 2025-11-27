# Monetization & Checkout Readiness Audit

This file summarizes quick checks of the billing/checkout flow to highlight blockers before enabling revenue in production.

## Current implementation
- **Collab Pay checkout helper** builds sessions against `COLLAB_PAY_API_BASE` with SKUs from `server/billing/products.js`. It requires `COLLAB_PAY_SECRET` and an `APP_URL` (or infers from request) to craft success/cancel URLs and logs failures.【F:server/billing/checkout.js†L9-L75】
- **Product catalog** exposes monthly/yearly Pro plans plus coin packs with entitlement payloads. Feature limits are defined alongside a free-tier baseline and helper functions for limits/feature checks.【F:server/billing/products.js†L6-L60】【F:server/billing/products.js†L68-L87】
- **Billing routes**: `GET /api/billing/pricing` returns the normalized pricing data; `POST /api/billing/checkout` creates a session and forwards referral codes; `GET /api/billing/entitlements/:profileId` aggregates subscriptions/coins and returns computed feature limits.【F:server/routes/billing.js†L1-L80】
- **Pricing page (client)** fetches `/api/billing/pricing`, but uses a hardcoded `profileId: 'demo_user'` when creating checkout sessions (marked TODO), so no authentication context is wired yet.【F:client/src/pages/pricing.tsx†L20-L87】

## Gaps that block monetization
1. **Unauthenticated checkout payloads** — The client can supply any `profileId` string to `/api/billing/checkout`, which means entitlements may be granted to the wrong account or rejected server-side. There is no session/auth verification at the route level.【F:server/routes/billing.js†L21-L44】【F:client/src/pages/pricing.tsx†L46-L69】
2. **Missing real user identity in the UI** — The pricing page always posts `profileId: 'demo_user'`, so paid sessions cannot be tied to the signed-in customer. This effectively breaks purchase attribution and refunds/entitlements downstream.【F:client/src/pages/pricing.tsx†L46-L69】
3. **Environment prerequisites are brittle** — `APP_URL` is mandatory for checkout URL generation; without it, the API throws. There is no runtime health check or onboarding guidance to ensure `COLLAB_PAY_SECRET`/SKU env vars are set for each environment.【F:server/billing/checkout.js†L31-L47】
4. **No enforcement hooks on entitlements** — Feature gates rely on consumer code calling `getLimits/hasFeature`, but there is no middleware ensuring Pro-only features or rate limits are respected server-side. That risks overuse without billing conversion.【F:server/billing/products.js†L68-L87】

## Recommendations to enable revenue quickly
- **Wire authentication into checkout**: Require a server-side authenticated user (session/JWT) for `/api/billing/checkout`, derive `profileId` on the server, and refuse client-supplied IDs. Add CSRF protection if the session is cookie-based.【F:server/routes/billing.js†L21-L44】
- **Fix the pricing page checkout call**: Pull the authenticated profile ID from the existing auth context/store instead of the `'demo_user'` placeholder, and surface an error banner if the user is not logged in.【F:client/src/pages/pricing.tsx†L46-L69】
- **Add operational guardrails**: Introduce a startup check that validates `APP_URL`, `COLLAB_PAY_SECRET`, and the required SKUs, returning a clear 500 with guidance if missing. Consider exposing `/api/billing/health` so ops can verify configuration before launches.【F:server/billing/checkout.js†L31-L47】
- **Enforce entitlements on protected routes**: Create middleware that maps the authenticated user to plan limits and applies them on AI minutes/build limits, rather than relying on the caller to consult `getLimits` manually. This prevents free users from hitting Pro-only endpoints and keeps costs bounded.【F:server/billing/products.js†L68-L87】
- **Instrument checkout outcomes**: Add event logging/analytics for session creation success/failure, cancellations, and fulfillment to identify drop-off points. The logger is already available in `checkout.js`; emit structured metrics to your monitoring stack.【F:server/billing/checkout.js†L15-L75】

Implementing the above will move the app toward a reliable, production-ready billing funnel with clearer attribution and fewer support risks.
