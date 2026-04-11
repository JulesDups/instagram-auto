import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { DraftSchema } from "@/lib/content";
import { createDraft } from "@/lib/repos/drafts";
import { sendDraftReviewEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = req.headers.get("x-intake-secret");
  if (!secret || secret !== env().INTAKE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = DraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid draft", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const draft = parsed.data;

  try {
    await createDraft(draft);
  } catch (err) {
    console.error("[intake] createDraft failed:", err);
    return NextResponse.json({ error: "persistence failed" }, { status: 500 });
  }

  await sendDraftReviewEmail(draft);

  return NextResponse.json({
    ok: true,
    draftId: draft.id,
    slides: draft.slides.length,
  });
}
