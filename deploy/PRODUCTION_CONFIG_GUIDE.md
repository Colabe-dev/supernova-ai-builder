# Production Configuration Guide

Quick guide to fill out `values-prod.yaml` for production deployment.

## Three Must-Haves (Minimum Required)

To get started, provide these three essentials:

1. **Container Registry:** `ghcr.io/<ORG>/<REPO>`
   - Example: `ghcr.io/collab/supernova-server`

2. **Production Domain:** `api.<YOUR_DOMAIN>`
   - Example: `api.supernova.xyz`

3. **Infrastructure:**
   - `DATABASE_URL`: Your Postgres connection string
   - `REDIS_URL`: Your Redis connection string
   - `AUTH_ISSUER`: Your authentication issuer URL

---

## Step-by-Step Configuration

### 1. Container Image

```yaml
image:
  repository: ghcr.io/YOUR_ORG/supernova-server
  tag: v1.0.0  # Update to your release tag
```

**Where to find:**
- Your GitHub organization: `https://github.com/YOUR_ORG`
- Repository name: Usually `supernova-server`
- Tag: Git tag you're deploying (e.g., `v1.0.0`, `v1.2.3`)

### 2. Domain & Ingress

```yaml
ingress:
  hosts:
    - host: api.YOUR_DOMAIN
  tls:
    - secretName: api-supernova-tls
      hosts:
        - api.YOUR_DOMAIN
```

**Where to find:**
- Your domain: The domain you own (e.g., `supernova.xyz`)
- TLS secret: Created by cert-manager or manually

### 3. Database Connection

```yaml
secrets:
  DATABASE_URL: "postgresql://user:pass@host:5432/supernova_prod?sslmode=require"
```

**Format:**
```
postgresql://USERNAME:PASSWORD@HOSTNAME:5432/DATABASE_NAME?sslmode=require
```

**Examples:**
- AWS RDS: `postgresql://admin:pass@mydb.us-east-1.rds.amazonaws.com:5432/supernova?sslmode=require`
- Google Cloud SQL: `postgresql://postgres:pass@10.0.0.1:5432/supernova?sslmode=require`
- Replit Postgres: Available in Replit Secrets as `DATABASE_URL`

### 4. Redis Connection

```yaml
secrets:
  REDIS_URL: "redis://hostname:6379"
```

**Options:**

**Single Instance:**
```
REDIS_URL: "redis://hostname:6379"
```

**Sentinel (High Availability):**
```
REDIS_SENTINEL: "sentinel1:26379,sentinel2:26379,sentinel3:26379"
REDIS_MASTER: "mymaster"
```

**Cluster (Distributed):**
```
REDIS_CLUSTER_NODES: "node1:6379,node2:6379,node3:6379"
```

### 5. Authentication

```yaml
env:
  AUTH_ISSUER: "https://auth.YOUR_DOMAIN"

secrets:
  AUTH_JWKS_URL: "https://auth.YOUR_DOMAIN/.well-known/jwks.json"
  ISSUER_ADMIN_SECRET: "<GENERATE>"
  APP_JWT_SECRET: "<GENERATE>"
  SESSION_SECRET: "<GENERATE>"
```

**Generate secrets:**
```bash
openssl rand -base64 48
```

Run this command **three times** to generate:
1. `ISSUER_ADMIN_SECRET`
2. `APP_JWT_SECRET`
3. `SESSION_SECRET`

### 6. Collab Pay Integration

```yaml
secrets:
  COLLAB_PAY_API_BASE: "https://pay.YOUR_DOMAIN"
  COLLAB_PAY_SECRET: "<YOUR_SECRET>"
  COLLAB_PAY_WEBHOOK_SECRET: "<YOUR_WEBHOOK_SECRET>"
```

**Where to find:**
- Provided by your Collab Pay setup
- Contact your payment platform administrator

### 7. Sentry (Optional but Recommended)

```yaml
secrets:
  SENTRY_DSN: "https://key@sentry.io/project"
```

