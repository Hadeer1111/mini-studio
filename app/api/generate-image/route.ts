import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { generateImage } from "@/lib/openai";
import { uploadImageFromBase64 } from "@/lib/blob";
import { createJob } from "@/lib/kv";
import { checkRateLimit, incrementRateLimit } from "@/lib/rate-limit";
import type { Job, ErrorCategory } from "@/lib/types";

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id");
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 1000) {
    return NextResponse.json(
      { error: "Prompt is required (max 1000 characters)." },
      { status: 400 }
    );
  }

  const { allowed, remaining } = await checkRateLimit(sessionId, "image");
  if (!allowed) {
    return NextResponse.json(
      { error: "Daily image generation limit reached. Try again tomorrow." },
      { status: 429 }
    );
  }

  const jobId = nanoid(12);

  try {
    const { b64 } = await generateImage(prompt);
    const imageUrl = await uploadImageFromBase64(b64, `images/${jobId}.png`);

    await incrementRateLimit(sessionId, "image");

    const job: Job = {
      id: jobId,
      prompt,
      status: "IMAGE_READY",
      imageUrl,
      createdAt: Date.now(),
    };
    await createJob(job);

    return NextResponse.json({
      jobId: job.id,
      imageUrl: job.imageUrl,
      remaining: remaining - 1,
    });
  } catch (err: unknown) {
    const { message, category } = categorizeError(err);

    const job: Job = {
      id: jobId,
      prompt,
      status: "IMAGE_FAILED",
      error: message,
      errorCategory: category,
      createdAt: Date.now(),
    };
    await createJob(job).catch(() => {});

    const rawDetail = err instanceof Error ? err.message : String(err);
    const status = category === "content_moderation" ? 422 : 502;
    return NextResponse.json(
      { error: message, errorCategory: category, jobId, detail: rawDetail },
      { status }
    );
  }
}

function categorizeError(err: unknown): {
  message: string;
  category: ErrorCategory;
} {
  const raw = err instanceof Error ? err.message : String(err);

  if (
    raw.includes("content_policy_violation") ||
    raw.includes("safety") ||
    raw.includes("content policy")
  ) {
    return {
      message:
        "Your prompt was rejected by content moderation. Try rephrasing it.",
      category: "content_moderation",
    };
  }

  if (raw.includes("timeout") || raw.includes("ETIMEDOUT")) {
    return {
      message: "The image generation request timed out. Please try again.",
      category: "timeout",
    };
  }

  return {
    message: "Image generation failed. Please try again.",
    category: "api_error",
  };
}
