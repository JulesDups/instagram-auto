-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('tech_decryption', 'build_in_public', 'human_pro');

-- CreateEnum
CREATE TYPE "SlideKind" AS ENUM ('hook', 'content', 'cta');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('pending', 'published', 'rejected');

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hardCta" BOOLEAN NOT NULL DEFAULT false,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueItem" (
    "id" TEXT NOT NULL,
    "theme" "Theme" NOT NULL,
    "angle" TEXT NOT NULL,
    "notes" TEXT,
    "cta" BOOLEAN NOT NULL DEFAULT false,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "theme" "Theme" NOT NULL,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[],
    "status" "DraftStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "mediaId" TEXT,
    "slideBlobUrls" TEXT[],

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "SlideKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "footer" TEXT,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Idea_consumed_createdAt_idx" ON "Idea"("consumed", "createdAt");

-- CreateIndex
CREATE INDEX "QueueItem_consumed_position_idx" ON "QueueItem"("consumed", "position");

-- CreateIndex
CREATE INDEX "Draft_status_createdAt_idx" ON "Draft"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Slide_draftId_position_key" ON "Slide"("draftId", "position");

-- AddForeignKey
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
