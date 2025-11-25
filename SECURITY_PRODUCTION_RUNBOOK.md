# Security Stack - Production Runbook

Complete guide for deploying Supernova's security stack to production.

## Overview

This runbook covers the complete security stack:
- ✅ JWKS-based JWT authentication with RBAC
- ✅ Self-hosted JWT issuer (RS256)
- ✅ Redis-backed rate limiting (Cluster/Sentinel support)
- ✅ Postgres-backed entitlements with idempotency
- ✅ IAP verification (Google Play + Apple StoreKit 2)
- ✅ mTLS and request signing for zero-trust architectures

---

## 1. Generate & Publish JWKS (Production)

### Generate Keys

**🔐 CRITICAL SECURITY REQUIREMENT**: Generate unique keys for each environment. Keys are stored locally and NEVER committed to version control.

**Production Key Generation:**

```bash
# On your production server, generate new RS256 keypair
node tools/gen-jwks.mjs

# Keys are automatically excluded from git via .gitignore
# Store private keys securely (Replit Secrets, AWS Secrets Manager, etc.)
```

This creates:
- `server/auth/jwks/keys/<kid>/private.pem` - Private key (NEVER commit to git!)
- `server/auth/jwks/keys/<kid>/public.pem` - Public key
- `server/auth/jwks/keys/jwks.json` - Public key set for verification

**For Replit Production:**
1. Generate keys locally using `node tools/gen-jwks.mjs`
2. Keys are stored in the production environment only
3. Never commit or share private keys across environments

### Configure Environment

```bash
# Production configuration
AUTH_JWKS_URL=https://api.supernova.com/auth/.well-known/jwks.json
AUTH_ISSUER=https://collab.supernova.auth
AUTH_AUDIENCE=supernova-api
DEV_AUTH_OPEN=false  # CRITICAL: Enforce JWT verification in production
CORS_ALLOWED_ORIGINS=https://app.supernova.com,https://console.supernova.com  # Lock CORS to trusted frontends
```

### Verify JWKS Endpoint

```bash
curl -s https://api.supernova.com/auth/.well-known/jwks.json
```

Expected response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "n": "...",
      "e": "AQAB",
      "kid": "1760908689588",
      "alg": "RS256",
      "use": "sig"
    }
  ]
}
```

---

## 2. Mint JWT Tokens

### Option A: REST API

```bash
export ISSUER_ADMIN_SECRET='your-secure-secret'

curl -s -X POST https://api.supernova.com/auth/token \
  -H "x-issuer-secret: $ISSUER_ADMIN_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "sub": "user123",
    "roles": ["admin", "finance"],
    "ttl": 3600
  }'
```

### Option B: CLI Tool

```bash
node tools/mint-jwt.mjs --sub=user123 --roles=admin,finance --ttl=3600
```

### Verify Token Authentication

```bash
# Store the token
export JWT='<your-jwt-token>'

# Test without token - should fail (401/403)
curl -i https://api.supernova.com/api/entitlements/user123

# Test with valid token - should succeed (200)
curl -s -H "Authorization: Bearer $JWT" \
  https://api.supernova.com/api/entitlements/user123
```

---

## 3. Enable Redis Rate Limiting (Production)

### Configuration Options

**Single Node:**
```bash
REDIS_URL=redis://your-redis-host:6379
```

**Sentinel:**
```bash
REDIS_SENTINEL=host1:26379,host2:26379,host3:26379
REDIS_MASTER=mymaster
```

**Cluster:**
```bash
REDIS_CLUSTER_NODES=host1:6379,host2:6379,host3:6379
```

### Tune Rate Limits

```bash
RATE_LIMIT_WINDOW_MS=60000      # 60 seconds
RATE_LIMIT_READ_MAX=120         # 120 reads per minute
RATE_LIMIT_WRITE_MAX=30         # 30 writes per minute
RATE_LIMIT_WEBHOOK_MAX=1200     # 1200 webhook calls per minute
```

### Load Test

```bash
# Send 140 requests - expect 429 after hitting limit
for i in {1..140}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $JWT" \
    https://api.supernova.com/api/entitlements/user123
done | sort | uniq -c

# Expected output:
#  120 200
#   20 429
```

---

## 4. Lock Production Auth

### Critical Security Settings

```bash
DEV_AUTH_OPEN=false                    # ⚠️ CRITICAL: Enforce JWT verification
ISSUER_ADMIN_SECRET=<strong-secret>    # Protects /auth/token endpoint
```

### Access Control Matrix

| Endpoint | No Token | Valid Token | Role Required |
|----------|----------|-------------|---------------|
| `GET /api/entitlements/:profileId` | ❌ 401 | ✅ 200 | self OR admin/finance |
| `POST /api/entitlements/grant` | ❌ 401 | ✅ 200 (admin only) | admin/finance |
| `POST /api/webhooks/collabpay` | ✅ 200 (HMAC) | ✅ 200 | N/A (HMAC verified) |
| `POST /auth/token` | ❌ 401 | N/A | Requires ISSUER_ADMIN_SECRET |

---

## 5. End-to-End Production Smoke Tests

### Health Check

```bash
curl -s https://api.supernova.com/healthz
```

### JWKS Verification

```bash
curl -s https://api.supernova.com/auth/.well-known/jwks.json
```

### Authenticated Read

```bash
curl -s -H "Authorization: Bearer $JWT" \
  https://api.supernova.com/api/entitlements/user123
