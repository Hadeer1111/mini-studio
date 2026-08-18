"use client";

import Image from "next/image";

interface ImagePreviewProps {
  imageUrl: string;
  prompt: string;
  onAccept: () => void;
  onRegenerate: () => void;
  loading?: boolean;
}

export default function ImagePreview({
  imageUrl,
  prompt,
  onAccept,
  onRegenerate,
  loading,
}: ImagePreviewProps) {
  return (
    <div className="w-full space-y-4">
      <div className="overflow-hidden rounded-xl border border-zinc-700">
        <Image
          src={imageUrl}
          alt={prompt}
          width={1024}
          height={1024}
          className="h-auto w-full"
          unoptimized
        />
      </div>

      <p className="text-center text-xs text-zinc-500 italic">
        &ldquo;{prompt}&rdquo;
      </p>

      <div className="flex gap-3">
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40"
        >
          Regenerate
        </button>
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-40"
        >
          {loading ? "Starting video..." : "Accept & Make Video"}
        </button>
      </div>
    </div>
  );
}
