import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";

type DB = PrismaClient | Prisma.TransactionClient;

export interface IdeaRow {
  id: string;
  text: string;
  hardCta: boolean;
  consumed: boolean;
  position: number;
  createdAt: string;
}

export interface CreateIdeaInput {
  text: string;
  hardCta: boolean;
}

export async function createIdea(
  input: CreateIdeaInput,
  dbArg: DB = defaultDb,
): Promise<IdeaRow> {
  const last = await dbArg.idea.findFirst({
    where: { consumed: false },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? -1) + 1;
  const row = await dbArg.idea.create({
    data: { text: input.text, hardCta: input.hardCta, position },
  });
  return toRow(row);
}

export interface ListFilter {
  consumed?: boolean;
}

export async function listIdeas(
  filter: ListFilter = {},
  dbArg: DB = defaultDb,
): Promise<IdeaRow[]> {
  const rows = await dbArg.idea.findMany({
    where: filter.consumed !== undefined ? { consumed: filter.consumed } : undefined,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRow);
}

export interface UpdateIdeaInput {
  text?: string;
  hardCta?: boolean;
  consumed?: boolean;
}

export async function updateIdea(
  id: string,
  update: UpdateIdeaInput,
  dbArg: DB = defaultDb,
): Promise<void> {
  await dbArg.idea.update({
    where: { id },
    data: {
      ...(update.text !== undefined ? { text: update.text } : {}),
      ...(update.hardCta !== undefined ? { hardCta: update.hardCta } : {}),
      ...(update.consumed !== undefined ? { consumed: update.consumed } : {}),
    },
  });
}

export async function markIdeaConsumed(id: string, dbArg: DB = defaultDb): Promise<void> {
  await updateIdea(id, { consumed: true }, dbArg);
}

export async function deleteIdea(id: string, dbArg: DB = defaultDb): Promise<void> {
  await dbArg.idea.delete({ where: { id } });
}

export async function reorderIdeas(
  orderedIds: string[],
  dbArg: DB = defaultDb,
): Promise<void> {
  // updateMany with `consumed: false` guard: consumed ideas are silently
  // skipped so a client bug or stale snapshot can't shift their positions
  // (which would leave consumed + pending buckets with overlapping indices
  // and hurt future debugging). Non-consumed ids that don't exist are also
  // silently skipped, which is the desired no-op behavior.
  const run = async (tx: DB) => {
    for (const [i, id] of orderedIds.entries()) {
      await tx.idea.updateMany({
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
  text: string;
  hardCta: boolean;
  consumed: boolean;
  position: number;
  createdAt: Date;
}): IdeaRow {
  return {
    id: row.id,
    text: row.text,
    hardCta: row.hardCta,
    consumed: row.consumed,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}
