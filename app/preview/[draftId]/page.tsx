import { loadDraft } from "@/lib/drafts";
import { themeLabel, buildFullCaption } from "@/lib/content";
import { notFound } from "next/navigation";

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
    <main className="mx-auto max-w-3xl px-6 py-16 text-zinc-100">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-sky-400">
          {themeLabel(draft.theme)}
        </div>
        <h1 className="mt-2 text-3xl font-bold">Draft {draft.id}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Créé le{" "}
          {new Date(draft.createdAt).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          })}{" "}
          · {draft.slides.length} slides
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {draft.slides.map((slide, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/render/${draft.id}/${i}`}
              alt={`Slide ${i + 1}: ${slide.title}`}
              width={1080}
              height={1080}
              className="aspect-square w-full object-cover"
            />
            <div className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
              {i + 1}. {slide.kind}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Caption
        </h2>
        <pre className="whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-200">
          {buildFullCaption(draft)}
        </pre>
      </section>
    </main>
  );
}
