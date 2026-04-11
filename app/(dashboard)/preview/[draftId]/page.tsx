import { notFound } from "next/navigation";
import { buildFullCaption } from "@/lib/content";
import { getDraft } from "@/lib/repos/drafts";
import { formatRelativeFrench } from "@/lib/stats";
import { PillarBadge } from "@/components/pillar-badge";
import { PublishButton } from "@/components/publish-button";
import { EditForm } from "./edit-form";

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
      <div className="mb-6">
        <PillarBadge theme={draft.theme} />
        <h1 className="mt-3 text-3xl font-bold text-[#1C343A]">
          Draft {draft.id}
        </h1>
        <p className="mt-1 text-sm text-[#1C343A]/50">
          Créé le{" "}
          {new Date(draft.createdAt).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          })}{" "}
          · {draft.slides.length} slides
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-[#1C343A]/10 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPublished ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">
                  Publié{" "}
                  {draft.publishedAt &&
                    formatRelativeFrench(draft.publishedAt)}
                </span>
              </>
            ) : isRejected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#BF2C23]" />
                <span className="text-sm font-semibold text-[#BF2C23]/80">
                  Rejeté
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-[#1C343A]/20" />
                <span className="text-sm text-[#1C343A]/50">
                  Pas encore publié
                </span>
              </>
            )}
          </div>
          {isPublished ? (
            <a
              href={
                draft.permalink ?? "https://www.instagram.com/julesd.dev/"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#D4A374] underline"
            >
              {draft.permalink ? "Voir ce post →" : "Voir sur Instagram"}
            </a>
          ) : isRejected ? null : (
            <PublishButton draftId={draft.id} />
          )}
        </div>
        {isPublished && draft.mediaId && (
          <div className="mt-2 text-xs text-[#1C343A]/40">
            Media ID : <code className="font-mono">{draft.mediaId}</code>
          </div>
        )}
        {!isPublished && !isRejected && (
          <p className="mt-3 text-xs text-[#1C343A]/40">
            Le clic déclenche le rendu des slides en PNG, l&apos;upload sur
            Vercel Blob, puis la publication via Instagram Graph API. Compte
            ~20-30 secondes avant de voir le résultat.
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {draft.slides.map((slide, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-[#1C343A]/10 bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/render/${draft.id}/${i}`}
              alt={`Slide ${i + 1}: ${slide.title}`}
              width={1080}
              height={1080}
              className="aspect-square w-full object-cover"
            />
            <div className="border-t border-[#1C343A]/10 px-3 py-2 text-xs text-[#1C343A]/50">
              {i + 1}. {slide.kind}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
          Caption
        </h2>
        <pre className="whitespace-pre-wrap rounded-lg border border-[#1C343A]/10 bg-white p-4 text-sm text-[#1C343A]">
          {buildFullCaption(draft)}
        </pre>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
          Éditer le draft
        </h2>
        <EditForm draft={draft} />
      </section>
    </div>
  );
}
