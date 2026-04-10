import Link from "next/link";
import { loadQueue } from "@/lib/queue";
import { loadManifest } from "@/lib/published";
import {
  countQueueByPillar,
  distributionLast7Days,
  formatRelativeFrench,
  lastPublishedEntry,
  publishedLastWeek,
  publishedThisWeek,
} from "@/lib/stats";
import { StatCard } from "@/components/stat-card";
import { DistributionBar } from "@/components/distribution-bar";
import { PillarBadge } from "@/components/pillar-badge";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const queue = await loadQueue();
  const { manifest, loadFailed } = await loadManifest();

  const queueByPillar = countQueueByPillar(queue);
  const thisWeek = publishedThisWeek(manifest);
  const lastWeek = publishedLastWeek(manifest);
  const lastEntry = lastPublishedEntry(manifest);
  const distribution = distributionLast7Days(manifest);

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

      {loadFailed && (
        <div className="mb-6 rounded-lg border border-[#BF2C23]/30 bg-[#BF2C23]/5 px-4 py-3 text-sm text-[#BF2C23]">
          Manifest published.json non chargé — affichage dégradé. Les
          historiques de publication peuvent être incomplets.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Queue restante"
          value={queue.items.length}
          hint={`${queue.items.length} sujet${queue.items.length > 1 ? "s" : ""} en attente`}
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
            lastEntry ? formatRelativeFrench(lastEntry.publishedAt) : "Aucun"
          }
          hint={
            lastEntry ? (
              <div className="flex items-center gap-2">
                <PillarBadge theme={lastEntry.theme} />
                <Link
                  href={`/preview/${lastEntry.draftId}`}
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
            segments={distribution.map((d) => ({
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
