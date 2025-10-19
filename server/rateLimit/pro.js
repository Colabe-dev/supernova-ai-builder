import Redis from 'ioredis';

let redis;
export function getRedis(){
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  const sentinels = process.env.REDIS_SENTINEL;
  const cluster = process.env.REDIS_CLUSTER_NODES;

  if (cluster){
    const nodes = String(cluster).split(',').map(s => {
      const [host, port] = s.split(':');
      return { host, port: Number(port || 6379) };
    });
    redis = new Redis.Cluster(nodes, { scaleReads: 'slave', maxRetriesPerRequest: 1 });
    return redis;
  }
  if (sentinels){
    const list = String(sentinels).split(',').map(s => {
      const [host, port] = s.split(':');
      return { host, port: Number(port || 26379) };
    });
    const name = process.env.REDIS_MASTER || 'mymaster';
    redis = new Redis({ sentinels: list, name, maxRetriesPerRequest: 1 });
    return redis;
  }
  if (url){
    redis = new Redis(url, { maxRetriesPerRequest: 1 });
    return redis;
  }
  return null;
}

const LUA = `
local key = KEYS[1]
local max = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = redis.call("INCR", key)
if current == 1 then
  redis.call("EXPIRE", key, ttl)
end
if current > max then
  return {0, redis.call("TTL", key)}
end
return {1, redis.call("TTL", key)}
`;

let sha;
async function script(redis){
  if (!sha){
    try { sha = await redis.script('LOAD', LUA) } catch (_e) {}
  }
  return sha;
}

export function rateLimit({ windowMs = 60000, max = 60, keyFn } = {}){
  const r = getRedis();
  if (!r) {
    // fallback memory
    const buckets = new Map();
    return (req, res, next) => {
      const now = Date.now();
      const key = (keyFn ? keyFn(req) : req.ip) || 'global';
      let b = buckets.get(key);
      if (!b || b.resetAt < now) { b = { count: 0, resetAt: now + windowMs }; buckets.set(key, b); }
      b.count += 1;
      if (b.count > max) {
        const retry = Math.max(0, Math.ceil((b.resetAt - now)/1000));
        res.setHeader('Retry-After', String(retry));
        return res.status(429).json({ error: 'rate_limited', retryAfter: retry });
      }
      next();
    };
  }
  const ttl = Math.max(1, Math.floor(windowMs/1000));
  return async (req, res, next) => {
    try {
      const key = (keyFn ? keyFn(req) : req.ip) || 'global';
      const bucket = `rl:${key}`;
      const s = await script(r);
      let ok, remain;
      if (s) {
        const out = await r.evalsha(s, 1, bucket, String(max), String(ttl));
        ok = out[0] === 1; remain = out[1];
      } else {
        // Fallback to simple incr/expire
        const count = await r.incr(bucket);
        if (count === 1) await r.expire(bucket, ttl);
        ok = count <= max; remain = await r.ttl(bucket);
      }
      if (!ok) {
        res.setHeader('Retry-After', String(remain));
        return res.status(429).json({ error: 'rate_limited', retryAfter: remain });
      }
      next();
    } catch (_e) { next(); }
  };
}
