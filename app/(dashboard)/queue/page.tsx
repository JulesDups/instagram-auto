import type { Theme } from "@/lib/content";
import { stripEmphasis } from "@/lib/content";
import { listQueue } from "@/lib/repos/queue";
import { listDrafts } from "@/lib/repos/drafts";
import { PillarBadge } from "@/components/pillar-badge";
import {
  createQueueItemAction,
  updateQueueItemAction,
  deleteQueueItemAction,
} from "./actions";

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
        <div className="text-xs uppercase tracking-widest text-[#D4A374]">
          editorial queue
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#1C343A]">
          Calendrier éditorial
        </h1>
        <p className="mt-3 text-[#1C343A]/60">
          {pendingQueue.length} sujet{pendingQueue.length === 1 ? "" : "s"} en
          attente · {publishedDrafts.length} publié
          {publishedDrafts.length === 1 ? "" : "s"}
        </p>
        {pendingQueue.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {THEMES.map((theme) => (
              <div
                key={theme}
                className="inline-flex items-center gap-2 rounded-full border border-[#1C343A]/10 bg-white px-3 py-1"
              >
                <PillarBadge theme={theme} />
                <span className="text-xs font-semibold text-[#1C343A]/70">
                  {counts[theme] ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      <section className="mb-16">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
          Ajouter un sujet
        </h2>
        <form
          action={createQueueItemAction}
          className="mb-6 space-y-3 rounded-lg border border-[#1C343A]/10 bg-white p-4"
        >
          <div className="flex gap-2">
            <select
              name="theme"
              required
              className="rounded-md border border-[#1C343A]/20 px-3 py-2 text-sm"
            >
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-[#1C343A]/70">
              <input type="checkbox" name="cta" />
              CTA hard
            </label>
          </div>
          <input
            name="angle"
            required
            maxLength={240}
            placeholder="Angle du post"
            className="w-full rounded-md border border-[#1C343A]/20 px-3 py-2 text-sm"
          />
          <textarea
            name="notes"
            maxLength={800}
            placeholder="Notes (optionnel)"
            rows={2}
            className="w-full rounded-md border border-[#1C343A]/20 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-[#1C343A] px-4 py-2 text-sm font-semibold text-[#FBFAF8]"
          >
            Ajouter à la queue
          </button>
        </form>

        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
          Up next
        </h2>
        {pendingQueue.length === 0 ? (
          <p className="rounded-lg border border-[#1C343A]/10 bg-white px-4 py-3 text-[#1C343A]/50">
            Queue vide. Le prochain run piochera un thème sous-représenté.
          </p>
        ) : (
          <ol className="space-y-3">
            {pendingQueue.map((item, i) => (
              <li
                key={item.id}
                className="rounded-lg border border-[#1C343A]/10 bg-white p-4"
              >
                <div className="flex gap-4">
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
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer text-[#D4A374]">
                        Éditer
                      </summary>
                      <form
                        action={updateQueueItemAction.bind(null, item.id)}
                        className="mt-3 space-y-2"
                      >
                        <select
                          name="theme"
                          defaultValue={item.theme}
                          className="rounded-md border border-[#1C343A]/20 px-2 py-1"
                        >
                          {THEMES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <label className="ml-3 inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="cta"
                            defaultChecked={item.cta}
                          />
                          CTA hard
                        </label>
                        <input
                          name="angle"
                          defaultValue={item.angle}
                          maxLength={240}
                          className="w-full rounded-md border border-[#1C343A]/20 px-2 py-1"
                        />
                        <textarea
                          name="notes"
                          defaultValue={item.notes ?? ""}
                          maxLength={800}
                          rows={2}
                          className="w-full rounded-md border border-[#1C343A]/20 px-2 py-1"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-[#1C343A] px-3 py-1 text-[11px] font-semibold text-[#FBFAF8]"
                        >
                          Sauvegarder
                        </button>
                      </form>
                    </details>
                  </div>
                  <form action={deleteQueueItemAction.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-[#BF2C23]/30 px-2 py-1 text-[11px] font-semibold text-[#BF2C23]"
                    >
                      Supprimer
                    </button>
                  </form>
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
        {publishedDrafts.length === 0 ? (
          <p className="rounded-lg border border-[#1C343A]/10 bg-white px-4 py-3 text-[#1C343A]/50">
            Aucun post publié pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {publishedDrafts.map((d) => (
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
