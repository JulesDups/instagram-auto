import "server-only";
import type { Theme } from "./content";
import type { PublishedManifest } from "./published";
import type { QueueFile } from "./queue";
import { PILLAR_TARGET_DISTRIBUTION } from "./content";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface PillarCount {
  theme: Theme;
  count: number;
}

export interface PillarRatio {
  theme: Theme;
  count: number;
  ratio: number; // 0..1
  target: number; // 0..1
  withinTarget: boolean;
}

export function countQueueByPillar(queue: QueueFile): PillarCount[] {
  const themes: Theme[] = ["tech-decryption", "build-in-public", "human-pro"];
  return themes.map((theme) => ({
    theme,
    count: queue.items.filter((item) => item.theme === theme).length,
  }));
}

export function publishedThisWeek(manifest: PublishedManifest): number {
  const now = Date.now();
  return manifest.entries.filter(
    (entry) => now - new Date(entry.publishedAt).getTime() < ONE_WEEK_MS,
  ).length;
}

export function publishedLastWeek(manifest: PublishedManifest): number {
  const now = Date.now();
  return manifest.entries.filter((entry) => {
    const t = new Date(entry.publishedAt).getTime();
    return now - t >= ONE_WEEK_MS && now - t < 2 * ONE_WEEK_MS;
  }).length;
}

export function lastPublishedEntry(manifest: PublishedManifest) {
  if (manifest.entries.length === 0) return null;
  return [...manifest.entries].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  )[0];
}

export function distributionLast7Days(
  manifest: PublishedManifest,
): PillarRatio[] {
  const now = Date.now();
  const recent = manifest.entries.filter(
    (entry) => now - new Date(entry.publishedAt).getTime() < ONE_WEEK_MS,
  );
  const total = recent.length;
  const themes: Theme[] = ["tech-decryption", "build-in-public", "human-pro"];
  return themes.map((theme) => {
    const count = recent.filter((e) => e.theme === theme).length;
    const ratio = total === 0 ? 0 : count / total;
    const target = PILLAR_TARGET_DISTRIBUTION[theme];
    const withinTarget = total === 0 || Math.abs(ratio - target) <= 0.1;
    return { theme, count, ratio, target, withinTarget };
  });
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
