import { NextResponse } from "next/server";
import { verifyDraftToken } from "@/lib/tokens";
import { publishDraft } from "@/lib/publish";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  let payload;
  try {
    payload = verifyDraftToken(token);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "invalid token" },
      { status: 401 },
    );
  }

  if (payload.action !== "publish") {
    return NextResponse.json({ error: "wrong action" }, { status: 400 });
  }

  try {
    const result = await publishDraft(payload.draftId);
    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;"><h1>Publié</h1><p>Draft <strong>${payload.draftId}</strong> publié avec succès.</p><p>Media ID Instagram : <code>${result.mediaId}</code></p></body></html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;"><h1>Échec</h1><p>Draft <strong>${payload.draftId}</strong> n'a pas pu être publié.</p><pre style="background:#fee;padding:12px;border-radius:8px;white-space:pre-wrap;">${msg}</pre></body></html>`,
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}
