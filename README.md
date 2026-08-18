# Mini Studio

A Next.js app that turns a text prompt into a short video.

1. Describe a scene in plain text
2. An image is generated from your prompt (OpenAI gpt-image-1)
3. Review the image — regenerate or accept
4. The accepted image is turned into a 10-second 1080p video with audio (Seedance via BytePlus ModelArk)
5. Download the finished video

## Setup

```bash
npm install
cp .env.local.example .env.local
# Fill in the values in .env.local (see below)
npm run dev
```

### Required environment variables

| Variable | Source |
|----------|--------|
| `GATE_PASSWORD` | Shared password for the login gate |
| `COOKIE_SECRET` | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) |
| `ARK_API_KEY` | [BytePlus ModelArk console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey) |
| `KV_REST_API_URL` | Vercel KV / Upstash integration |
| `KV_REST_API_TOKEN` | Vercel KV / Upstash integration |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob integration |

### Deploy to Vercel

1. Push this repo to GitHub
2. Import into Vercel
3. Link a KV store and Blob store in the Vercel dashboard
4. Add the remaining env vars (GATE_PASSWORD, COOKIE_SECRET, OPENAI_API_KEY, ARK_API_KEY)
5. Deploy

## Tech stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 4
- Upstash Redis (via Vercel KV integration) for job state
- Vercel Blob for image persistence
- OpenAI gpt-image-1 for image generation
- BytePlus ModelArk / Seedance 1.5 Pro for video generation
