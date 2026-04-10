import { loadDraft } from "@/lib/drafts";
import { buildFullCaption } from "@/lib/content";
import { notFound } from "next/navigation";
import { PillarBadge } from "@/components/pillar-badge";

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

  return (
    <div>
      <div className="mb-8">
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
