import { NextResponse } from "next/server";
import { verifyDraftToken } from "@/lib/tokens";
import { getDraft, setDraftStatus } from "@/lib/repos/drafts";

export const runtime = "nodejs";

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

  if (payload.action !== "reject") {
    return NextResponse.json({ error: "wrong action" }, { status: 400 });
  }

  const draft = await getDraft(payload.draftId);
  if (!draft) {
    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;"><h1>Draft introuvable</h1><p>Draft <strong>${payload.draftId}</strong> n'existe pas.</p></body></html>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  await setDraftStatus(payload.draftId, { status: "rejected" });

  return new Response(
    `<html><body style="font-family:sans-serif;padding:40px;"><h1>Rejeté</h1><p>Draft <strong>${payload.draftId}</strong> rejeté. Aucune publication n'a eu lieu.</p></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
