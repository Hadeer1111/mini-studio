"use client";

interface JobStatusProps {
  phase: string;
  elapsedSeconds: number;
  status: "polling" | "done" | "failed" | "timeout";
  error?: string;
  errorCategory?: string;
  onRetry?: () => void;
}

export default function JobStatus({
  phase,
  elapsedSeconds,
  status,
  error,
  errorCategory,
  onRetry,
}: JobStatusProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {status === "polling" && (
        <>
          <div className="relative h-12 w-12">
            <svg
              className="h-12 w-12 animate-spin text-zinc-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-300">{phase}</p>
          <p className="font-mono text-2xl tabular-nums text-zinc-400">
            {timeStr}
          </p>
          <p className="text-xs text-zinc-600">
            Video generation typically takes 2-5 minutes. You can leave this
            page open.
          </p>
        </>
      )}

      {status === "failed" && (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-950/50">
            <span className="text-xl text-red-400">!</span>
          </div>
          <p className="text-sm font-medium text-red-400">{phase}</p>
          {error && (
            <p className="max-w-sm text-center text-xs text-zinc-500">
              {errorCategory === "content_moderation"
                ? error
                : `${error} (after ${timeStr})`}
            </p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"
            >
              Retry Video Generation
            </button>
          )}
        </>
      )}

      {status === "timeout" && (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-950/50">
            <span className="text-xl text-amber-400">&#8987;</span>
          </div>
          <p className="text-sm font-medium text-amber-400">{phase}</p>
          <p className="max-w-sm text-center text-xs text-zinc-500">
            The video is taking longer than expected. It may still complete on
            the server. You can retry or check back later.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"
            >
              Resume Polling
            </button>
          )}
        </>
      )}
    </div>
  );
}
