"use client";

interface VideoPlayerProps {
  videoUrl: string;
  prompt: string;
  onStartOver: () => void;
}

export default function VideoPlayer({
  videoUrl,
  prompt,
  onStartOver,
}: VideoPlayerProps) {
  return (
    <div className="w-full space-y-4">
      <div className="overflow-hidden rounded-xl border border-zinc-700">
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          playsInline
          className="h-auto w-full"
        />
      </div>

      <p className="text-center text-xs text-zinc-500 italic">
        &ldquo;{prompt}&rdquo;
      </p>

      <div className="flex gap-3">
        <button
          onClick={onStartOver}
          className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
        >
          New Video
        </button>
        <a
          href={videoUrl}
          download
          className="flex flex-1 items-center justify-center rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-white"
        >
          Download
        </a>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Video link expires in 24 hours.
      </p>
    </div>
  );
}
