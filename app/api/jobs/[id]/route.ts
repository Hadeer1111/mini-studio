import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/kv";
import { getTaskStatus } from "@/lib/seedance";
import type { ErrorCategory } from "@/lib/types";

// Known limitation (v1): if the client stops polling (tab closed, 10-minute
// timeout) but Seedance later completes the job, the result stays in KV but
// has no delivery path back to the user. A future version could add a
// "resume job" page or webhook receiver.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionId = request.headers.get("x-session-id");
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status === "VIDEO_PENDING" && job.seedanceTaskId) {
    try {
      const result = await getTaskStatus(job.seedanceTaskId);

      if (result.status === "succeeded" && result.videoUrl) {
        await updateJob(id, {
          status: "VIDEO_READY",
          videoUrl: result.videoUrl,
        });
        return NextResponse.json({
          ...job,
          status: "VIDEO_READY",
          videoUrl: result.videoUrl,
          elapsedSeconds: elapsedSince(job.videoStartedAt),
        });
      }

      if (
        result.status === "failed" ||
        result.status === "cancelled"
      ) {
        const { message, category } = categorizeVideoError(
          result.error ?? result.status
        );
        await updateJob(id, {
          status: "VIDEO_FAILED",
          error: message,
          errorCategory: category,
        });
        return NextResponse.json({
          ...job,
          status: "VIDEO_FAILED",
          error: message,
          errorCategory: category,
          elapsedSeconds: elapsedSince(job.videoStartedAt),
        });
      }

      return NextResponse.json({
        ...job,
        seedanceStatus: result.status,
        elapsedSeconds: elapsedSince(job.videoStartedAt),
      });
    } catch {
      return NextResponse.json({
        ...job,
        elapsedSeconds: elapsedSince(job.videoStartedAt),
      });
    }
  }

  return NextResponse.json({
    ...job,
    elapsedSeconds: elapsedSince(job.videoStartedAt),
  });
}

function elapsedSince(startMs?: number): number | null {
  if (!startMs) return null;
  return Math.round((Date.now() - startMs) / 1000);
}

function categorizeVideoError(raw: string): {
  message: string;
  category: ErrorCategory;
} {
  const lower = raw.toLowerCase();

  if (
    lower.includes("content_policy") ||
    lower.includes("safety") ||
    lower.includes("moderation")
  ) {
    return {
      message: "Video was rejected by content moderation.",
      category: "content_moderation",
    };
  }

  if (lower.includes("timeout") || lower.includes("expired")) {
    return {
      message: "Video generation timed out on the provider side.",
      category: "timeout",
    };
  }

  return {
    message: `Video generation failed: ${raw.slice(0, 200)}`,
    category: "api_error",
  };
}
