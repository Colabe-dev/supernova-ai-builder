# Auth Issuer - JWT Token Generation

Self-hosted JWT issuer that mints RS256-signed tokens.

## Prerequisites

**⚠️ IMPORTANT**: Before using this Auth Issuer, you must generate JWKS keys.

**🔐 SECURITY**: Keys are generated locally per environment and NEVER committed to version control.

### Generate Keys

Use the built-in key generation tool:

```bash
# Generate new RS256 keypair (automatically excluded from git)
node tools/gen-jwks.mjs
```

For manual generation:

```bash
# Create keys directory
mkdir -p server/auth/jwks/keys

# Generate a new key (replace 'key1' with unique kid like timestamp)
KID=$(date +%s)
mkdir -p server/auth/jwks/keys/$KID

# Generate RS256 keypair
openssl genrsa -out server/auth/jwks/keys/$KID/private.pem 2048
openssl rsa -in server/auth/jwks/keys/$KID/private.pem -pubout -out server/auth/jwks/keys/$KID/public.pem

# Update jwks.json with the public key using tools/gen-jwks.mjs
node tools/gen-jwks.mjs
```

## Environment Variables

```bash
AUTH_ISSUER=https://collab.supernova.auth
AUTH_AUDIENCE=supernova-api
JWKS_DIR=server/auth/jwks/keys
ISSUER_ADMIN_SECRET=<random-secret>
DEFAULT_TTL=3600
```

## API Endpoint

### POST /auth/token

Mint a new JWT token with custom claims.

**Headers:**
```
x-issuer-secret: <ISSUER_ADMIN_SECRET>
Content-Type: application/json
```

**Body:**
```json
{
  "sub": "user123",
  "roles": ["admin", "finance"],
  "ttl": 3600,
  "extra": {
    "customClaim": "value"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE3NjA5MDcxMjMifQ...",
  "kid": "1760907123",
  "exp": 1760910723
}
```

## CLI Usage

Use the `tools/mint-jwt.mjs` CLI tool to generate tokens:

```bash
# Basic usage
node tools/mint-jwt.mjs --sub user123

# With roles and custom TTL
node tools/mint-jwt.mjs --sub user123 --roles admin,finance --ttl 7200
```

## Security Notes

1. **ISSUER_ADMIN_SECRET**: Keep this secret secure - it protects the token minting endpoint
2. **Private Keys**: 
   - ⚠️ NEVER commit private keys to version control
   - Generate unique keys for each environment (dev/staging/production)
   - Private keys are automatically excluded from git via .gitignore
   - Store production keys securely (e.g., Replit Secrets, AWS Secrets Manager, HashiCorp Vault)
3. **Key Rotation**: Generate new keys periodically and update the JWKS directory
4. **Token Validation**: Use the JWKS verifier (from Security Pro overlay) to validate tokens on protected routes
5. **First Time Setup**: Run `node tools/gen-jwks.mjs` before starting the server
