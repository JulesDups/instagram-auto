import "server-only";
import { Prisma, PrismaClient, DraftStatus } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";
import type { Theme } from "@/lib/content";
import { PILLAR_TARGET_DISTRIBUTION } from "@/lib/content";
import { themeFromDb } from "@/lib/theme";

type DB = PrismaClient | Prisma.TransactionClient;

export type NextSource =
  | { kind: "idea"; sourceId: string; text: string; hardCta: boolean }
  | { kind: "queue"; sourceId: string; theme: Theme; angle: string; notes?: string; cta: boolean }
  | { kind: "fallback"; theme: Theme };

/** TTL suffisant pour couvrir le pipeline async (cron 04:00 → Claude.ai → webhook),
 *  mais assez court pour qu'une réservation ratée soit stale au cron du lendemain (04:00). */
const RESERVATION_TTL_MS = 12 * 60 * 60 * 1000; // 12 heures

/**
 * Core logic executed inside a serializable transaction.
 * Priority: ideas (oldest first) → queue (lowest position first) → fallback (most under-represented pillar).
 *
 * Sources are *reserved* (reservedAt = now) rather than immediately consumed.
 * The calling code (POST /api/intake) commits the final consumed = true once the draft is persisted.
 * Reservations expire after RESERVATION_TTL_MS so a failed intake cycle doesn't permanently lose a source.
 *
 * Uses conditional updateMany with the same reservedAt guard to detect races —
 * if count === 0, another concurrent transaction won the row first and we fall through to the next source.
 */
async function pickInTx(tx: Prisma.TransactionClient): Promise<NextSource> {
  const staleThreshold = new Date(Date.now() - RESERVATION_TTL_MS);
  const available = {
    consumed: false,
    OR: [{ reservedAt: null }, { reservedAt: { lt: staleThreshold } }],
  };

  // 1. Ideas — lowest position pending first (user-reorderable; createdAt tiebreaker)
  const idea = await tx.idea.findFirst({
    where: available,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  if (idea) {
    const updated = await tx.idea.updateMany({
      where: { id: idea.id, ...available },
      data: { reservedAt: new Date() },
    });
    if (updated.count === 1) {
      return { kind: "idea", sourceId: idea.id, text: idea.text, hardCta: idea.hardCta };
    }
    // Lost the race — another concurrent tx reserved this idea. Fall through to queue.
  }

  // 2. Queue — lowest position pending first
  const queue = await tx.queueItem.findFirst({
    where: available,
    orderBy: { position: "asc" },
  });
  if (queue) {
    const updated = await tx.queueItem.updateMany({
      where: { id: queue.id, ...available },
      data: { reservedAt: new Date() },
    });
    if (updated.count === 1) {
      return {
        kind: "queue",
        sourceId: queue.id,
        theme: themeFromDb(queue.theme),
        angle: queue.angle,
        notes: queue.notes ?? undefined,
        cta: queue.cta,
      };
    }
    // Lost the race — fall through to fallback.
  }

  // 3. Fallback — no reservation needed, pick most under-represented pillar over last 7 published drafts.
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
