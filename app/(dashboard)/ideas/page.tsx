import { listIdeas } from "@/lib/repos/ideas";
import { IdeasList } from "./ideas-list";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const [pending, consumed] = await Promise.all([
    listIdeas({ consumed: false }),
    listIdeas({ consumed: true }),
  ]);

  return (
    <div>
      <header className="mb-12">
        <div className="font-mono text-[10px] uppercase tracking-widest text-hg-gold">
          anecdotes
        </div>
        <h1 className="mt-2 text-3xl font-bold text-hg-ink">Idées en stock</h1>
        <p className="mt-3 text-sm text-hg-ink/60">
          {pending.length} anecdote{pending.length === 1 ? "" : "s"} à
          transformer · {consumed.length} consommée
          {consumed.length === 1 ? "" : "s"}
        </p>
        <p className="mt-3 max-w-2xl text-xs text-hg-ink/45">
          Ajoute des anecdotes brutes ici. Le cron Claude.ai les pioche en
          priorité (avant la queue) et les transforme en posts complets en
          respectant la charte éditoriale. Tu peux les réordonner par
          glisser-déposer — l&apos;ordre est respecté par le cron.
        </p>
      </header>

      <IdeasList initialPending={pending} initialConsumed={consumed} />
    </div>
  );
}
