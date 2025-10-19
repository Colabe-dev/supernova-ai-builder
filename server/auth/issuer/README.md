# Auth Issuer - JWT Token Generation

Self-hosted JWT issuer that mints RS256-signed tokens.

## Prerequisites

**⚠️ IMPORTANT**: Before using this Auth Issuer, you must generate JWKS keys.

The keys should be generated using `tools/gen-jwks.mjs` from the Security Pro overlay. If you don't have this tool, you can generate RS256 keypairs manually:

```bash
# Create keys directory
mkdir -p server/auth/jwks/keys

# Generate a new key (replace 'key1' with unique kid like timestamp)
KID=$(date +%s)
mkdir -p server/auth/jwks/keys/$KID

# Generate RS256 keypair
openssl genrsa -out server/auth/jwks/keys/$KID/private.pem 2048
openssl rsa -in server/auth/jwks/keys/$KID/private.pem -pubout -out server/auth/jwks/keys/$KID/public.pem
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
2. **Private Keys**: Never commit private keys to version control
3. **Key Rotation**: Generate new keys periodically and update the JWKS directory
4. **Token Validation**: Use the JWKS verifier (from Security Pro overlay) to validate tokens on protected routes
