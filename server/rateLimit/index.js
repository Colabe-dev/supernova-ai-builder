import Redis from 'ioredis';
let client;
function getRedis(){
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  client = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
  client.on('error', () => {});
  return client;
}
export function rateLimit({ windowMs = 60_000, max = 60, keyFn } = {}){
  const redis = getRedis();
  if (!redis) {
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
      const multi = redis.multi();
      multi.incr(bucket);
      multi.expire(bucket, ttl, 'NX');
      const [count] = await multi.exec().then(r => r.map(x => x[1]));
      if (Number(count) > max) { res.setHeader('Retry-After', String(ttl)); return res.status(429).json({ error: 'rate_limited', retryAfter: ttl }); }
      next();
    } catch (_e) { next(); }
  };
}
