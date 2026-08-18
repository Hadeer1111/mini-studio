"use client";

import { useState, useCallback, useEffect } from "react";
import PromptForm from "@/components/PromptForm";
import ImagePreview from "@/components/ImagePreview";
import JobStatus from "@/components/JobStatus";
import VideoPlayer from "@/components/VideoPlayer";
import { useJobPoller } from "@/hooks/useJobPoller";

type Stage = "prompt" | "preview" | "video_pending" | "video_ready";

interface StudioState {
  stage: Stage;
  jobId: string | null;
  imageUrl: string | null;
  prompt: string;
}

const INITIAL_STATE: StudioState = {
  stage: "prompt",
  jobId: null,
  imageUrl: null,
  prompt: "",
};

const LS_KEY = "mini-studio-job";

function loadPersistedJob(): StudioState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioState;
    if (parsed.stage === "video_pending" && parsed.jobId) {
      return parsed;
    }
  } catch {}
  return null;
}

function persistJob(state: StudioState) {
  if (typeof window === "undefined") return;
  if (state.stage === "video_pending" && state.jobId) {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(LS_KEY);
  }
}

export default function Home() {
  const [state, setState] = useState<StudioState>(INITIAL_STATE);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [bannerError, setBannerError] = useState("");

  useEffect(() => {
    const restored = loadPersistedJob();
    if (restored) setState(restored);
  }, []);

  useEffect(() => {
    persistJob(state);
  }, [state]);

  useEffect(() => {
    if (bannerError) {
      const t = setTimeout(() => setBannerError(""), 8000);
      return () => clearTimeout(t);
    }
  }, [bannerError]);

  const pollingJobId =
    state.stage === "video_pending" ? state.jobId : null;
  const { job, pollerStatus, elapsedSeconds, seedancePhase, retry } =
    useJobPoller(pollingJobId);

  useEffect(() => {
    if (pollerStatus === "done" && job?.videoUrl) {
      setState((prev) => ({ ...prev, stage: "video_ready" }));
    }
  }, [pollerStatus, job?.videoUrl]);

  const handleGenerated = useCallback(
    (jobId: string, imageUrl: string, prompt: string) => {
      setBannerError("");
      setState({ stage: "preview", jobId, imageUrl, prompt });
    },
    []
  );

  const handleRegenerate = useCallback(() => {
    setBannerError("");
    setState((prev) => ({ ...INITIAL_STATE, prompt: prev.prompt }));
  }, []);

  const handleAccept = useCallback(async () => {
    if (!state.jobId) return;
    setAcceptLoading(true);
    setBannerError("");

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: state.jobId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBannerError(
          data.error ?? "Failed to start video generation."
        );
        return;
      }

      setState((prev) => ({ ...prev, stage: "video_pending" }));
    } catch {
      setBannerError("Network error. Please check your connection.");
    } finally {
      setAcceptLoading(false);
    }
  }, [state.jobId]);

  const handleStartOver = useCallback(() => {
    setBannerError("");
    setState(INITIAL_STATE);
  }, []);

  const handleRetryVideo = useCallback(async () => {
    if (!state.jobId) return;
    setBannerError("");

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: state.jobId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBannerError(
          data.error ?? "Failed to restart video generation."
        );
        return;
      }

      setState((prev) => ({ ...prev, stage: "video_pending" }));
      retry();
    } catch {
      setBannerError("Network error. Please check your connection.");
    }
  }, [state.jobId, retry]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Mini Studio
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Describe a scene and turn it into a short video.
          </p>
        </div>

        {bannerError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-400">
            <span className="mt-0.5 shrink-0">&#9888;</span>
            <span className="flex-1">{bannerError}</span>
            <button
              onClick={() => setBannerError("")}
              className="shrink-0 text-red-500 hover:text-red-300"
            >
              &#10005;
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          {state.stage === "prompt" && (
            <PromptForm
              onGenerated={handleGenerated}
              initialPrompt={state.prompt}
            />
          )}

          {state.stage === "preview" && state.imageUrl && (
            <ImagePreview
              imageUrl={state.imageUrl}
              prompt={state.prompt}
              onAccept={handleAccept}
              onRegenerate={handleRegenerate}
              loading={acceptLoading}
            />
          )}

          {state.stage === "video_pending" && (
            <>
              {state.imageUrl && (
                <div className="mb-4 overflow-hidden rounded-lg border border-zinc-800 opacity-60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.imageUrl}
                    alt={state.prompt}
                    className="h-auto w-full"
                  />
                </div>
              )}
              <JobStatus
                phase={seedancePhase}
                elapsedSeconds={elapsedSeconds}
                status={
                  pollerStatus === "idle" ? "polling" : pollerStatus
                }
                error={job?.error}
                errorCategory={job?.errorCategory}
                onRetry={
                  pollerStatus === "failed" || pollerStatus === "timeout"
                    ? handleRetryVideo
                    : undefined
                }
              />
              <div className="mt-4 text-center">
                <button
                  onClick={handleStartOver}
                  className="text-xs text-zinc-600 underline underline-offset-2 transition hover:text-zinc-400"
                >
                  Cancel and start over
                </button>
              </div>
            </>
          )}

          {state.stage === "video_ready" && job?.videoUrl && (
            <VideoPlayer
              videoUrl={job.videoUrl}
              prompt={state.prompt}
              onStartOver={handleStartOver}
            />
          )}
        </div>
      </div>
    </div>
  );
}
