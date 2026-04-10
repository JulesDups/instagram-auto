import { loadQueue } from "@/lib/queue";
import { listDraftIds, loadDraft } from "@/lib/drafts";
import { themeLabel, stripEmphasis, type Draft } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const queue = await loadQueue();
  const ids = await listDraftIds();
  const drafts = (
    await Promise.all(
      ids.map(async (id) => {
        try {
          return await loadDraft(id);
        } catch {
          return null;
        }
      }),
    )
  )
    .filter((d): d is Draft => d !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const counts: Record<string, number> = {};
  for (const item of queue.items) {
    counts[item.theme] = (counts[item.theme] ?? 0) + 1;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-zinc-100">
      <header className="mb-12">
        <div className="text-xs uppercase tracking-widest text-amber-400">
          editorial queue
        </div>
        <h1 className="mt-2 text-4xl font-bold">Calendrier éditorial</h1>
        <p className="mt-3 text-zinc-400">
          {queue.items.length} sujet
          {queue.items.length === 1 ? "" : "s"} en attente · {drafts.length}{" "}
          draft{drafts.length === 1 ? "" : "s"} publié
          {drafts.length === 1 ? "" : "s"}
        </p>
        {queue.items.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {(["tech-decryption", "build-in-public", "human-pro"] as const).map(
              (theme) => (
                <span
                  key={theme}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-zinc-400"
                >
                  {themeLabel(theme)} · {counts[theme] ?? 0}
                </span>
              ),
            )}
          </div>
        )}
      </header>

      <section className="mb-16">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Up next
        </h2>
        {queue.items.length === 0 ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-500">
            Queue vide. Le prochain run de Claude.ai task piochera un thème
            sous-représenté automatiquement.
          </p>
        ) : (
          <ol className="space-y-3">
            {queue.items.map((item, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="font-mono text-2xl font-bold text-zinc-700">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                    <span className="text-amber-400">
                      {themeLabel(item.theme)}
                    </span>
                    {item.cta && (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-400">
                        CTA hard
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-medium">{item.angle}</div>
                  {item.notes && (
                    <div className="mt-2 text-sm text-zinc-500">
                      {item.notes}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Published
        </h2>
        {drafts.length === 0 ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-500">
            Aucun draft pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 transition hover:border-amber-500/50"
              >
                <a href={`/preview/${d.id}`} className="block p-4">
                  <div className="text-xs uppercase tracking-wider text-amber-400">
                    {themeLabel(d.theme)}
                  </div>
                  <div className="mt-1 font-medium">
                    {stripEmphasis(d.slides[0]?.title ?? d.id)}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {d.id} ·{" "}
                    {new Date(d.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}{" "}
                    · {d.slides.length} slides
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
