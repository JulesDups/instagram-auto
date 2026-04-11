import { listIdeas } from "@/lib/repos/ideas";
import {
  createIdeaAction,
  updateIdeaAction,
  deleteIdeaAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const [pending, consumed] = await Promise.all([
    listIdeas({ consumed: false }),
    listIdeas({ consumed: true }),
  ]);

  return (
    <div>
      <header className="mb-12">
        <div className="text-xs uppercase tracking-widest text-[#D4A374]">
          anecdotes
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#1C343A]">
          Idées en stock
        </h1>
        <p className="mt-3 text-[#1C343A]/60">
          {pending.length} anecdote{pending.length === 1 ? "" : "s"} à
          transformer · {consumed.length} consommée
          {consumed.length === 1 ? "" : "s"}
        </p>
        <p className="mt-3 max-w-2xl text-xs text-[#1C343A]/40">
          Ajoute des anecdotes brutes ici. Le cron Claude.ai les pioche en
          priorité (avant la queue) et les transforme en posts complets en
          respectant la charte éditoriale.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
          Ajouter une anecdote
        </h2>
        <form
          action={createIdeaAction}
          className="space-y-3 rounded-lg border border-[#1C343A]/10 bg-white p-4"
        >
          <textarea
            name="text"
            required
            maxLength={2000}
            rows={4}
            placeholder="L'anecdote brute, telle que tu la raconterais à un ami…"
            className="w-full rounded-md border border-[#1C343A]/20 px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-[#1C343A]/70">
              <input type="checkbox" name="hardCta" />
              CTA hard — &ldquo;Travailler avec moi → bio&rdquo;
            </label>
            <button
              type="submit"
              className="rounded-md bg-[#1C343A] px-4 py-2 text-sm font-semibold text-[#FBFAF8]"
            >
              Ajouter
            </button>
          </div>
        </form>
      </section>

      <section className="mb-16">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
          À transformer
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-[#1C343A]/10 bg-white px-4 py-3 text-[#1C343A]/50">
            Aucune anecdote en stock. Le cron retombera sur la queue puis le
            fallback si tu n&apos;en ajoutes pas.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((idea) => (
              <li
                key={idea.id}
                className="rounded-lg border border-[#1C343A]/10 bg-white p-4"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    {idea.hardCta && (
                      <span className="mr-2 rounded-full bg-[#BF2C23]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#BF2C23]">
                        CTA hard
                      </span>
                    )}
                    <div className="mt-1 whitespace-pre-wrap text-sm text-[#1C343A]">
                      {idea.text}
                    </div>
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer text-[#D4A374]">
                        Éditer
                      </summary>
                      <form
                        action={updateIdeaAction.bind(null, idea.id)}
                        className="mt-3 space-y-2"
                      >
                        <textarea
                          name="text"
                          defaultValue={idea.text}
                          maxLength={2000}
                          rows={4}
                          className="w-full rounded-md border border-[#1C343A]/20 px-2 py-1"
                        />
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="hardCta"
                            defaultChecked={idea.hardCta}
                          />
                          CTA hard
                        </label>
                        <button
                          type="submit"
                          className="ml-2 rounded-md bg-[#1C343A] px-3 py-1 text-[11px] font-semibold text-[#FBFAF8]"
                        >
                          Sauvegarder
                        </button>
                      </form>
                    </details>
                  </div>
                  <form action={deleteIdeaAction.bind(null, idea.id)}>
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
          </ul>
        )}
      </section>

      {consumed.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#1C343A]/50">
            Consommées
          </h2>
          <ul className="space-y-2">
            {consumed.map((idea) => (
              <li
                key={idea.id}
                className="rounded-lg border border-[#1C343A]/10 bg-white/50 px-4 py-3 text-xs text-[#1C343A]/60"
              >
                {idea.hardCta && (
                  <span className="mr-2 rounded-full bg-[#BF2C23]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#BF2C23]">
                    CTA
                  </span>
                )}
                <span className="whitespace-pre-wrap">{idea.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
