/** Fixed-window in-memory rate limiter. Single-instance deployments only;
 * swap for a shared store when the app scales horizontally. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export class RateLimitError extends Error {
  readonly code = 'RATE_LIMITED';
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('Too many requests. Please try again later.');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function rateLimit(key: string, maxRequests: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > maxRequests) {
    throw new RateLimitError(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}
