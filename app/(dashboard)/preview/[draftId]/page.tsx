import { loadDraft } from "@/lib/drafts";
import { buildFullCaption } from "@/lib/content";
import { notFound } from "next/navigation";
import { PillarBadge } from "@/components/pillar-badge";
import { loadManifest } from "@/lib/published";
import { formatRelativeFrench } from "@/lib/stats";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;

  let draft;
  try {
    draft = await loadDraft(draftId);
  } catch {
    notFound();
  }

  const { manifest, loadFailed: manifestLoadFailed } = await loadManifest();
  const publishedEntry =
    manifest.entries.find((e) => e.draftId === draft.id) ?? null;

  return (
    <div>
      {manifestLoadFailed && (
        <div className="mb-6 rounded-lg border border-[#BF2C23]/30 bg-[#BF2C23]/5 px-4 py-3 text-sm text-[#BF2C23]">
          Manifest non chargé — l&apos;état de publication est indéterminé. Publication désactivée.
        </div>
      )}
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
            {publishedEntry ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">
                  Publié {formatRelativeFrench(publishedEntry.publishedAt)}
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
          {publishedEntry ? (
            <a
              href="https://www.instagram.com/julesd.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#D4A374] underline"
            >
              Voir sur Instagram
            </a>
          ) : (
            manifestLoadFailed ? (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg bg-[#1C343A]/30 px-4 py-2 text-sm font-semibold text-[#FBFAF8]"
              >
                État indéterminé
              </button>
            ) : (
              <form
                action={`/api/dashboard-publish/${draft.id}`}
                method="POST"
              >
                <button
                  type="submit"
                  className="rounded-lg bg-[#1C343A] px-4 py-2 text-sm font-semibold text-[#FBFAF8] transition hover:bg-[#1C343A]/90"
                >
                  Publier sur Instagram
                </button>
              </form>
            )
          )}
        </div>
        {publishedEntry && (
          <div className="mt-2 text-xs text-[#1C343A]/40">
            Media ID :{" "}
            <code className="font-mono">{publishedEntry.mediaId}</code>
          </div>
        )}
        {!publishedEntry && !manifestLoadFailed && (
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
    </div>
  );
}
