import "server-only";
import type { Theme } from "./content";
import { PILLAR_TARGET_DISTRIBUTION } from "./content";
import { listQueue } from "./repos/queue";
import { listIdeas } from "./repos/ideas";
import { listDrafts } from "./repos/drafts";
import { countPublishedThisWeek } from "./repos/published";

export { formatRelativeFrench } from "./format-date";

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

