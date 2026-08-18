import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const COOKIE_NAME = "ms_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("COOKIE_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export function getGatePassword(): string {
  const pw = process.env.GATE_PASSWORD;
  if (!pw) throw new Error("GATE_PASSWORD is not set");
  return pw;
}

export interface SessionPayload extends JWTPayload {
  sid: string;
}

export async function createSessionToken(sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}
