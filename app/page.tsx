import { listDraftIds } from "@/lib/drafts";

export default async function Home() {
  const drafts = await listDraftIds();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-zinc-100">
      <div className="mb-12">
        <div className="text-xs uppercase tracking-widest text-sky-400">
          instagram-auto
        </div>
        <h1 className="mt-2 text-4xl font-bold">Carousel pipeline</h1>
        <p className="mt-3 text-zinc-400">
          Génération, rendu et publication automatisée de carousels Instagram
          autour de Claude Code, automation et création de contenu IA.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Drafts disponibles
        </h2>
        {drafts.length === 0 ? (
          <p className="text-zinc-500">
            Aucun draft. Place un fichier JSON dans <code>/drafts</code>.
          </p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((id) => (
              <li key={id}>
                <a
                  href={`/preview/${id}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 transition hover:border-sky-500 hover:bg-zinc-900/80"
                >
                  <div className="font-mono text-sm">{id}</div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="text-xs text-zinc-600">
        <p>
          Endpoints :{" "}
          <code className="text-zinc-400">/api/render/[draftId]/[index]</code>{" "}
          · <code className="text-zinc-400">/api/publish</code> ·{" "}
          <code className="text-zinc-400">/api/intake</code>
        </p>
      </section>
    </main>
  );
}
