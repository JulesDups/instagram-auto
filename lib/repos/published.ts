import "server-only";
import { Prisma, PrismaClient, DraftStatus, Theme as DbTheme, SlideKind as DbSlideKind } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";
import type { Draft, Theme } from "@/lib/content";
import { themeFromDb } from "@/lib/theme";

type DB = PrismaClient | Prisma.TransactionClient;

interface DraftRow {
  id: string;
  createdAt: Date;
  theme: DbTheme;
  caption: string;
  hashtags: string[];
  slides: {
    kind: DbSlideKind;
    title: string;
    body: string | null;
    footer: string | null;
    position: number;
  }[];
}

function rowToDraft(row: DraftRow): Draft {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    theme: themeFromDb(row.theme),
    caption: row.caption,
    hashtags: row.hashtags,
    slides: row.slides
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        kind: s.kind,
        title: s.title,
        body: s.body ?? undefined,
        footer: s.footer ?? undefined,
      })),
  };
}

export async function listPublished(dbArg: DB = defaultDb): Promise<Draft[]> {
  const rows = await dbArg.draft.findMany({
    where: { status: DraftStatus.published },
    orderBy: { publishedAt: "desc" },
    include: { slides: true },
  });
  return rows.map(rowToDraft);
}

export async function getLastPublished(dbArg: DB = defaultDb): Promise<Draft | null> {
  const row = await dbArg.draft.findFirst({
    where: { status: DraftStatus.published },
    orderBy: { publishedAt: "desc" },
    include: { slides: true },
  });
  return row ? rowToDraft(row) : null;
}

export async function countPublishedThisWeek(dbArg: DB = defaultDb): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return dbArg.draft.count({
    where: { status: DraftStatus.published, publishedAt: { gte: weekAgo } },
  });
}

export async function getPillarDistribution(
  opts: { last: number },
  dbArg: DB = defaultDb,
): Promise<Record<Theme, number>> {
  const rows = await dbArg.draft.findMany({
    where: { status: DraftStatus.published },
    orderBy: { publishedAt: "desc" },
    take: opts.last,
    select: { theme: true },
  });
  const dist: Record<Theme, number> = {
    "tech-decryption": 0,
    "build-in-public": 0,
    "human-pro": 0,
  };
  for (const r of rows) {
    dist[themeFromDb(r.theme)] += 1;
  }
  return dist;
}
