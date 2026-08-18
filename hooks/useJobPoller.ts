"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Job } from "@/lib/types";

const INITIAL_INTERVAL_MS = 10_000;
const LONG_INTERVAL_MS = 15_000;
const LONG_INTERVAL_THRESHOLD_MS = 60_000;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 minutes

type PollerStatus = "idle" | "polling" | "done" | "failed" | "timeout";

interface UseJobPollerResult {
  job: Job | null;
  pollerStatus: PollerStatus;
  elapsedSeconds: number;
  seedancePhase: string;
  retry: () => void;
}

export function useJobPoller(jobId: string | null): UseJobPollerResult {
  const [job, setJob] = useState<Job | null>(null);
  const [pollerStatus, setPollerStatus] = useState<PollerStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    intervalRef.current = null;
    timerRef.current = null;
  }, []);

  const poll = useCallback(async () => {
    if (!jobId) return;

    const elapsed = Date.now() - startTimeRef.current;
    if (elapsed > MAX_POLL_DURATION_MS) {
      setPollerStatus("timeout");
      cleanup();
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;

      const data: Job & { elapsedSeconds?: number; seedanceStatus?: string } =
        await res.json();
      setJob(data);

      if (data.elapsedSeconds != null) {
        setElapsedSeconds(data.elapsedSeconds);
      }

      if (data.status === "VIDEO_READY") {
        setPollerStatus("done");
        cleanup();
      } else if (data.status === "VIDEO_FAILED") {
        setPollerStatus("failed");
        cleanup();
      }
    } catch {
      // Network error -- keep polling, it might recover
    }
  }, [jobId, cleanup]);

  const startPolling = useCallback(() => {
    if (!jobId) return;
    cleanup();

    startTimeRef.current = Date.now();
    setPollerStatus("polling");
    setElapsedSeconds(0);

    poll();

    timerRef.current = setInterval(() => {
      const s = Math.round((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(s);
    }, 1000);

    let currentInterval = INITIAL_INTERVAL_MS;
    const scheduleNext = () => {
      intervalRef.current = setTimeout(() => {
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed > LONG_INTERVAL_THRESHOLD_MS) {
          currentInterval = LONG_INTERVAL_MS;
        }
        poll().then(() => {
          if (intervalRef.current !== null) {
            scheduleNext();
          }
        });
      }, currentInterval) as unknown as ReturnType<typeof setInterval>;
    };
    scheduleNext();
  }, [jobId, poll, cleanup]);

  useEffect(() => {
    if (jobId) {
      startPolling();
    }
    return cleanup;
  }, [jobId, startPolling, cleanup]);

  const retry = useCallback(() => {
    retryCountRef.current += 1;
    startPolling();
  }, [startPolling]);

  const seedancePhase =
    pollerStatus === "timeout"
      ? "Timed out waiting for video"
      : pollerStatus === "failed"
        ? "Video generation failed"
        : pollerStatus === "done"
          ? "Video ready!"
          : elapsedSeconds < 30
            ? "Starting video generation..."
            : elapsedSeconds < 90
              ? "Generating video..."
              : "Almost there, hang tight...";

  return { job, pollerStatus, elapsedSeconds, seedancePhase, retry };
}
