import "server-only";

const BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";

function getHeaders(): HeadersInit {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error("ARK_API_KEY is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export interface CreateTaskResult {
  taskId: string;
}

export async function createVideoTask(
  imageUrl: string,
  prompt: string
): Promise<CreateTaskResult> {
  const res = await fetch(`${BASE_URL}/contents/generations/tasks`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "seedance-1-5-pro-251215",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: imageUrl },
          role: "first_frame",
        },
      ],
      duration: 10,
      resolution: "1080p",
      generate_audio: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Seedance create task failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const taskId = data?.id ?? data?.data?.id ?? data?.task_id;
  if (!taskId) {
    throw new Error(
      `Seedance returned no task ID: ${JSON.stringify(data).slice(0, 500)}`
    );
  }

  return { taskId };
}

export type SeedanceStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export interface TaskStatusResult {
  status: SeedanceStatus;
  videoUrl?: string;
  error?: string;
}

export async function getTaskStatus(
  taskId: string
): Promise<TaskStatusResult> {
  const res = await fetch(`${BASE_URL}/contents/generations/tasks/${taskId}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Seedance status check failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  const rawStatus: string = (
    data?.status ??
    data?.data?.status ??
    "unknown"
  ).toLowerCase();

  const status: SeedanceStatus =
    rawStatus === "succeeded" || rawStatus === "success"
      ? "succeeded"
      : rawStatus === "failed" || rawStatus === "failure"
        ? "failed"
        : rawStatus === "running" || rawStatus === "processing"
          ? "running"
          : rawStatus === "queued" || rawStatus === "pending" || rawStatus === "submitted"
            ? "queued"
            : rawStatus === "cancelled"
              ? "cancelled"
              : "unknown";

  const videoUrl =
    data?.content?.video_url ??
    data?.data?.content?.video_url ??
    data?.data?.response?.[0] ??
    undefined;

  const error =
    data?.error?.message ??
    data?.data?.error_message ??
    data?.error ??
    undefined;

  return { status, videoUrl, error };
}
