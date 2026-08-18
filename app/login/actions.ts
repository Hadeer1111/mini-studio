"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import {
  getGatePassword,
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";

export async function login(
  _prevState: { error: string },
  formData: FormData
) {
  const password = formData.get("password");

  if (typeof password !== "string" || !password) {
    return { error: "Password is required." };
  }

  if (password !== getGatePassword()) {
    return { error: "Incorrect password." };
  }

  const sessionId = nanoid();
  const token = await createSessionToken(sessionId);
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName(), token, sessionCookieOptions());

  redirect("/");
}
