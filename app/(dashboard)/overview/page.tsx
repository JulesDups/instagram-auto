import Link from "next/link";
import { getOverviewStats, formatRelativeFrench } from "@/lib/stats";
import { StatCard } from "@/components/stat-card";
import { DistributionBar } from "@/components/distribution-bar";
import { PillarBadge } from "@/components/pillar-badge";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let stats;
  try {
    stats = await getOverviewStats();
  } catch (e) {
    const err = e as Error & { code?: string; meta?: unknown };
    const msg = (err.message || String(e)).replace(/\s+/g, " ").slice(0, 400);
    const code = err.code || "no-code";
    const name = err.name || "Error";
    const meta = err.meta ? JSON.stringify(err.meta).slice(0, 200) : "no-meta";
    console.error(`[DBG-OVERVIEW] name=${name} code=${code} meta=${meta} msg=${msg}`);
    throw e;
  }
  const {
    queueByPillar,
    queueTotal,
    ideasCount,
    firstIdea,
    publishedThisWeek: thisWeek,
    publishedLastWeek: lastWeek,
    lastPublished,
    distribution7d,
  } = stats;

  const delta = thisWeek - lastWeek;
  const deltaText =
    delta === 0
      ? `stable vs ${lastWeek}`
      : delta > 0
        ? `+${delta} vs ${lastWeek}`
        : `${delta} vs ${lastWeek}`;

  return (
    <div>
      <header className="mb-12">
        <div className="text-xs uppercase tracking-widest text-[#D4A374]">
          dashboard
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#1C343A]">Overview</h1>
      </header>

      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label="Idées en stock"
          value={ideasCount}
          hint={
            ideasCount === 0
              ? "Aucune — fallback queue"
              : ideasCount === 1
                ? "Prochaine transformation"
                : `${ideasCount} à transformer`
          }
        >
          {firstIdea && (
            <div className="line-clamp-3 text-xs text-[#1C343A]/60">
              {firstIdea.hardCta && (
                <span className="mr-1 rounded-full bg-[#BF2C23]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#BF2C23]">
                  CTA
                </span>
              )}
              {firstIdea.text}
            </div>
          )}
        </StatCard>

        <StatCard
          label="Queue restante"
          value={queueTotal}
          hint={`${queueTotal} sujet${queueTotal > 1 ? "s" : ""} en attente`}
        >
          <DistributionBar
            segments={queueByPillar.map((c) => ({
              theme: c.theme,
              count: c.count,
            }))}
          />
        </StatCard>

        <StatCard
          label="Publiés cette semaine"
          value={thisWeek}
          hint={deltaText}
        />

        <StatCard
          label="Dernier post"
          value={
            lastPublished ? formatRelativeFrench(lastPublished.publishedAt) : "Aucun"
          }
          hint={
            lastPublished ? (
              <div className="flex items-center gap-2">
                <PillarBadge theme={lastPublished.theme} />
                <Link
                  href={`/preview/${lastPublished.draftId}`}
                  className="text-[#D4A374] underline"
                >
                  voir
                </Link>
              </div>
            ) : (
              "Pas de publication"
            )
          }
        />

        <StatCard label="Distribution 7 derniers jours" value="">
          <DistributionBar
            segments={distribution7d.map((d) => ({
              theme: d.theme,
              count: d.count,
              ratio: d.ratio,
              target: d.target,
              withinTarget: d.withinTarget,
            }))}
            showLabels
            showTargets
          />
        </StatCard>
      </div>
    </div>
  );
}
