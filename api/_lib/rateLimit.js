/**
 * Rate Limiter — Upstash Redis with in-memory fallback
 *
 * In production with UPSTASH_REDIS_REST_URL set, uses Redis for persistent
 * distributed rate limiting across serverless cold starts.
 *
 * Without Redis, falls back to in-memory Map (per-invocation only).
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/* ── In-memory fallback ── */
const memStore = new Map();
let lastCleanup = Date.now();

function memCleanup(now) {
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;
  for (const [key, record] of memStore.entries()) {
    if (now - record.start > record.windowMs) memStore.delete(key);
  }
}

function memRateLimit(key, windowMs, max) {
  const now = Date.now();
  memCleanup(now);
  const record = memStore.get(key);

  if (!record || now - record.start > windowMs) {
    memStore.set(key, { start: now, count: 1, windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  record.count++;
  if (record.count > max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((windowMs - (now - record.start)) / 1000) };
  }

  return { allowed: true, remaining: max - record.count };
}

/* ── Upstash Redis ── */
async function upstashRateLimit(key, windowMs, max) {
  const windowSec = Math.ceil(windowMs / 1000);
  const now = Date.now();
  const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;

  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { cmd: 'INCR', args: [windowKey] },
        { cmd: 'EXPIRE', args: [windowKey, windowSec] },
      ]),
    });

    if (!res.ok) throw new Error('Upstash failed');
    const data = await res.json();
    const count = data[0]?.result || 1;

    if (count > max) {
      return { allowed: false, remaining: 0, retryAfter: windowSec };
    }
    return { allowed: true, remaining: max - count };
  } catch {
    // Fallback to in-memory on Redis failure
    return memRateLimit(key, windowMs, max);
  }
}

/* ── Public API ── */
export function rateLimit(key, { windowMs = 60000, max = 10 } = {}) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    // Async path — returns a promise
    return upstashRateLimit(key, windowMs, max);
  }
  // Sync fallback
  return memRateLimit(key, windowMs, max);
}

export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}
