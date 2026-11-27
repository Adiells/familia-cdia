import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createRateLimiter } from './rate-limit.mjs';

const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
const adminTokenTtlMs = 12 * 60 * 60 * 1000;

export const isAdminAuthConfigured = Boolean(adminPassword);

const passwordDigest = isAdminAuthConfigured
  ? createHash('sha256').update(adminPassword, 'utf8').digest()
  : null;

const tokenSigningKey = isAdminAuthConfigured
  ? createHash('sha256')
      .update(`familia-cdia-admin-token:${process.env.ADMIN_TOKEN_SECRET || adminPassword}`, 'utf8')
      .digest()
  : null;

export const checkAdminLoginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

export function verifyAdminPassword(candidate) {
  if (!isAdminAuthConfigured || !passwordDigest || typeof candidate !== 'string' || !candidate) {
    return false;
  }
  const candidateDigest = createHash('sha256').update(candidate, 'utf8').digest();
  return timingSafeEqual(candidateDigest, passwordDigest);
}

export function issueAdminToken() {
  if (!isAdminAuthConfigured || !tokenSigningKey) {
    throw new Error('Admin authentication is not configured.');
  }
  const nowMs = Date.now();
  const expiresAtMs = nowMs + adminTokenTtlMs;
  const payload = {
    sub: 'admin',
    iat: Math.floor(nowMs / 1000),
    exp: Math.floor(expiresAtMs / 1000),
    jti: randomUUID(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', tokenSigningKey).update(encodedPayload).digest('base64url');
  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

export function verifyAdminToken(authHeader) {
  if (!isAdminAuthConfigured || !tokenSigningKey || typeof authHeader !== 'string') {
    return false;
  }
  const match = authHeader.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return false;

  const parts = match[1].split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [encodedPayload, providedSignature] = parts;

  const expectedDigest = createHmac('sha256', tokenSigningKey).update(encodedPayload).digest();
  let providedDigest;
  try {
    providedDigest = Buffer.from(providedSignature, 'base64url');
  } catch {
    return false;
  }
  if (
    providedDigest.length !== expectedDigest.length ||
    providedDigest.toString('base64url') !== providedSignature ||
    !timingSafeEqual(providedDigest, expectedDigest)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object' || payload.sub !== 'admin') return false;
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
