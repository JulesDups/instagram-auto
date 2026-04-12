-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "reservedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QueueItem" ADD COLUMN     "reservedAt" TIMESTAMP(3);
