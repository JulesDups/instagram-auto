import "server-only";
import { Prisma, PrismaClient, DraftStatus } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";
import type { Draft, Slide } from "@/lib/content";
import { themeToDb, themeFromDb } from "@/lib/theme";

type DB = PrismaClient | Prisma.TransactionClient;

/**
 * PersistedDraft extends the pure intake-shaped Draft with DB metadata:
 * status, mediaId, publishedAt, permalink. Used as the return type for
 * getDraft and listDrafts so callers (publish.ts, dashboard pages) can
 * access publish state without a separate query.
 */
export interface PersistedDraft extends Draft {
  status: "pending" | "published" | "rejected";
  mediaId: string | null;
  publishedAt: string | null;
  permalink: string | null;
}

export async function createDraft(draft: Draft, dbArg: DB = defaultDb): Promise<void> {
  await dbArg.draft.create({
    data: {
      id: draft.id,
      theme: themeToDb(draft.theme),
      caption: draft.caption,
      hashtags: draft.hashtags,
      createdAt: new Date(draft.createdAt),
      slides: {
        create: draft.slides.map((s, i) => ({
          position: i,
          kind: s.kind,
          title: s.title,
          body: s.body ?? null,
          footer: s.footer ?? null,
        })),
      },
    },
  });
}

export async function getDraft(
  id: string,
  dbArg: DB = defaultDb,
): Promise<PersistedDraft | null> {
  const row = await dbArg.draft.findUnique({
    where: { id },
    include: { slides: { orderBy: { position: "asc" } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    theme: themeFromDb(row.theme),
    caption: row.caption,
    hashtags: row.hashtags,
    slides: row.slides.map((s) => ({
      kind: s.kind,
      title: s.title,
      body: s.body ?? undefined,
      footer: s.footer ?? undefined,
    })),
    status: row.status === DraftStatus.pending
      ? "pending"
      : row.status === DraftStatus.published
        ? "published"
        : "rejected",
    mediaId: row.mediaId ?? null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    permalink: row.permalink ?? null,
  };
}

export interface DraftContentUpdate {
  caption: string;
  hashtags: string[];
  slides: Slide[];
}

export async function updateDraftContent(
  id: string,
  update: DraftContentUpdate,
  dbArg: DB = defaultDb,
): Promise<void> {
  const run = async (tx: DB) => {
    await tx.slide.deleteMany({ where: { draftId: id } });
    await tx.draft.update({
      where: { id },
      data: {
        caption: update.caption,
        hashtags: update.hashtags,
        slides: {
          create: update.slides.map((s, i) => ({
            position: i,
            kind: s.kind,
            title: s.title,
            body: s.body ?? null,
            footer: s.footer ?? null,
          })),
        },
      },
    });
  };

  if ("$transaction" in dbArg) {
    await (dbArg as PrismaClient).$transaction(async (tx) => run(tx));
  } else {
    await run(dbArg);
  }
}

export interface StatusUpdate {
  status: "pending" | "published" | "rejected";
  mediaId?: string;
  slideBlobUrls?: string[];
  permalink?: string;
}

export async function setDraftStatus(
  id: string,
  update: StatusUpdate,
  dbArg: DB = defaultDb,
): Promise<void> {
  await dbArg.draft.update({
    where: { id },
    data: {
      status: DraftStatus[update.status],
      mediaId: update.mediaId ?? null,
      slideBlobUrls: update.slideBlobUrls ?? [],
      publishedAt: update.status === "published" ? new Date() : null,
      permalink: update.permalink ?? null,
    },
  });
}

export interface ListFilter {
  status?: "pending" | "published" | "rejected";
}

export async function listDrafts(
  filter: ListFilter = {},
  dbArg: DB = defaultDb,
): Promise<PersistedDraft[]> {
  const rows = await dbArg.draft.findMany({
    where: filter.status ? { status: DraftStatus[filter.status] } : undefined,
    orderBy: { createdAt: "desc" },
    include: { slides: { orderBy: { position: "asc" } } },
  });
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    theme: themeFromDb(row.theme),
    caption: row.caption,
    hashtags: row.hashtags,
    slides: row.slides.map((s) => ({
      kind: s.kind,
      title: s.title,
      body: s.body ?? undefined,
      footer: s.footer ?? undefined,
    })),
    status: row.status === DraftStatus.pending
      ? "pending"
      : row.status === DraftStatus.published
        ? "published"
        : "rejected",
    mediaId: row.mediaId ?? null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    permalink: row.permalink ?? null,
  }));
}
