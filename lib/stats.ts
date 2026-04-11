import "server-only";
import type { Theme } from "./content";
import { PILLAR_TARGET_DISTRIBUTION } from "./content";
import { listQueue } from "./repos/queue";
import { listIdeas } from "./repos/ideas";
import { listDrafts } from "./repos/drafts";
import { countPublishedThisWeek } from "./repos/published";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface PillarCount {
  theme: Theme;
  count: number;
}

export interface PillarRatio {
  theme: Theme;
  count: number;
  ratio: number;
  target: number;
  withinTarget: boolean;
}

export interface OverviewStats {
  queueByPillar: PillarCount[];
  queueTotal: number;
  ideasCount: number;
  firstIdea: { text: string; hardCta: boolean } | null;
  publishedThisWeek: number;
  publishedLastWeek: number;
  lastPublished: {
    draftId: string;
    theme: Theme;
    publishedAt: string;
  } | null;
  distribution7d: PillarRatio[];
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [queue, ideas, weekCount, allPublished] = await Promise.all([
    listQueue({ consumed: false }),
    listIdeas({ consumed: false }),
    countPublishedThisWeek(),
    listDrafts({ status: "published" }),
  ]);

  const themes: Theme[] = ["tech-decryption", "build-in-public", "human-pro"];

  // Queue per-pillar counts
  const queueByPillar: PillarCount[] = themes.map((theme) => ({
    theme,
    count: queue.filter((q) => q.theme === theme).length,
  }));

  const now = Date.now();

  // Published last week (8-14 days ago)
  const lastWeekCount = allPublished.filter((p) => {
    if (!p.publishedAt) return false;
    const t = new Date(p.publishedAt).getTime();
    return now - t >= ONE_WEEK_MS && now - t < 2 * ONE_WEEK_MS;
  }).length;

  // Last published entry (allPublished is already sorted by createdAt desc)
  const lastPub = allPublished.find((p) => p.publishedAt != null) ?? null;

  // 7-day distribution
  const recentPub = allPublished.filter(
    (p) => p.publishedAt && now - new Date(p.publishedAt).getTime() < ONE_WEEK_MS,
  );
  const totalRecent = recentPub.length;
  const distribution7d: PillarRatio[] = themes.map((theme) => {
    const count = recentPub.filter((p) => p.theme === theme).length;
    const ratio = totalRecent === 0 ? 0 : count / totalRecent;
    const target = PILLAR_TARGET_DISTRIBUTION[theme];
    const withinTarget = totalRecent === 0 || Math.abs(ratio - target) <= 0.1;
    return { theme, count, ratio, target, withinTarget };
  });

  return {
    queueByPillar,
    queueTotal: queue.length,
    ideasCount: ideas.length,
    firstIdea: ideas[0] ? { text: ideas[0].text, hardCta: ideas[0].hardCta } : null,
    publishedThisWeek: weekCount,
    publishedLastWeek: lastWeekCount,
    lastPublished:
      lastPub && lastPub.publishedAt
        ? { draftId: lastPub.id, theme: lastPub.theme, publishedAt: lastPub.publishedAt }
        : null,
    distribution7d,
  };
}

export function formatRelativeFrench(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks} sem.`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}
