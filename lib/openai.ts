import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function generateImage(
  prompt: string
): Promise<{ b64: string; revisedPrompt?: string }> {
  const openai = getClient();
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  const first = response.data?.[0];
  if (!first?.b64_json) {
    throw new Error("OpenAI returned no image data");
  }

  return {
    b64: first.b64_json,
    revisedPrompt: first.revised_prompt ?? undefined,
  };
}