**Where to find:**
1. Go to https://sentry.io
2. Create a project
3. Copy the DSN from Project Settings → Client Keys (DSN)

**To disable:** Set to empty string `""`

### 8. In-App Purchases (Mobile)

```yaml
secrets:
  GOOGLE_SERVICE_ACCOUNT_KEY: '{"type":"service_account",...}'
  GOOGLE_PACKAGE_NAME: "com.YOUR_ORG.supernova"
  APPLE_BUNDLE_ID: "com.YOUR_ORG.supernova"
  APPLE_SHARED_SECRET: "<YOUR_SECRET>"
```

**Google Play:**
1. Google Cloud Console → IAM & Admin → Service Accounts
2. Create service account with "Android Publisher" role
3. Download JSON key
4. Copy entire JSON as one line

**Apple App Store:**
1. App Store Connect → Users and Access → Shared Secret
2. Generate shared secret
3. Copy value

---

## Quick Fill Template

Copy this and fill in the values:

```bash
# === FILL THESE IN ===
GITHUB_ORG="YOUR_ORG"                              # e.g., "collab"
DOMAIN="YOUR_DOMAIN"                               # e.g., "supernova.xyz"
DATABASE_URL="postgresql://..."                     # Your Postgres URL
REDIS_URL="redis://..."                            # Your Redis URL
AUTH_ISSUER="https://auth.YOUR_DOMAIN"             # Your auth service

# Generate secrets
ISSUER_ADMIN_SECRET=$(openssl rand -base64 48)
APP_JWT_SECRET=$(openssl rand -base64 48)
SESSION_SECRET=$(openssl rand -base64 48)

# Optional
SENTRY_DSN="https://..."                           # Or "" to disable
COLLAB_PAY_SECRET="..."
COLLAB_PAY_WEBHOOK_SECRET="..."
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
APPLE_SHARED_SECRET="..."
```

---

## Validation Checklist

Before deploying, verify:

- [ ] `DEV_AUTH_OPEN` is set to `"false"`
- [ ] `NODE_ENV` is set to `"production"`
- [ ] Database connection string ends with `?sslmode=require`
- [ ] All three secrets generated (ISSUER_ADMIN, APP_JWT, SESSION)
- [ ] Domain matches your DNS configuration
- [ ] TLS certificate secret exists in cluster
- [ ] Container image tag matches your release
- [ ] Redis connection is correct (URL, Sentinel, or Cluster)

---

## Deploy Command

Once filled, deploy with:

```bash
# Using Helmfile
cd helmfile
helmfile -e prod apply

# Or using Helm directly
helm upgrade --install supernova-server ./deploy/helm/supernova-server \
  -n supernova --create-namespace \
  -f deploy/helm/supernova-server/values-prod.yaml
```

---

## Troubleshooting

**Issue:** Can't connect to database
```bash
# Test connection from local machine
psql "$DATABASE_URL"
```

**Issue:** Can't connect to Redis
```bash
# Test Redis connection
redis-cli -u "$REDIS_URL" ping
```

**Issue:** TLS certificate not found
```bash
# Check if cert secret exists
kubectl -n supernova get secret api-supernova-tls

# If using cert-manager
kubectl -n supernova get certificate
```

**Issue:** Migration fails
```bash
# Check migration logs
kubectl -n supernova logs job/supernova-server-migrate-<revision>

# Run migration manually
kubectl -n supernova run migrate-manual \
  --image=ghcr.io/YOUR_ORG/supernova-server:v1.0.0 \
  --env="DATABASE_URL=$DATABASE_URL" \
  --restart=Never \
  --command -- node db/migrate.mjs
```

---

## Next Steps

1. Fill out `values-prod.yaml`
2. Commit to version control (use git-crypt or similar for secrets)
3. Or use External Secrets / Sealed Secrets for production
4. Deploy using Helmfile or Helm
5. Verify deployment
6. Run smoke tests

See `docs/PRODUCTION_RUNBOOK.md` for complete deployment guide.
