import "server-only";
import { put } from "@vercel/blob";

export async function uploadImageFromBase64(
  b64: string,
  filename: string
): Promise<string> {
  const buffer = Buffer.from(b64, "base64");
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "image/png",
  });
  return blob.url;
}
