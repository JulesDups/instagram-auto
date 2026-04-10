import "server-only";
import { Resend } from "resend";
import { env } from "./env";
import { createDraftToken } from "./tokens";
import type { Draft } from "./content";
import { themeLabel } from "./content";

let _resend: Resend | null = null;
function resend(): Resend {
  if (!_resend) _resend = new Resend(env().RESEND_API_KEY);
  return _resend;
}

export async function sendDraftReviewEmail(draft: Draft): Promise<void> {
  const base = env().PUBLIC_BASE_URL;
  const publishToken = createDraftToken(draft.id, "publish");
  const rejectToken = createDraftToken(draft.id, "reject");

  const previewUrl = `${base}/preview/${draft.id}`;
  const publishUrl = `${base}/api/publish?token=${publishToken}`;
  const rejectUrl = `${base}/api/reject?token=${rejectToken}`;

  const slidePreviews = draft.slides
    .map((slide, i) => {
      const imgUrl = `${base}/api/render/${draft.id}/${i}`;
      return `<tr><td style="padding:8px;"><img src="${imgUrl}" width="320" height="320" style="border-radius:8px;border:1px solid #e5e7eb;display:block;" alt="Slide ${i + 1}"/></td></tr>`;
    })
    .join("");

  const html = `
<!doctype html>
<html lang="fr"><body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${themeLabel(draft.theme)}</div>
    <h1 style="font-size:22px;margin:8px 0 16px;">Nouveau draft à valider</h1>
    <p style="font-size:14px;color:#475569;line-height:1.6;">Draft <strong>${draft.id}</strong> généré, ${draft.slides.length} slides. Aperçu :</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">${slidePreviews}</table>
    <h2 style="font-size:14px;margin:24px 0 8px;color:#475569;">Caption</h2>
    <pre style="font-family:inherit;background:#f1f5f9;padding:12px;border-radius:8px;font-size:13px;white-space:pre-wrap;line-height:1.5;">${escapeHtml(draft.caption)}</pre>
    <div style="display:flex;gap:12px;margin-top:24px;">
      <a href="${publishUrl}" style="background:#0f172a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Publier maintenant</a>
      <a href="${rejectUrl}" style="background:#fee2e2;color:#991b1b;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Rejeter</a>
    </div>
    <p style="margin-top:24px;font-size:12px;color:#94a3b8;">Aperçu HTML : <a href="${previewUrl}" style="color:#64748b;">${previewUrl}</a></p>
  </div>
</body></html>`;

  await resend().emails.send({
    from: env().EMAIL_FROM,
    to: env().EMAIL_TO,
    subject: `[IG Draft] ${draft.slides[0]?.title ?? draft.id}`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