```

### Admin Write (with idempotency)

```bash
# First request - creates coins
curl -s -X POST https://api.supernova.com/api/entitlements/grant \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "user123",
    "grant": {
      "type": "coins",
      "amount": 100,
      "reason": "prod-smoke"
    },
    "externalRef": "smoke-001"
  }'

# Second request - idempotent (same externalRef, no double credit)
curl -s -X POST https://api.supernova.com/api/entitlements/grant \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "user123",
    "grant": {
      "type": "coins",
      "amount": 100,
      "reason": "prod-smoke"
    },
    "externalRef": "smoke-001"
  }'
```

Expected: Both requests return `200` with same balance (not doubled).

---

## 6. IAP Strict Mode (When Ready)

### Configuration

```bash
IAP_STRICT=true
GOOGLE_SERVICE_ACCOUNT_KEY='<one-line-json>'
GOOGLE_PACKAGE_NAME=com.collab.supernova
APPLE_BUNDLE_ID=com.collab.supernova
IAP_USE_SANDBOX=false  # Production only
```

### Test Google Play

```bash
curl -s -X POST https://api.supernova.com/api/iap/google/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "profileId": "user123",
    "productId": "coins.100",
    "purchaseToken": "<real-google-token>",
    "packageName": "com.collab.supernova",
    "grant": {
      "type": "coins",
      "amount": 1000
    }
  }'
```

### Test Apple StoreKit 2

```bash
curl -s -X POST https://api.supernova.com/api/iap/apple/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "profileId": "user123",
    "signedPayload": "<apple-jws-token>",
    "grant": {
      "type": "subscription",
      "plan": "pro_monthly"
    }
  }'
```

---

## 7. Observability

### Sentry Configuration

```bash
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Logging

```bash
LOG_LEVEL=info  # production
# LOG_LEVEL=debug  # development only
```

### Monitoring Alerts

Set up alerts for:
- ✅ Rate limit 429 spikes (indicates DDoS or misconfigured client)
- ✅ IAP verification failures (402/400 anomalies)
- ✅ Entitlements idempotency violations (duplicate externalRef warnings)
- ✅ JWKS endpoint errors
- ✅ Database connection errors

---

## 8. Rollback & Emergency Procedures

### Emergency Auth Bypass (Last Resort)

```bash
# ONLY for critical emergencies - revert immediately after fix
DEV_AUTH_OPEN=true
```

**⚠️ WARNING:** This disables all JWT verification. Use only for critical outages.

### Redis Fallback

```bash
# Remove Redis configuration to fall back to in-memory
# unset REDIS_URL
# unset REDIS_SENTINEL
# unset REDIS_CLUSTER_NODES
```

Note: In-memory rate limiting only works for single instance deployments.

### Key Rotation (Compromised Key)

```bash
# Generate new key on production server
node tools/gen-jwks.mjs

# Restart server (JWKS now includes both old and new keys for gradual transition)
# After all tokens using old key expire, manually remove old key directory:
# rm -rf server/auth/jwks/keys/<old-kid>
# Then regenerate jwks.json or manually edit it to remove the old key entry
```

---

## 9. Deployment Checklist

- [ ] `DATABASE_URL` points to production Postgres
- [ ] Database migrations applied (`npm run db:migrate`)
- [ ] JWKS endpoint publicly reachable
- [ ] JWKS CDN cache set to ≤ 5 minutes
- [ ] Redis reachable from API instances
- [ ] Security groups allow Redis traffic
- [ ] All secrets in secret manager (not `.env` files)
- [ ] CI/CD masks sensitive environment variables
- [ ] WAF/Ingress forwards `Authorization` header
- [ ] `DEV_AUTH_OPEN=false` in production
- [ ] `ISSUER_ADMIN_SECRET` is cryptographically random
- [ ] Rate limits configured for expected traffic
- [ ] Sentry configured with correct DSN and environment
- [ ] Monitoring alerts configured
- [ ] Backup strategy for JWKS private keys

---

## 10. Security Best Practices

### Secret Management

- ✅ Never commit private keys to version control
- ✅ Store `ISSUER_ADMIN_SECRET` in secret manager
- ✅ Rotate `ISSUER_ADMIN_SECRET` quarterly
- ✅ Use separate secrets for dev/staging/prod

### JWKS Key Rotation

- ✅ Rotate keys every 90 days
- ✅ Keep old keys in JWKS for 7 days after rotation
- ✅ Monitor for tokens using old `kid`

### Rate Limiting

- ✅ Set conservative limits initially
- ✅ Monitor 429 responses in production
- ✅ Adjust limits based on actual traffic patterns
- ✅ Use Redis Sentinel/Cluster for high availability

### Access Control

- ✅ Use principle of least privilege for roles
- ✅ Audit role assignments quarterly
- ✅ Log all admin actions
- ✅ Monitor failed authentication attempts

---

## Support

For issues or questions:
1. Check application logs (Pino structured logs)
2. Check Sentry for errors
3. Verify JWKS endpoint accessibility
4. Test with `curl` commands above
5. Review this runbook section-by-section

---

**Last Updated:** 2025-10-19  
**Version:** 1.0 - Production Ready  
**Security Stack:** Complete (JWKS Auth + Redis Limiter + Postgres Entitlements + IAP + mTLS)
