-- DropIndex
DROP INDEX "Idea_consumed_createdAt_idx";

-- AlterTable: add position column with default 0
ALTER TABLE "Idea" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill position for existing rows: oldest first gets 0, then +1 per createdAt asc
-- Scoped per consumed-bucket so pending + consumed each start at 0 (keeps pickNextSource semantics)
UPDATE "Idea" AS i
SET "position" = sub.rn - 1
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "consumed" ORDER BY "createdAt" ASC) AS rn
  FROM "Idea"
) AS sub
WHERE i."id" = sub."id";

-- CreateIndex
CREATE INDEX "Idea_consumed_position_idx" ON "Idea"("consumed", "position");
