# Production Deployment Runbook

Complete operational guide for deploying and managing Supernova in production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Security Stack Configuration](#security-stack-configuration)
4. [Helm Deployment](#helm-deployment)
5. [Database Migrations](#database-migrations)
6. [Observability](#observability)
7. [SLOs & Monitoring](#slos--monitoring)
8. [Rollback Procedures](#rollback-procedures)
9. [Change Management](#change-management)
10. [Incident Response](#incident-response)

---

## Prerequisites

### Required Tools

- `kubectl` (v1.28+)
- `helm` (v3.12+)
- `helmfile` (v0.158+)
- `node` (v20+) for CLI tools
- Access to Kubernetes cluster
- Access to secrets management (Sealed Secrets or External Secrets)

### Required Credentials

- Kubernetes cluster admin access
- GitHub Container Registry (GHCR) pull access
- Postgres database admin
- Redis cluster access
- Sentry DSN
- Google/Apple IAP service accounts

---

## Infrastructure Setup

### 1. Kubernetes Cluster

**Minimum Requirements:**
- 3 nodes (production)
- 4 CPU, 8GB RAM per node
- Pod Security Standards: `restricted`
- Network policies enabled
- Ingress controller (NGINX recommended)

**Namespaces:**
```bash
kubectl create namespace supernova          # production
kubectl create namespace supernova-staging  # staging
kubectl create namespace supernova-dev      # development
```

### 2. Postgres Database

**Production Specs:**
- PostgreSQL 15+
- Managed service (AWS RDS, Google Cloud SQL, or Replit Postgres)
- Automated backups (daily, 30-day retention)
- Point-in-time recovery enabled
- Connection pooling (PgBouncer recommended)

**Initialize Database:**
```bash
# Create database
createdb supernova_production

# Run migrations (handled by Helm hook, or manual)
export DATABASE_URL='postgresql://user:pass@host:5432/supernova_production'
node db/migrate.mjs
```

**Connection String Format:**
```
DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require
```

### 3. Redis Cluster

**Production Setup (choose one):**

**Option A: Single Instance** (dev/staging)
```bash
REDIS_URL=redis://hostname:6379
```

**Option B: Sentinel** (high availability)
```bash
REDIS_SENTINEL=sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_MASTER=mymaster
```

**Option C: Cluster** (distributed)
```bash
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
```

**Verify:**
```bash
redis-cli -h <hostname> ping
# Expected: PONG
```

---

## Security Stack Configuration

### 1. Generate JWKS Keys

Production keys must be generated securely and stored safely:

```bash
# Generate RS256 keypair
node tools/gen-jwks.mjs

# Output:
# ✓ Generated keypair with kid=1760908689588
#   Private: server/auth/jwks/keys/1760908689588/private.pem
#   Public:  server/auth/jwks/keys/1760908689588/public.pem
# ✓ Updated server/auth/jwks/keys/jwks.json

# Commit keys (private keys should be in .gitignore or encrypted)
git add server/auth/jwks/keys
git commit -m "rotate jwks keys"
```

**⚠️ CRITICAL:** Private keys must be:
- Stored in encrypted secrets (Sealed Secrets / External Secrets)
- Never committed to version control
- Rotated every 90 days
- Backed up securely

### 2. Environment Configuration

**Required Secrets:**

```bash
# Authentication & Security
AUTH_JWKS_URL=https://api.supernova.com/auth/.well-known/jwks.json
AUTH_ISSUER=https://collab.supernova.auth
AUTH_AUDIENCE=supernova-api
APP_URL=https://app.supernova.com
DEV_AUTH_OPEN=false                    # ⚠️ MUST be false in production
CORS_ALLOWED_ORIGINS=https://app.supernova.com,https://console.supernova.com  # Comma-separated list of allowed web origins
ISSUER_ADMIN_SECRET=<cryptographically-random-64-chars>
APP_JWT_SECRET=<cryptographically-random-64-chars>
SESSION_SECRET=<cryptographically-random-64-chars>

# Database
DATABASE_URL=postgresql://user:pass@host:5432/supernova_production?sslmode=require

# Redis
REDIS_URL=redis://hostname:6379
# OR
REDIS_SENTINEL=sentinel1:26379,sentinel2:26379
REDIS_MASTER=mymaster
# OR
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000           # 60 seconds
RATE_LIMIT_READ_MAX=120              # 120 reads/minute
RATE_LIMIT_WRITE_MAX=30              # 30 writes/minute
RATE_LIMIT_WEBHOOK_MAX=1200          # 1200 webhook calls/minute

# IAP Verification
IAP_STRICT=true
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"..."}'
GOOGLE_PACKAGE_NAME=com.collab.supernova
APPLE_BUNDLE_ID=com.collab.supernova
APPLE_SHARED_SECRET=<apple-shared-secret>
IAP_USE_SANDBOX=false

# Webhooks
COLLAB_PAY_WEBHOOK_SECRET=<webhook-hmac-secret>

# Observability
SENTRY_DSN=https://<key>@sentry.io/<project>
SENTRY_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.1
LOG_LEVEL=info
```

### 3. JWKS Endpoint Verification

```bash
# Verify JWKS is publicly accessible
curl -s https://api.supernova.com/auth/.well-known/jwks.json

# Expected output:
{
  "keys": [
    {
      "kty": "RSA",
      "n": "xYc8kjWr...",
      "e": "AQAB",
      "kid": "1760908689588",
      "alg": "RS256",
      "use": "sig"
    }
  ]
}
```

### 4. JWT Token Minting

**Option A: CLI Tool**
```bash
node tools/mint-jwt.mjs --sub=user123 --roles=admin,finance --ttl=3600
```

**Option B: REST API**
```bash
export ISSUER_ADMIN_SECRET='your-secret'

curl -X POST https://api.supernova.com/auth/token \
  -H "x-issuer-secret: $ISSUER_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user123",
    "roles": ["admin", "finance"],
    "ttl": 3600
  }'
```

---

## Helm Deployment

### Directory Structure

```
helmfile/
├── helmfile.yaml                    # Multi-environment config
└── charts/
    └── supernova-server/
        ├── Chart.yaml
        ├── values.yaml              # Base (prod defaults)
        ├── values-dev.yaml
        ├── values-staging.yaml
        ├── values-prod.yaml
        ├── charts/
        │   └── collab-lib/          # Shared library
        └── templates/
            ├── stack.yaml           # Main resources
            ├── configmap-env.yaml
            ├── configmap-tokens.yaml
            ├── secret.yaml
            ├── externalsecret.yaml
            └── migrate-hook.yaml    # Auto migrations
```

### Deployment Steps

#### Development

```bash
cd helmfile

# Deploy to dev
helmfile -e dev apply

# Verify
kubectl -n supernova-dev get pods
kubectl -n supernova-dev get svc
kubectl -n supernova-dev get ingress
```

#### Staging

```bash
# Deploy to staging
helmfile -e staging apply

# Verify
kubectl -n supernova-staging get pods
kubectl -n supernova-staging logs -l app=supernova-server --tail=50
```

#### Production

```bash
# Review changes first
helmfile -e prod diff

# Apply with confirmation
helmfile -e prod apply

# Monitor rollout
kubectl -n supernova rollout status deployment/supernova-server

# Verify health
kubectl -n supernova get pods
kubectl -n supernova exec deploy/supernova-server -- wget -qO- http://localhost:3001/healthz
```

### Configuration Management

**Edit environment-specific values:**

```yaml
# values-prod.yaml
replicaCount: 3

image:
  repository: ghcr.io/<org>/supernova-server
  tag: "v1.2.3"
  pullPolicy: IfNotPresent

env:
  DEV_AUTH_OPEN: "false"
  SENTRY_ENV: "production"
  LOG_LEVEL: "info"
  RATE_LIMIT_READ_MAX: "120"
  RATE_LIMIT_WRITE_MAX: "30"

secrets:
  DATABASE_URL: "postgresql://..."
  REDIS_URL: "redis://..."
  AUTH_ISSUER: "https://collab.supernova.auth"
  # ... more secrets

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.supernova.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: supernova-tls
      hosts:
        - api.supernova.com

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 65
  targetMemoryUtilizationPercentage: 70

migrations:
  enabled: true
  when: ["post-install", "post-upgrade"]
  command: ["node", "db/migrate.mjs"]
```

### Secrets Management

**Option 1: Kubernetes Secret (dev/staging)**
```bash
kubectl -n supernova create secret generic supernova-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=REDIS_URL='redis://...' \
  --from-literal=ISSUER_ADMIN_SECRET='...'
```

**Option 2: Sealed Secrets (recommended)**
```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Create sealed secret
kubectl create secret generic supernova-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > supernova-sealed-secret.yaml

# Apply
kubectl apply -f supernova-sealed-secret.yaml
```

**Option 3: External Secrets (production)**
```yaml
# Enable in values-prod.yaml
externalSecrets:
  enabled: true
  secretStoreRef:
    name: aws-secrets-manager    # or vault-backend
    kind: SecretStore
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: supernova/prod/database-url
    - secretKey: REDIS_URL
      remoteRef:
        key: supernova/prod/redis-url
```

---

## Database Migrations

### Automatic Migrations (Default)

Migrations run automatically via Helm hook with optional exponential retry:

```yaml
# Configured in values.yaml
migrations:
  enabled: true
  when: ["post-install", "post-upgrade"]
  weight: 10
  command: ["node", "db/migrate.mjs"]
  backoffLimit: 0
  activeDeadlineSeconds: 300
  retry:
    exponential:
      enabled: true          # Optional: exponential backoff
      initialSeconds: 2      # Starting backoff delay
      maxSeconds: 60         # Maximum backoff delay
      maxAttempts: 6         # Maximum retry attempts
```

**How Retry Works:**
- Wraps migration command in bash retry loop
- Starts with 2s delay, doubles each failure (2s → 4s → 8s → 16s → 32s → 60s)
- Independent from Kubernetes `backoffLimit` for granular control
- Stops after 6 attempts or first success

**Monitor migration Job:**
```bash
# Watch Jobs
kubectl -n supernova get jobs -w

# Check logs
kubectl -n supernova logs job/supernova-server-migrate-<revision>

# Describe for errors
kubectl -n supernova describe job/supernova-server-migrate-<revision>
```

### Manual Migration

If automated migration fails or for testing:

```bash
# Run migration manually
kubectl -n supernova run migrate-manual \
  --image=ghcr.io/<org>/supernova-server:v1.2.3 \
  --env="DATABASE_URL=$DATABASE_URL" \
  --restart=Never \
  --rm -it \
  -- node db/migrate.mjs

# Or exec into running pod
kubectl -n supernova exec -it deploy/supernova-server -- node db/migrate.mjs
```

### Pre-Deployment Migrations

For breaking schema changes:

```yaml
# Run migrations BEFORE pod rollout
migrations:
  when: ["pre-install", "pre-upgrade"]
  weight: -10
```

### Data Seeding

Separate hook for seeding initial/reference data (runs after migrations):

```yaml
# Configured in values.yaml
seeds:
  enabled: true
  when: ["post-install"]        # Only on first install
  # OR when: ["post-install", "post-upgrade"]  # On every deploy
  weight: 20                     # Runs after migrations (weight: 10)
  command: ["node", "db/seed.mjs"]
  retry:
    exponential:
      enabled: true
      initialSeconds: 2
      maxSeconds: 60
      maxAttempts: 6
```

**Use Cases:**
- Initial admin users
- Reference data (countries, currencies, categories)
- Default configuration
- Sample/demo data for staging

**Monitor seed Job:**
```bash
# Watch Jobs
kubectl -n supernova get jobs | grep seed

# Check logs
kubectl -n supernova logs job/supernova-server-seed-<revision>

# Verify completion
kubectl -n supernova describe job/supernova-server-seed-<revision>
```

**Best Practices:**
- Make seeds **idempotent** (safe to run multiple times)
- Use `INSERT ... ON CONFLICT DO NOTHING` or similar
- Check if data exists before inserting
- Keep seeds fast (<30s) to avoid deployment delays

---

## Observability

### Health Checks

**Endpoints:**
- `/healthz` - Application health (200 OK if healthy)
- `/auth/.well-known/jwks.json` - JWKS public keys

**Kubernetes Probes:**
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /healthz
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Logging

**Structured Logging (Pino):**
```bash
# View logs
kubectl -n supernova logs -l app=supernova-server -f

# Filter by level
kubectl -n supernova logs -l app=supernova-server | grep '"level":50'  # ERROR

# Search for request ID
kubectl -n supernova logs -l app=supernova-server | grep '"reqId":"abc123"'
```

**Log Aggregation:**
- Centralize logs to Datadog, New Relic, or ELK stack
- Set retention policies (30 days minimum for production)
- Configure log-based alerts

### Error Tracking (Sentry)

**Configuration:**
```bash
SENTRY_DSN=https://<key>@sentry.io/<project>
SENTRY_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Verify Integration:**
```bash
# Trigger test error
curl -X POST https://api.supernova.com/api/test-error

# Check Sentry dashboard for error report
```

### Metrics

**Key Metrics to Track:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database connection pool utilization
- Redis hit/miss ratio
- Pod CPU/Memory usage
- Rate limit 429 responses

---

## SLOs & Monitoring

### Service Level Objectives

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.9% | Uptime monitoring |
| **Request Success Rate** | >99.5% | Non-5xx responses |
| **API Latency (p95)** | <500ms | Response time |
| **Migration Success** | 100% | Job completion |
| **Error Budget** | 0.1% | Monthly errors |

### Alerts

**Critical Alerts (PagerDuty):**
- Pod crash loop (3+ restarts in 5 minutes)
- Database connection failure
- Migration Job failure
- Error rate >5%
- Response time p95 >2s

**Warning Alerts (Slack):**
- Rate limit 429s >10% of requests
- HPA at max replicas
- Memory usage >85%
- Slow database queries >1s

### Monitoring Dashboards

**Grafana Dashboard (example queries):**

```promql
# Request rate
sum(rate(http_requests_total[5m])) by (status)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Response time
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Pod CPU usage
sum(rate(container_cpu_usage_seconds_total{pod=~"supernova.*"}[5m])) by (pod)
```

---

## Rollback Procedures

### Helm Rollback

```bash
# List deployment history
helm -n supernova history supernova-server

# Rollback to previous version
helm -n supernova rollback supernova-server

# Rollback to specific revision
helm -n supernova rollback supernova-server 5

# Verify rollback
kubectl -n supernova rollout status deployment/supernova-server
```

### Image-Only Rollback

```bash
# Rollback to specific image tag
helm -n supernova upgrade supernova-server ./supernova-server \
  -f supernova-server/values-prod.yaml \
  --set image.tag=v1.2.2 \
  --reuse-values
```

### Database Rollback

**⚠️ WARNING:** Database rollbacks are destructive. Always test in staging first.

**Option 1: Restore from Backup**
```bash
# List backups
aws rds describe-db-snapshots --db-instance-identifier supernova-prod

# Restore
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier supernova-prod-restore \
  --db-snapshot-identifier supernova-backup-20251019

# Update DATABASE_URL to restored instance
```

**Option 2: Point-in-Time Recovery**
```bash
# Restore to specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier supernova-prod \
  --target-db-instance-identifier supernova-prod-pitr \
  --restore-time 2025-10-19T12:00:00Z
```

### Emergency Auth Bypass

**Last Resort Only:**
```bash
# Temporarily bypass JWT verification (DANGEROUS)
kubectl -n supernova set env deployment/supernova-server DEV_AUTH_OPEN=true

# Fix the issue, then immediately revert
kubectl -n supernova set env deployment/supernova-server DEV_AUTH_OPEN=false
```

---

## Change Management

### Pre-Deployment Checklist

- [ ] Code reviewed and approved
- [ ] Tests passing (unit, integration, e2e)
- [ ] Database migrations tested in staging
- [ ] Security scan passed (no critical/high vulnerabilities)
- [ ] Performance benchmarks acceptable
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Change ticket created
- [ ] Deployment window scheduled (low-traffic period)
- [ ] Monitoring dashboards ready

### Deployment Windows

**Production:**
- **Preferred:** Tuesday-Thursday, 10:00-14:00 UTC
- **Avoid:** Friday afternoons, weekends, holidays
- **Emergency:** Anytime with incident commander approval

**Change Freeze:**
- 1 week before major releases
- During peak usage periods
- Holiday weekends

### Communication

**Pre-Deployment:**
```
Subject: [Supernova] Production Deployment - v1.2.3
When: 2025-10-19 12:00 UTC
Duration: ~15 minutes
Impact: None expected (rolling update)
Changes:
  - Feature: New entitlements API
  - Fix: Rate limiter Redis connection
  - Migration: Add indexes to ent_ledger
Rollback: helm rollback (< 2 minutes)
On-call: @engineer
```

**Post-Deployment:**
```
Subject: [Supernova] Deployment Complete - v1.2.3
Status: ✅ Successful
Deployed: 2025-10-19 12:15 UTC
Verification:
  ✅ All pods healthy
  ✅ Migrations completed
  ✅ Smoke tests passed
  ✅ Error rate normal
  ✅ Response times acceptable
```

---

## Incident Response

### Severity Levels

**P0 - Critical**
- Complete service outage
- Data loss or corruption
- Security breach
- Response: Immediate (page on-call)

**P1 - High**
- Partial service degradation
- High error rate (>5%)
- Failed deployment
- Response: Within 15 minutes

**P2 - Medium**
- Performance degradation
- Minor feature unavailable
- Response: Within 1 hour

**P3 - Low**
- Cosmetic issues
- Documentation errors
- Response: Next business day

### Incident Workflow

1. **Detect** - Alert fires or user report
2. **Acknowledge** - On-call engineer claims incident
3. **Assess** - Determine severity and impact
4. **Mitigate** - Stop the bleeding (rollback, scale up, failover)
5. **Investigate** - Root cause analysis
6. **Resolve** - Deploy permanent fix
7. **Document** - Post-mortem with action items

### Common Issues

**Issue: Pods CrashLooping**
```bash
# Check pod events
kubectl -n supernova describe pod <pod-name>

# Check logs
kubectl -n supernova logs <pod-name> --previous

# Common causes:
# - Database connection failure → verify DATABASE_URL
# - Out of memory → increase memory limits
# - Missing secrets → check secret mounts
```

**Issue: High Response Times**
```bash
# Check pod resources
kubectl -n supernova top pods

# Scale up if needed
kubectl -n supernova scale deployment/supernova-server --replicas=5

# Check database connections
# Check Redis connectivity
# Review slow query logs
```

**Issue: Migration Failed**
```bash
# Check migration logs
kubectl -n supernova logs job/supernova-server-migrate-<rev>

# Common causes:
# - Syntax error → fix SQL and redeploy
# - Timeout → increase activeDeadlineSeconds
# - Lock conflict → retry after clearing locks
```

---

## Security Best Practices

### JWKS Key Rotation

**Quarterly Rotation:**
```bash
# 1. Generate new key
node tools/gen-jwks.mjs

# 2. Deploy with both old and new keys
git add server/auth/jwks/keys
git commit -m "add new JWKS key"
helm upgrade ...

# 3. Wait 7 days for old tokens to expire

# 4. Remove old key from jwks.json
git commit -m "remove expired JWKS key"
helm upgrade ...
```

### Secret Rotation

**Rotate every 90 days:**
- `ISSUER_ADMIN_SECRET`
- `APP_JWT_SECRET`
- `SESSION_SECRET`
- `COLLAB_PAY_WEBHOOK_SECRET`

**Process:**
```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 48)

# Update in secrets manager
kubectl -n supernova edit secret supernova-secrets

# Restart pods
kubectl -n supernova rollout restart deployment/supernova-server
```

### Access Control Audit

**Quarterly Review:**
- [ ] Review RBAC roles and bindings
- [ ] Audit service account permissions
- [ ] Review who has cluster admin access
- [ ] Verify namespace isolation
- [ ] Check network policies

---

## Disaster Recovery

### Backup Strategy

**Database Backups:**
- Automated daily snapshots (30-day retention)
- Weekly full backups (90-day retention)
- Point-in-time recovery enabled

**Kubernetes Backups:**
```bash
# Backup all resources
kubectl get all -n supernova -o yaml > supernova-backup.yaml

# Use Velero for full cluster backups
velero backup create supernova-$(date +%Y%m%d)
```

**JWKS Private Keys:**
- Encrypted backups in 1Password/Vault
- Offline copy in secure location

### Recovery Procedures

**Full Cluster Rebuild:**
1. Provision new Kubernetes cluster
2. Restore database from backup
3. Deploy Helm charts
4. Restore JWKS keys
5. Update DNS to new cluster
6. Validate all endpoints

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 1 hour

---

## Appendix

### Useful Commands

```bash
# Quick health check
kubectl -n supernova get pods,svc,ingress

# Watch deployment rollout
kubectl -n supernova rollout status deployment/supernova-server

# Port forward for local testing
kubectl -n supernova port-forward svc/supernova-server 3001:80

# Execute command in pod
kubectl -n supernova exec -it deploy/supernova-server -- /bin/sh

# View recent events
kubectl -n supernova get events --sort-by='.lastTimestamp' | head -20

# Check resource usage
kubectl -n supernova top pods
kubectl -n supernova top nodes
```

### Contact Information

- **Platform Team:** platform@supernova.com
- **On-Call:** +1-555-ONCALL
- **Slack:** #supernova-ops
- **PagerDuty:** https://supernova.pagerduty.com
- **Status Page:** https://status.supernova.com

---

**Last Updated:** 2025-10-19  
**Version:** 1.0  
**Owner:** Platform Engineering Team  
**Next Review:** 2026-01-19
