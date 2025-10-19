# CI/CD Deployment Guide

Complete guide for building, deploying, and managing Supernova across environments.

## Overview

Supernova uses a **GitOps-style deployment pipeline** with automated builds and Helmfile-based deployments:

```
Code Push → GitHub Actions → Docker Build → GHCR → Helmfile Deploy → Kubernetes
```

---

## Branch → Environment Mapping

| Branch/Tag | Environment | Image Tag | Replicas | Auth Mode |
|------------|-------------|-----------|----------|-----------|
| `develop` | **dev** | `dev-<sha>` | 1 | `DEV_AUTH_OPEN=true` |
| `main` | **staging** | `staging-<sha>` | 2 | JWT required |
| `v*` (tags) | **prod** | `v1.0.0` | 3 | JWT required |

---

## Required GitHub Secrets

Configure in **Settings → Secrets and Variables → Actions**:

### Container Registry
- `GHCR_PAT` - GitHub Personal Access Token with `write:packages` scope
  - Or use default `GITHUB_TOKEN` if org allows package writes

### Kubernetes Access
- `KUBE_CONFIG_BASE64` - Base64-encoded kubeconfig with cluster access
  ```bash
  cat ~/.kube/config | base64 | tr -d '\n'
  ```

### Application Secrets (per environment)
Set these in Helm values files or ExternalSecrets:
- `DATABASE_URL` - Postgres connection string
- `REDIS_URL` / `REDIS_SENTINEL` / `REDIS_CLUSTER_NODES`
- `SESSION_SECRET` - Express session encryption
- `APP_JWT_SECRET` - JWT signing secret
- `ISSUER_ADMIN_SECRET` - Auth issuer admin password
- `COLLAB_PAY_WEBHOOK_SECRET` - Webhook HMAC verification
- `GOOGLE_SERVICE_ACCOUNT_KEY` - IAP verification (one-line JSON)
- `APPLE_SHARED_SECRET` - Apple IAP verification
- `SENTRY_DSN` - Error tracking

---

## Workflows

### 1. Docker Build & Publish (`.github/workflows/docker-build-publish.yml`)

**Triggers:**
- Push to `develop`, `main`
- Tags matching `v*`

**Steps:**
1. Checkout code
2. Set up Docker Buildx
3. Login to GHCR
4. Extract metadata (tags, labels)
5. Build and push multi-arch image
6. Tag appropriately based on branch/tag

**Image Repository:**
```
ghcr.io/<org>/supernova-server
```

**Example Tags:**
- `develop` branch → `ghcr.io/<org>/supernova-server:dev-a1b2c3d`
- `main` branch → `ghcr.io/<org>/supernova-server:staging-e4f5g6h`
- `v1.2.3` tag → `ghcr.io/<org>/supernova-server:v1.2.3`

### 2. Helmfile Deploy (`.github/workflows/deploy-helmfile.yml`)

**Triggers:**
- Successful completion of `docker-build-publish.yml`

**Steps:**
1. Checkout code
2. Install `helm` and `helmfile`
3. Decode `KUBE_CONFIG_BASE64` to `~/.kube/config`
4. Determine environment from branch/tag
5. Run `helmfile -e <env> apply`

**Deployment Command:**
```bash
# Dev
helmfile -e dev apply

# Staging
helmfile -e staging apply

# Production
helmfile -e prod apply
```

---

## Helmfile Structure

```
helmfile/
├── helmfile.yaml                 # Multi-environment orchestration
└── charts/
    └── supernova-server/         # Embedded chart
        ├── Chart.yaml
        ├── values.yaml           # Base/prod defaults
        ├── values-dev.yaml
        ├── values-staging.yaml
        ├── values-prod.yaml
        ├── charts/
        │   └── collab-lib/       # Shared library templates
        └── templates/
            ├── stack.yaml        # Deployment, Service, Ingress, HPA, PDB, NetworkPolicy
            ├── configmap-env.yaml
            ├── configmap-tokens.yaml
            ├── secret.yaml
            ├── externalsecret.yaml
            └── migrate-hook.yaml # Database migration Job
```

---

## Deployment Flow

### Development Workflow

1. **Create feature branch** from `develop`
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Develop and test locally**
   ```bash
   npm run dev
   ```

3. **Push to feature branch**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create PR to `develop`**
   - CI runs tests and builds
   - Review and approve

