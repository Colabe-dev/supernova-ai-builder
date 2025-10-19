# S4 — mTLS Signing (Internal Services)

Turn on **mutual TLS** for internal service-to-service calls, and add a request-signature middleware for zero-trust networks.

## What you get
- `server/mtls/server.js` — create HTTPS server that **requires client cert** and validates against your CA.
- `server/mtls/middleware.js` — Express middleware to enforce mTLS on specific routes.
- `tools/gencerts.sh` — script to generate a dev CA, server cert, and client cert.
- `server/mtls/signature.js` — HMAC request-signature utilities for proxies where mTLS termination happens elsewhere.

## Env
```
TLS_CA=certs/ca.pem
TLS_KEY=certs/server.key
TLS_CERT=certs/server.pem
```

## Use (standalone HTTPS)
```js
// server/index.mtls.js
import express from 'express';
import { createSecureServer } from './mtls/server.js';
const app = express();
// ...routes
const srv = createSecureServer(app);  // requires client certs
srv.listen(3001);
```

## Use (middleware only)
```js
// server/index.js (behind terminating proxy, but checking certs forwarded)
import { requireMutualTLS } from './mtls/middleware.js';
app.use('/api/internal', requireMutualTLS());
```

## Dev certs
```bash
bash tools/gencerts.sh ./certs
```
