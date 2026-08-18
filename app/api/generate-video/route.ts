import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/kv";
import { createVideoTask } from "@/lib/seedance";
import { checkRateLimit, incrementRateLimit } from "@/lib/rate-limit";
import type { ErrorCategory } from "@/lib/types";

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id");
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!jobId) {
    return NextResponse.json(
      { error: "jobId is required." },
      { status: 400 }
    );
  }

  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  if (job.status !== "IMAGE_READY" && job.status !== "VIDEO_FAILED") {
    return NextResponse.json(
      { error: `Job is in status ${job.status}, cannot start video generation.` },
      { status: 409 }
    );
  }
  if (!job.imageUrl) {
    return NextResponse.json(
      { error: "Job has no image URL." },
      { status: 409 }
    );
  }

  const { allowed } = await checkRateLimit(sessionId, "video");
  if (!allowed) {
    return NextResponse.json(
      { error: "Daily video generation limit reached. Try again tomorrow." },
      { status: 429 }
    );
  }

  try {
    const { taskId } = await createVideoTask(job.imageUrl, job.prompt);

    await incrementRateLimit(sessionId, "video");

    await updateJob(jobId, {
      status: "VIDEO_PENDING",
      seedanceTaskId: taskId,
      videoStartedAt: Date.now(),
    });

    return NextResponse.json({
      jobId,
      status: "VIDEO_PENDING",
      seedanceTaskId: taskId,
    });
  } catch (err: unknown) {
    const { message, category } = categorizeError(err);

    await updateJob(jobId, {
      status: "VIDEO_FAILED",
      error: message,
      errorCategory: category,
    }).catch(() => {});

    return NextResponse.json(
      { error: message, errorCategory: category },
      { status: 502 }
    );
  }
}

function categorizeError(err: unknown): {
  message: string;
  category: ErrorCategory;
} {
  const raw = err instanceof Error ? err.message : String(err);

  if (
    raw.includes("content_policy") ||
    raw.includes("safety") ||
    raw.includes("moderation")
  ) {
    return {
      message: "Content was rejected by moderation. Try a different image.",
      category: "content_moderation",
    };
  }

  if (raw.includes("timeout") || raw.includes("ETIMEDOUT")) {
    return {
      message: "Video generation request timed out. Please try again.",
      category: "timeout",
    };
  }

  return {
    message: "Failed to start video generation. Please try again.",
    category: "api_error",
  };
}