5. **Merge to `develop`**
   - Auto-builds image: `dev-<sha>`
   - Auto-deploys to **dev** cluster
   - Database migrations run automatically via hook

### Staging Promotion

1. **Create PR from `develop` to `main`**
   - Include changelog
   - Tag release notes

2. **Merge to `main`**
   - Auto-builds image: `staging-<sha>`
   - Auto-deploys to **staging** cluster
   - Smoke tests run

3. **Validate in staging**
   ```bash
   # Health check
   curl https://staging.supernova.com/healthz
   
   # JWKS endpoint
   curl https://staging.supernova.com/auth/.well-known/jwks.json
   
   # Authenticated endpoint
   curl -H "Authorization: Bearer $JWT" \
     https://staging.supernova.com/api/entitlements/test
   ```

### Production Release

1. **Create release tag**
   ```bash
   git checkout main
   git pull
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

2. **Auto-deployment**
   - Builds image: `v1.2.3`
   - Deploys to **prod** cluster
   - Migrations run (configurable: pre or post deployment)

3. **Post-deployment verification**
   - Run production smoke tests (see PRODUCTION_RUNBOOK.md)
   - Monitor Sentry for errors
   - Check metrics and logs

---

## Migration Strategy

### Automatic Migrations (Default)

The `migrate-hook.yaml` template creates a Helm Job that runs on every deploy with optional exponential retry:

```yaml
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
- Wraps command in bash retry loop
- Exponential backoff: 2s → 4s → 8s → 16s → 32s → 60s
- Independent from Kubernetes `backoffLimit`
- Stops after 6 attempts or first success

**Flow:**
1. Helm installs/upgrades resources
2. Migration Job runs: `node db/migrate.mjs` (with retry if enabled)
3. Job completes successfully
4. Pods roll to new version
5. Job auto-deletes after TTL

**Monitor migrations:**
```bash
kubectl -n supernova get jobs | grep migrate
kubectl -n supernova logs job/supernova-server-migrate-<revision>
```

### Data Seeding (Optional)

Separate hook for seeding initial/reference data:

```yaml
seeds:
  enabled: true
  when: ["post-install"]        # Only on first install
  # OR when: ["post-install", "post-upgrade"]  # On every deploy
  weight: 20                     # Runs after migrations
  command: ["node", "db/seed.mjs"]
  retry:
    exponential:
      enabled: true
      initialSeconds: 2
      maxSeconds: 60
      maxAttempts: 6
```

**Use Cases:**
- Admin users and roles
- Reference data (countries, currencies)
- Default settings
- Sample data for staging/dev

**Monitor seeds:**
```bash
kubectl -n supernova get jobs | grep seed
kubectl -n supernova logs job/supernova-server-seed-<revision>
```

### Pre-Deployment Migrations

For breaking schema changes, run migrations BEFORE pod rollout:

```yaml
migrations:
  when: ["pre-install", "pre-upgrade"]
  weight: -10
```

### Manual Migration Fallback

If automated migrations fail:

```bash
# Run migration manually
kubectl -n supernova run migrate-manual \
  --image=ghcr.io/<org>/supernova-server:v1.2.3 \
  --env="DATABASE_URL=$DATABASE_URL" \
  --restart=Never \
  --command -- node db/migrate.mjs

# Check logs
kubectl -n supernova logs migrate-manual

# Clean up
kubectl -n supernova delete pod migrate-manual
```

---

## Rollback Procedures

### Helm Rollback

```bash
# List releases
helm -n supernova history supernova-server

# Rollback to previous revision
helm -n supernova rollback supernova-server

# Rollback to specific revision
helm -n supernova rollback supernova-server 5
```

### Image Rollback

```bash
# Rollback to specific image
helm -n supernova upgrade supernova-server ./supernova-server \
  -f supernova-server/values-prod.yaml \
  --set image.tag=v1.2.2 \
  --reuse-values
```

### Database Rollback

**Warning:** Database rollbacks are risky. Always test migrations in staging first.

If you need to rollback the database:
1. Restore from backup
2. Re-run migrations to previous version
3. Deploy previous application version

---

## Canary Deployments (Optional)

For gradual rollouts, use Argo Rollouts or Flagger:

```yaml
# Example canary with traffic splitting
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 5m}
      - setWeight: 100
```

---

## Blue-Green Deployments (Optional)

