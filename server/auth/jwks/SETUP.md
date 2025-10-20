# JWKS Setup Guide

## First Time Setup

Before you can use the JWT authentication system, you must generate cryptographic keys.

### Quick Start

```bash
# Generate your first keypair (takes 1 second)
node tools/gen-jwks.mjs
```

This will create:
- A new RSA keypair for signing JWTs
- Update the public key registry (`jwks.json`)

### What Happens

The tool generates:
```
server/auth/jwks/keys/
├── <timestamp-kid>/
│   ├── private.pem    ← Signs JWTs (NEVER committed to git)
│   └── public.pem     ← Verifies JWTs
└── jwks.json          ← Public key registry (safe to commit)
```

### Security Notes

🔐 **Private keys are automatically excluded from git** via `.gitignore`

⚠️ **Each environment needs its own keys:**
- Development: Generate locally
- Staging: Generate on staging server
- Production: Generate on production server

🚫 **Never share private keys between environments**

### Verify Setup

```bash
# Start the server
npm run dev

# Check the JWKS endpoint
curl http://localhost:5000/auth/.well-known/jwks.json
```

You should see your public key(s) in JSON Web Key Set format.

### Troubleshooting

**Error: "No keys found. Run tools/gen-jwks.mjs"**
- Solution: Run `node tools/gen-jwks.mjs` to generate your first keypair

**Error: "ENOENT: no such file or directory"**
- Solution: Run from the project root directory

### Next Steps

1. Generate keys: `node tools/gen-jwks.mjs` ✓
2. Set environment variables (see `server/auth/issuer/README.md`)
3. Start minting JWT tokens
