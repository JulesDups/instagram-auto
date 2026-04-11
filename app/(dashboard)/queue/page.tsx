import { loadQueue } from "@/lib/queue";
import { getDraftsWithStatus } from "@/lib/drafts";
import { stripEmphasis } from "@/lib/content";
import { PillarBadge } from "@/components/pillar-badge";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const queue = await loadQueue();
  const { items: draftItems, manifestLoadFailed } = await getDraftsWithStatus();

  const publishedItems = draftItems.filter((i) => i.published !== null);
  const unpublishedCount = draftItems.filter((i) => i.published === null).length;

  const counts: Record<string, number> = {};
  for (const item of queue.items) {
    counts[item.theme] = (counts[item.theme] ?? 0) + 1;
  }

  return (
    <div>
      <header className="mb-12">
        <div className="text-xs uppercase tracking-widest text-[#D4A374]">
          editorial queue
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#1C343A]">
          Calendrier éditorial
        </h1>
        <p className="mt-3 text-[#1C343A]/60">
          {queue.items.length} sujet
          {queue.items.length === 1 ? "" : "s"} en attente ·{" "}
          {publishedItems.length} publié
          {publishedItems.length === 1 ? "" : "s"} ·{" "}
          {unpublishedCount} en attente de validation
        </p>
        {queue.items.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(["tech-decryption", "build-in-public", "human-pro"] as const).map(
              (theme) => (
                <div
                  key={theme}
                  className="inline-flex items-center gap-2 rounded-full border border-[#1C343A]/10 bg-white px-3 py-1"
                >
                  <PillarBadge theme={theme} />
                  <span className="text-xs font-semibold text-[#1C343A]/70">
                    {counts[theme] ?? 0}
                  </span>
                </div>
              ),
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-[#1C343A]/40">
          Queue gérée par commit —{" "}
          <a
            href="https://github.com/JulesDups/instagram-auto/blob/main/content/queue.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4A374] underline"
          >
            éditer content/queue.json →
          </a>
        </p>
      </header>

      {manifestLoadFailed && (
        <div className="mb-6 rounded-lg border border-[#BF2C23]/30 bg-[#BF2C23]/5 px-4 py-3 text-sm text-[#BF2C23]">
          Manifest non chargé — les états publiés peuvent être incomplets.
        </div>
      )}

      <section className="mb-16">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
          Up next
        </h2>
        {queue.items.length === 0 ? (
          <p className="rounded-lg border border-[#1C343A]/10 bg-white px-4 py-3 text-[#1C343A]/50">
            Queue vide. Le prochain run de Claude.ai task piochera un thème
            sous-représenté automatiquement.
          </p>
        ) : (
          <ol className="space-y-3">
            {queue.items.map((item, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-lg border border-[#1C343A]/10 bg-white p-4"
              >
                <div className="font-mono text-2xl font-bold text-[#1C343A]/20">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <PillarBadge theme={item.theme} />
                    {item.cta && (
                      <span className="rounded-full bg-[#BF2C23]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#BF2C23]">
                        CTA hard
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-medium text-[#1C343A]">
                    {item.angle}
                  </div>
                  {item.notes && (
                    <div className="mt-2 text-sm text-[#1C343A]/50">
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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
          Publiés
        </h2>
        {publishedItems.length === 0 ? (
          <p className="rounded-lg border border-[#1C343A]/10 bg-white px-4 py-3 text-[#1C343A]/50">
            Aucun post publié pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {publishedItems.map(({ draft: d, published: p }) => (
              <li
                key={d.id}
                className="rounded-lg border border-[#1C343A]/10 bg-white transition hover:border-[#D4A374]/60"
              >
                <a href={`/preview/${d.id}`} className="block p-4">
                  <div className="flex items-center justify-between">
                    <PillarBadge theme={d.theme} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                      Publié
                    </span>
                  </div>
                  <div className="mt-2 font-medium text-[#1C343A]">
                    {stripEmphasis(d.slides[0]?.title ?? d.id)}
                  </div>
                  <div className="mt-1 text-xs text-[#1C343A]/50">
                    {new Date(p!.publishedAt).toLocaleString("fr-FR", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}{" "}
                    · {d.slides.length} slides · Media ID :{" "}
                    <code className="font-mono">{p!.mediaId}</code>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
