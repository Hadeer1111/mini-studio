import { Redis } from "@upstash/redis";

export const DAILY_IMAGE_LIMIT = 10;
export const DAILY_VIDEO_LIMIT = 5;

type LimitKind = "image" | "video";

const LIMITS: Record<LimitKind, number> = {
  image: DAILY_IMAGE_LIMIT,
  video: DAILY_VIDEO_LIMIT,
};

function getRedis() {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

function rateLimitKey(sessionId: string, kind: LimitKind): string {
  const date = new Date().toISOString().slice(0, 10);
  return `ratelimit:${kind}:${sessionId}:${date}`;
}

export async function checkRateLimit(
  sessionId: string,
  kind: LimitKind
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const key = rateLimitKey(sessionId, kind);
  const current = (await redis.get<number>(key)) ?? 0;
  const limit = LIMITS[kind];
  return {
    allowed: current < limit,
    remaining: Math.max(0, limit - current),
  };
}

export async function incrementRateLimit(
  sessionId: string,
  kind: LimitKind
): Promise<void> {
  const redis = getRedis();
  const key = rateLimitKey(sessionId, kind);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 60 * 60 * 24);
  await pipeline.exec();
}
