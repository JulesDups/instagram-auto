import type { Theme } from "@/lib/content";
import { stripEmphasis } from "@/lib/content";
import { listQueue } from "@/lib/repos/queue";
import { listDrafts } from "@/lib/repos/drafts";
import { PillarBadge } from "@/components/pillar-badge";
import { QueueList } from "./queue-list";

export const dynamic = "force-dynamic";

const THEMES: readonly Theme[] = [
  "tech-decryption",
  "build-in-public",
  "human-pro",
];

export default async function QueuePage() {
  const [pendingQueue, publishedDrafts] = await Promise.all([
    listQueue({ consumed: false }),
    listDrafts({ status: "published" }),
  ]);

  const counts: Record<string, number> = {};
  for (const item of pendingQueue) {
    counts[item.theme] = (counts[item.theme] ?? 0) + 1;
  }

  return (
    <div>
      <header className="mb-12">
        <div className="font-mono text-[10px] uppercase tracking-widest text-hg-gold">
          editorial queue
        </div>
        <h1 className="mt-2 text-3xl font-bold text-hg-ink">Calendrier éditorial</h1>
        <p className="mt-3 text-sm text-hg-ink/60">
          {pendingQueue.length} sujet{pendingQueue.length === 1 ? "" : "s"} en
          attente · {publishedDrafts.length} publié
          {publishedDrafts.length === 1 ? "" : "s"}
        </p>
        {pendingQueue.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {THEMES.map((theme) => (
              <div
                key={theme}
                className="inline-flex items-center gap-2 rounded-full border border-hg-ink/10 bg-white px-3 py-1"
              >
                <PillarBadge theme={theme} />
                <span className="text-xs font-semibold text-hg-ink/70">
                  {counts[theme] ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      <QueueList initialQueue={pendingQueue} />

      <section>
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-hg-ink/50">
          Publiés
        </h2>
        {publishedDrafts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hg-ink/15 bg-white/50 px-4 py-8 text-center text-sm text-hg-ink/50">
            Aucun post publié pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {publishedDrafts.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-hg-ink/10 bg-white transition-colors duration-150 hover:border-hg-gold/50"
              >
                <a href={`/preview/${d.id}`} className="block p-4">
                  <div className="flex items-center justify-between">
                    <PillarBadge theme={d.theme} />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hg-moss">
                      Publié
                    </span>
                  </div>
                  <div className="mt-2 font-medium text-hg-ink">
                    {stripEmphasis(d.slides[0]?.title ?? d.id)}
                  </div>
                  <div className="mt-1 text-xs text-hg-ink/50">
                    {d.publishedAt &&
                      new Date(d.publishedAt).toLocaleString("fr-FR", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}{" "}
                    · {d.slides.length} slides
                    {d.mediaId && (
                      <>
                        {" "}
                        · Media ID :{" "}
                        <code className="font-mono">{d.mediaId}</code>
                      </>
                    )}
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