```bash
# Deploy green version
helm -n supernova-green install supernova-server-green ./supernova-server \
  -f supernova-server/values-prod.yaml \
  --set image.tag=v1.3.0

# Validate green
kubectl -n supernova-green get pods

# Switch traffic (update Ingress)
kubectl -n supernova patch ingress supernova-server \
  --type='json' -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value":"supernova-server-green"}]'

# Clean up blue after validation
helm -n supernova uninstall supernova-server
```

---

## Environment Protection Rules

Configure in **GitHub → Settings → Environments**:

### Staging Environment
- **Required reviewers:** 1 developer
- **Wait timer:** 0 minutes
- **Deployment branches:** `main` only

### Production Environment
- **Required reviewers:** 2 senior developers
- **Wait timer:** 5 minutes
- **Deployment branches:** Tags matching `v*` only

---

## Monitoring & Alerts

### Key Metrics

1. **Deployment Success Rate**
   - Target: >99%
   - Alert if <95%

2. **Migration Duration**
   - Target: <60s
   - Alert if >120s

3. **Pod Restart Count**
   - Target: 0
   - Alert if >3 in 5 minutes

4. **Error Rate (Sentry)**
   - Target: <0.1%
   - Alert if >1%

5. **Rate Limit 429s**
   - Target: <5% of requests
   - Alert if >10%

### Alert Channels

- **Slack:** `#supernova-alerts`
- **PagerDuty:** Critical production issues
- **Email:** Weekly deployment summaries

---

## CI Security

### Image Scanning

Add to `docker-build-publish.yml`:

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/${{ github.repository }}:${{ steps.meta.outputs.tags }}
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

### Secret Scanning

Enable in **Settings → Code security and analysis**:
- ✅ Secret scanning
- ✅ Push protection
- ✅ Dependabot alerts

---

## Release Checklist

Before tagging a production release:

- [ ] All tests passing in staging
- [ ] Database migrations tested in staging
- [ ] Performance benchmarks acceptable
- [ ] Security scan clean (no critical/high vulnerabilities)
- [ ] Changelog updated
- [ ] Release notes prepared
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Monitoring dashboards ready

---

## Incident Playbooks

### Deployment Failure

1. **Check workflow logs**
   ```bash
   # GitHub Actions UI or
   gh run view <run-id>
   ```

2. **Check Helm status**
   ```bash
   helm -n supernova status supernova-server
   helm -n supernova history supernova-server
   ```

3. **Check pod events**
   ```bash
   kubectl -n supernova get events --sort-by='.lastTimestamp'
   kubectl -n supernova describe pod <pod-name>
   ```

4. **Rollback immediately**
   ```bash
   helm -n supernova rollback supernova-server
   ```

### Migration Failure

1. **Check migration logs**
   ```bash
   kubectl -n supernova logs job/supernova-server-migrate-<rev>
   ```

2. **If Job failed, deployment is blocked** (good!)

3. **Fix migration** in new commit

4. **Re-deploy** with fixed migration

### Database Connection Issues

1. **Verify DATABASE_URL secret**
   ```bash
   kubectl -n supernova get secret supernova-server-secrets -o yaml
   ```

2. **Test connection from pod**
   ```bash
   kubectl -n supernova exec -it deploy/supernova-server -- \
     node -e "require('pg').Client({connectionString:process.env.DATABASE_URL}).connect()"
   ```

3. **Check network policies**
   ```bash
   kubectl -n supernova get networkpolicies
   ```

---

## Troubleshooting

### Common Issues

**Issue:** Image pull authentication failure
```bash
# Solution: Verify GHCR_PAT has package read access
kubectl -n supernova create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=$GHCR_PAT
```

**Issue:** Helm release stuck in pending-upgrade
```bash
# Solution: Delete pending release
helm -n supernova rollback supernova-server 0
```

**Issue:** Migration Job timeout
```bash
# Solution: Increase timeout
helm upgrade ... --set migrations.activeDeadlineSeconds=600
```

---

## Support & Documentation

- **Production Runbook:** `docs/PRODUCTION_RUNBOOK.md`
- **Security Stack:** `SECURITY_PRODUCTION_RUNBOOK.md`
- **Architecture:** `replit.md`
- **Helm Chart:** `helmfile/charts/supernova-server/README.md`

---

**Last Updated:** 2025-10-19  
**Version:** 1.0  
**Owner:** Platform Team
