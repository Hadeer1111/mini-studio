export const JOB_STATUS = {
  IMAGE_PENDING: "IMAGE_PENDING",
  IMAGE_READY: "IMAGE_READY",
  IMAGE_FAILED: "IMAGE_FAILED",
  VIDEO_PENDING: "VIDEO_PENDING",
  VIDEO_READY: "VIDEO_READY",
  VIDEO_FAILED: "VIDEO_FAILED",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export type ErrorCategory = "content_moderation" | "timeout" | "api_error";

export interface Job {
  id: string;
  prompt: string;
  status: JobStatus;
  imageUrl?: string;
  seedanceTaskId?: string;
  videoUrl?: string;
  videoStartedAt?: number;
  error?: string;
  errorCategory?: ErrorCategory;
  createdAt: number;
}
