import "server-only";
import { Prisma, PrismaClient, DraftStatus } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";
import type { Theme } from "@/lib/content";
import { PILLAR_TARGET_DISTRIBUTION } from "@/lib/content";
import { themeFromDb } from "@/lib/theme";

type DB = PrismaClient | Prisma.TransactionClient;

export type NextSource =
  | { kind: "idea"; text: string; hardCta: boolean }
  | { kind: "queue"; theme: Theme; angle: string; notes?: string; cta: boolean }
  | { kind: "fallback"; theme: Theme };

/**
 * Core logic executed inside a serializable transaction.
 * Priority: ideas (oldest first) → queue (lowest position first) → fallback (most under-represented pillar).
 * Uses conditional updateMany with `consumed: false` guard to detect races — if count === 0, another
 * concurrent transaction won the row first and we fall through to the next source.
 */
async function pickInTx(tx: Prisma.TransactionClient): Promise<NextSource> {
  // 1. Ideas — oldest pending first
  const idea = await tx.idea.findFirst({
    where: { consumed: false },
    orderBy: { createdAt: "asc" },
  });
  if (idea) {
    const updated = await tx.idea.updateMany({
      where: { id: idea.id, consumed: false },
      data: { consumed: true },
    });
    if (updated.count === 1) {
      return { kind: "idea", text: idea.text, hardCta: idea.hardCta };
    }
    // Lost the race — another concurrent tx consumed this idea. Fall through to queue.
  }

  // 2. Queue — lowest position pending first
  const queue = await tx.queueItem.findFirst({
    where: { consumed: false },
    orderBy: { position: "asc" },
  });
  if (queue) {
    const updated = await tx.queueItem.updateMany({
      where: { id: queue.id, consumed: false },
      data: { consumed: true },
    });
    if (updated.count === 1) {
      return {
        kind: "queue",
        theme: themeFromDb(queue.theme),
        angle: queue.angle,
        notes: queue.notes ?? undefined,
        cta: queue.cta,
      };
    }
    // Lost the race — fall through to fallback.
  }

  // 3. Fallback — no consumption, pick most under-represented pillar over last 7 published drafts.
  const recent = await tx.draft.findMany({
    where: { status: DraftStatus.published },
    orderBy: { publishedAt: "desc" },
    take: 7,
    select: { theme: true },
  });

  const count: Record<Theme, number> = {
    "tech-decryption": 0,
    "build-in-public": 0,
    "human-pro": 0,
  };
  for (const r of recent) {
    count[themeFromDb(r.theme)] += 1;
  }

  const total = recent.length || 1;
  let worst: Theme = "tech-decryption";
  let worstGap = -Infinity;

  for (const theme of Object.keys(PILLAR_TARGET_DISTRIBUTION) as Theme[]) {
    const share = count[theme] / total;
    const gap = PILLAR_TARGET_DISTRIBUTION[theme] - share;
    if (gap > worstGap) {
      worstGap = gap;
      worst = theme;
    }
  }

  return { kind: "fallback", theme: worst };
}

const MAX_RETRIES = 3;

/**
 * Pick the next content source atomically.
 *
 * If dbArg is already a transaction client (i.e. it has no `$transaction` method),
 * run the logic inline without nesting another transaction. Otherwise, wrap in a
 * Serializable transaction with a retry loop to handle P2034 serialization failures
 * that can arise under concurrent load.
 */
export async function pickNextSource(dbArg: DB = defaultDb): Promise<NextSource> {
  // Prisma's TransactionClient intentionally omits $transaction.
  // A PrismaClient always has it. This is the canonical detection pattern.
  if (!("$transaction" in dbArg)) {
    return pickInTx(dbArg as Prisma.TransactionClient);
  }

  const client = dbArg as PrismaClient;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await client.$transaction(async (tx) => pickInTx(tx), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034" &&
        attempt < MAX_RETRIES - 1
      ) {
        // Serialization failure — retry. The other concurrent transaction has committed,
        // so on retry we'll see the updated state and fall through to the next source.
        continue;
      }
      throw err;
    }
  }

  throw new Error("pickNextSource: exceeded max retries due to serialization conflicts");
}
