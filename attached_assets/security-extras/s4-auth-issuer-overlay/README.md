# S4 — Auth Issuer (JWT)

Self-hosted JWT issuer that signs RS256 tokens using keys under `server/auth/jwks/keys`.
Pairs with the JWKS verifier from Security Pro.

## Install
```bash
npm i jose
```

## Env
```
AUTH_ISSUER=https://collab.supernova.auth
AUTH_AUDIENCE=supernova-api
JWKS_DIR=server/auth/jwks/keys
ISSUER_ADMIN_SECRET=<random>         # protects /auth/token endpoint
DEFAULT_TTL=3600                     # seconds
```

## Wire
```js
// server/index.js
import jwksRouter from './auth/jwks/publish.js';      // already available in Security Pro
import issuerRouter from './auth/issuer/index.js';
app.use('/auth', jwksRouter);
app.use('/auth', issuerRouter); // /auth/token
```

## CLI
```bash
node tools/mint-jwt.mjs --sub u1 --roles admin,finance --ttl 3600
```
Outputs a signed JWT (RS256) with `kid` of the latest key. Rotate keys with `tools/gen-jwks.mjs` (Security Pro).
