import "server-only";
import { Prisma, PrismaClient, Theme as DbTheme } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";
import type { Theme } from "@/lib/content";
import { themeToDb, themeFromDb } from "@/lib/theme";

type DB = PrismaClient | Prisma.TransactionClient;

export interface QueueItemRow {
  id: string;
  theme: Theme;
  angle: string;
  notes: string | null;
  cta: boolean;
  consumed: boolean;
  position: number;
  createdAt: string;
}

export interface CreateQueueInput {
  theme: Theme;
  angle: string;
  notes?: string;
  cta?: boolean;
}

export async function createQueueItem(
  input: CreateQueueInput,
  dbArg: DB = defaultDb,
): Promise<QueueItemRow> {
  const last = await dbArg.queueItem.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? -1) + 1;
  const row = await dbArg.queueItem.create({
    data: {
      theme: themeToDb(input.theme),
      angle: input.angle,
      notes: input.notes ?? null,
      cta: input.cta ?? false,
      position,
    },
  });
  return toRow(row);
}

export interface ListFilter {
  consumed?: boolean;
}

export async function listQueue(
  filter: ListFilter = {},
  dbArg: DB = defaultDb,
): Promise<QueueItemRow[]> {
  const rows = await dbArg.queueItem.findMany({
    where: filter.consumed !== undefined ? { consumed: filter.consumed } : undefined,
    orderBy: { position: "asc" },
  });
  return rows.map(toRow);
}

export interface UpdateQueueInput {
  theme?: Theme;
  angle?: string;
  notes?: string | null;
  cta?: boolean;
  consumed?: boolean;
}

export async function updateQueueItem(
  id: string,
  update: UpdateQueueInput,
  dbArg: DB = defaultDb,
): Promise<void> {
  await dbArg.queueItem.update({
    where: { id },
    data: {
      ...(update.theme !== undefined ? { theme: themeToDb(update.theme) } : {}),
      ...(update.angle !== undefined ? { angle: update.angle } : {}),
      ...(update.notes !== undefined ? { notes: update.notes } : {}),
      ...(update.cta !== undefined ? { cta: update.cta } : {}),
      ...(update.consumed !== undefined ? { consumed: update.consumed } : {}),
    },
  });
}

export async function markQueueItemConsumed(
  id: string,
  dbArg: DB = defaultDb,
): Promise<void> {
  await updateQueueItem(id, { consumed: true }, dbArg);
}

export async function deleteQueueItem(
  id: string,
  dbArg: DB = defaultDb,
): Promise<void> {
  await dbArg.queueItem.delete({ where: { id } });
}

export async function reorderQueueItems(
  orderedIds: string[],
  dbArg: DB = defaultDb,
): Promise<void> {
  // updateMany with `consumed: false` guard — see reorderIdeas for rationale.
  const run = async (tx: DB) => {
    for (const [i, id] of orderedIds.entries()) {
      await tx.queueItem.updateMany({
        where: { id, consumed: false },
        data: { position: i },
      });
    }
  };
  if ("$transaction" in dbArg) {
    await dbArg.$transaction(async (tx) => run(tx));
  } else {
    await run(dbArg);
  }
}

function toRow(row: {
  id: string;
  theme: DbTheme;
  angle: string;
  notes: string | null;
  cta: boolean;
  consumed: boolean;
  position: number;
  createdAt: Date;
}): QueueItemRow {
  return {
    id: row.id,
    theme: themeFromDb(row.theme),
    angle: row.angle,
    notes: row.notes,
    cta: row.cta,
    consumed: row.consumed,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}
