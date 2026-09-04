import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** A URL-safe random token. 32 bytes ≈ 43 characters. */
export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Tokens are stored hashed, never in plaintext.
 *
 * If someone reads your `sessions` table — a leaked backup, a SQL injection,
 * a curious teammate with database access — they still cannot sign in as
 * anyone, because the hash is not the cookie value.
 *
 * SHA-256 is right here (not bcrypt): these tokens are already 256 bits of
 * randomness, so there is nothing to brute-force. Slow hashing is for
 * low-entropy secrets like passwords.
 */
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time compare, for anywhere you compare secrets directly. */
export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
