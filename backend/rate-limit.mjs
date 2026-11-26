export function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0 && forwarded[0].trim()) {
    return forwarded[0].split(',')[0].trim();
  }
  return request.socket?.remoteAddress || 'unknown';
}

export function createRateLimiter({ windowMs = 60 * 60 * 1000, maxRequests = 20, maxEntries = 1000 } = {}) {
  const hitsByIp = new Map();

  return function checkRateLimit(request) {
    const now = Date.now();
    const ip = getClientIp(request);
    const cutoff = now - windowMs;

    if (hitsByIp.size > maxEntries) {
      for (const [key, timestamps] of hitsByIp.entries()) {
        const active = timestamps.filter((ts) => ts > cutoff);
        if (active.length === 0) hitsByIp.delete(key);
        else hitsByIp.set(key, active);
      }
    }

    const timestamps = (hitsByIp.get(ip) || []).filter((ts) => ts > cutoff);
    if (timestamps.length >= maxRequests) {
      hitsByIp.set(ip, timestamps);
      const retryAfterSeconds = Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }
    timestamps.push(now);
    hitsByIp.set(ip, timestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}
