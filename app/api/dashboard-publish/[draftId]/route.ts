import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionCookie } from "@/lib/auth";
import { publishDraft, AlreadyPublishedError } from "@/lib/publish";

export const runtime = "nodejs";
export const maxDuration = 300;

function htmlPage(title: string, body: string, status: number) {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>
      body{font-family:-apple-system,Segoe UI,sans-serif;background:#FBFAF8;color:#1C343A;margin:0;padding:60px 24px;}
      .wrap{max-width:560px;margin:0 auto;background:white;border:1px solid rgba(28,52,58,0.1);border-radius:16px;padding:40px;}
      h1{margin:0 0 16px;font-size:24px;}
      pre{background:#f5f5f5;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;line-height:1.5;}
      a{color:#D4A374;}
      .ok{color:#10b981;}
      .err{color:#BF2C23;}
      code{font-family:ui-monospace,monospace;font-size:13px;background:rgba(28,52,58,0.05);padding:2px 6px;border-radius:4px;}
    </style></head><body><div class="wrap">${body}<p style="margin-top:32px;"><a href="/library">← Retour à la library</a></p></div></body></html>`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ draftId: string }> },
) {
  // Auth check : même cookie que pour le reste du dashboard.
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);

  if (!verifySessionCookie(cookie)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { draftId } = await ctx.params;

  try {
    const result = await publishDraft(draftId);
    return htmlPage(
      "Publié",
      `<h1 class="ok">Publié</h1><p>Draft <code>${draftId}</code> publié sur Instagram.</p><p>Media ID : <code>${result.mediaId}</code></p><p><a href="https://www.instagram.com/julesd.dev/" target="_blank" rel="noopener noreferrer">Voir sur Instagram →</a></p>`,
      200,
    );
  } catch (err) {
    if (err instanceof AlreadyPublishedError) {
      return htmlPage(
        "Déjà publié",
        `<h1>Déjà publié</h1><p>Le draft <code>${draftId}</code> a déjà été publié sur Instagram.</p><p>Media ID existant : <code>${err.mediaId}</code></p>`,
        409,
      );
    }
    const msg = err instanceof Error ? err.message : "unknown error";
    return htmlPage(
      "Échec de publication",
      `<h1 class="err">Échec</h1><p>Impossible de publier le draft <code>${draftId}</code>.</p><pre>${msg.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c)}</pre>`,
      500,
    );
  }
}
