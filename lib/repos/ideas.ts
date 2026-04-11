import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";

type DB = PrismaClient | Prisma.TransactionClient;

export interface IdeaRow {
  id: string;
  text: string;
  hardCta: boolean;
  consumed: boolean;
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
  const row = await dbArg.idea.create({
    data: { text: input.text, hardCta: input.hardCta },
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
    orderBy: { createdAt: "asc" },
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

function toRow(row: {
  id: string;
  text: string;
  hardCta: boolean;
  consumed: boolean;
  createdAt: Date;
}): IdeaRow {
  return {
    id: row.id,
    text: row.text,
    hardCta: row.hardCta,
    consumed: row.consumed,
    createdAt: row.createdAt.toISOString(),
  };
}
