import { Redis } from "@upstash/redis";
import type { Job } from "./types";

const JOB_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getRedis() {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

function jobKey(id: string) {
  return `job:${id}`;
}

export async function createJob(job: Job): Promise<void> {
  const redis = getRedis();
  await redis.set(jobKey(job.id), JSON.stringify(job), {
    ex: JOB_TTL_SECONDS,
  });
}

export async function getJob(id: string): Promise<Job | null> {
  const redis = getRedis();
  const data = await redis.get<string>(jobKey(id));
  if (!data) return null;
  return typeof data === "string"
    ? JSON.parse(data)
    : (data as unknown as Job);
}

export async function updateJob(
  id: string,
  updates: Partial<Job>
): Promise<Job | null> {
  const redis = getRedis();
  const existing = await getJob(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await redis.set(jobKey(id), JSON.stringify(updated), {
    ex: JOB_TTL_SECONDS,
  });
  return updated;
}
