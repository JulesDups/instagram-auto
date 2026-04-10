import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export type DraftAction = "publish" | "reject";

interface TokenPayload {
  draftId: string;
  action: DraftAction;
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
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payload: string): string {
  return b64urlEncode(
    createHmac("sha256", env().DRAFT_TOKEN_SECRET).update(payload).digest(),
  );
}

export function createDraftToken(
  draftId: string,
  action: DraftAction,
  ttlSeconds = 60 * 60 * 24 * 7,
): string {
  const payload: TokenPayload = {
    draftId,
    action,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyDraftToken(token: string): TokenPayload {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("Malformed token");

  const expected = sign(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(b64urlDecode(body).toString("utf-8")) as TokenPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return payload;
}
