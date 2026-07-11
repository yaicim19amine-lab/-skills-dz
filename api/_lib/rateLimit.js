const rateLimits = new Map();
let lastCleanup = Date.now();

function cleanup(now) {
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;
  for (const [key, record] of rateLimits.entries()) {
    if (now - record.start > record.windowMs) rateLimits.delete(key);
  }
}

export function rateLimit(key, { windowMs = 60000, max = 10 } = {}) {
  const now = Date.now();
  cleanup(now);
  const record = rateLimits.get(key);

  if (!record || now - record.start > windowMs) {
    rateLimits.set(key, { start: now, count: 1, windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  record.count++;
  if (record.count > max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((windowMs - (now - record.start)) / 1000) };
  }

  return { allowed: true, remaining: max - record.count };
}

export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}
