import { getStore } from '@netlify/blobs';

const store = getStore({ name: 'thulla-rate-limit', consistency: 'strong' });
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const AUTH_MAX_REQUESTS = 10;

export async function rateLimit(key: string, authRoute = false) {
  const now = Date.now();
  const bucketKey = `bucket:${key}`;
  const current = await store.get(bucketKey, { type: 'json' }) as { start: number; count: number } | null;
  const limit = authRoute ? AUTH_MAX_REQUESTS : MAX_REQUESTS;
  const bucket = !current || now - current.start >= WINDOW_MS
    ? { start: now, count: 0 }
    : current;
  if (bucket.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.start + WINDOW_MS - now) / 1000)) };
  }
  bucket.count += 1;
  await store.setJSON(bucketKey, bucket);
  return { allowed: true, retryAfter: 0 };
}

export function clientKey(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-nf-client-connection-ip') || 'unknown';
}
