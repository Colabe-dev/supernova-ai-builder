# S4 — Redis Cluster/Sentinel Rate Limiting

Production-grade rate limiting that supports:
- Single Redis (`REDIS_URL=redis://host:6379`)
- Sentinel (`REDIS_SENTINEL=host1:26379,host2:26379` + `REDIS_MASTER=mymaster`)
- Cluster (`REDIS_CLUSTER_NODES=host1:6379,host2:6379,...`)

Falls back to in-memory if Redis is unavailable.

## Install
```bash
npm i ioredis
```

## Env
```
REDIS_URL=redis://localhost:6379                       # single
# or
REDIS_SENTINEL=host1:26379,host2:26379
REDIS_MASTER=mymaster
# or
REDIS_CLUSTER_NODES=host1:6379,host2:6379
```

## Use
```js
import { rateLimit } from './rateLimit/pro.js';
app.use('/api/entitlements', rateLimit({ windowMs: 60000, max: 120 }));
```
