import { notFound } from "next/navigation";
import { buildFullCaption } from "@/lib/content";
import { getDraft } from "@/lib/repos/drafts";
import { formatRelativeFrench } from "@/lib/stats";
import { PillarBadge } from "@/components/pillar-badge";
import { PublishButton } from "@/components/publish-button";
import { RepublishButton } from "@/components/republish-button";
import { PreviewSlideGrid, EditDraftButton } from "./preview-actions";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const draft = await getDraft(draftId);
  if (!draft) notFound();

  const isPublished = draft.status === "published";
  const isRejected = draft.status === "rejected";

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <PillarBadge theme={draft.theme} />
          <h1 className="mt-3 text-3xl font-bold text-hg-ink">Draft {draft.id}</h1>
          <p className="mt-1 text-sm text-hg-ink/50">
            Créé le{" "}
            {new Date(draft.createdAt).toLocaleString("fr-FR", {
              dateStyle: "long",
              timeStyle: "short",
            })}{" "}
            · {draft.slides.length} slides
          </p>
        </div>
        <EditDraftButton draft={draft} />
      </div>

      <div className="mb-8 rounded-xl border border-hg-ink/10 bg-white p-4 shadow-hg-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPublished ? (
              <>
                <span className="h-2 w-2 rounded-full bg-hg-moss" />
                <span className="text-sm font-semibold text-hg-moss">
                  Publié{" "}
                  {draft.publishedAt && formatRelativeFrench(draft.publishedAt)}
                </span>
              </>
            ) : isRejected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-hg-rust" />
                <span className="text-sm font-semibold text-hg-rust/80">
                  Rejeté
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-hg-ink/20" />
                <span className="text-sm text-hg-ink/50">
                  Pas encore publié
                </span>
              </>
            )}
          </div>
          {isPublished ? (
            <div className="flex items-center gap-3">
              <a
                href={draft.permalink ?? "https://www.instagram.com/julesd.dev/"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-hg-gold transition-colors duration-150 hover:text-hg-ink"
              >
                {draft.permalink ? "Voir ce post →" : "Voir sur Instagram"}
              </a>
              <RepublishButton draftId={draft.id} />
            </div>
          ) : isRejected ? null : (
            <PublishButton draftId={draft.id} />
          )}
        </div>
        {isPublished && draft.mediaId && (
          <div className="mt-2 text-xs text-hg-ink/40">
            Media ID : <code className="font-mono">{draft.mediaId}</code>
          </div>
        )}
        {!isPublished && !isRejected && (
          <p className="mt-3 text-xs text-hg-ink/40">
            Le clic déclenche le rendu des slides en PNG, l&apos;upload sur
            Vercel Blob, puis la publication via Instagram Graph API. Compte
            ~20-30 secondes avant de voir le résultat.
          </p>
        )}
      </div>

      <PreviewSlideGrid draft={draft} />

      <section className="mt-12">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-hg-ink/50">
          Caption
        </h2>
        <pre className="whitespace-pre-wrap rounded-lg border border-hg-ink/10 bg-white p-4 text-sm text-hg-ink shadow-hg-sm">
          {buildFullCaption(draft)}
        </pre>
      </section>
    </div>
  );
}
