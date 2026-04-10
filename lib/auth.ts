import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const COOKIE_NAME = "dashboard-session";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

interface SessionPayload {
  iat: number;
  exp: number;
}

function b64urlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const padded = input.padEnd(
    input.length + ((4 - (input.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payload: string): string {
  return b64urlEncode(
    createHmac("sha256", env().DASHBOARD_COOKIE_SECRET)
      .update(payload)
      .digest(),
  );
}

export function createSessionCookie(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    iat: now,
    exp: now + COOKIE_MAX_AGE_SECONDS,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySessionCookie(token: string | undefined): boolean {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;

  const expected = sign(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const payload = JSON.parse(
      b64urlDecode(body).toString("utf-8"),
    ) as SessionPayload;
    if (typeof payload.exp !== "number") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export function comparePassword(input: string): boolean {
  const expected = env().DASHBOARD_PASSWORD;
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}
