// scripts/seed-from-files.ts
// ONE-SHOT idempotent seeder: reads legacy fs/Blob sources → inserts into dev Neon DB.
// Will be deleted in Task 19 after migration.
//
// NOTE: This is a plain Node CLI script. Do NOT import any lib/* file that has
// `import "server-only"` at the top — that module throws unconditionally outside
// the Next.js bundler. Affected lib files: db.ts, ideas.ts, queue.ts, published.ts.
// Safe imports: lib/theme.ts, lib/content.ts (no server-only guard).

import { promises as fs } from "node:fs";
import path from "node:path";
import { PrismaClient, DraftStatus } from "@prisma/client";
import { z } from "zod";
import { themeToDb } from "@/lib/theme";
import { DraftSchema, ThemeSchema, SlideKindSchema } from "@/lib/content";

// ---------------------------------------------------------------------------
// Local Prisma client (avoids importing lib/db.ts which has server-only)
// ---------------------------------------------------------------------------
const db = new PrismaClient({
  log: ["warn", "error"],
});

// ---------------------------------------------------------------------------
// Inline QueueFileSchema (avoids importing lib/queue.ts which has server-only)
// ---------------------------------------------------------------------------
const QueueItemSchema = z.object({
  theme: ThemeSchema,
  angle: z.string().min(1).max(240),
  notes: z.string().max(800).optional(),
  cta: z.boolean().optional(),
});

const QueueFileSchema = z.object({
  items: z.array(QueueItemSchema),
});

// ---------------------------------------------------------------------------
// Inline parseIdeas (avoids importing lib/ideas.ts which has server-only)
// ---------------------------------------------------------------------------
interface IdeaEntry {
  text: string;
  hardCta: boolean;
}

function parseIdeas(content: string): IdeaEntry[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const chunks = normalized.split(/^---$/m);
  // First chunk is header, skip it.
  const entryChunks = chunks.slice(1);

  return entryChunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      if (chunk.startsWith("[hard-cta]")) {
        const text = chunk.slice("[hard-cta]".length).trim();
        return { text, hardCta: true };
      }
      return { text: chunk, hardCta: false };
    })
    .filter((entry) => entry.text.length > 0);
}

// ---------------------------------------------------------------------------
// Inline PublishedManifest loader (avoids importing lib/published.ts which has server-only)
// ---------------------------------------------------------------------------
const PublishedEntrySchema = z.object({
  draftId: z.string(),
  mediaId: z.string(),
  theme: ThemeSchema,
  publishedAt: z.string().datetime(),
  blobSlideUrls: z.array(z.string().url()),
  captionPreview: z.string().max(500),
  permalink: z.string().url().optional(),
});

const PublishedManifestSchema = z.object({
  entries: z.array(PublishedEntrySchema),
});

type PublishedEntry = z.infer<typeof PublishedEntrySchema>;

interface ManifestResult {
  entries: PublishedEntry[];
}

async function loadManifestInline(): Promise<ManifestResult> {
  try {
    // Dynamic import to avoid issues if @vercel/blob is not configured locally.
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "meta/published.json" });
    if (blobs.length === 0) {
      return { entries: [] };
    }
    const url = blobs[0].url;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(
        `[seed] manifest fetch failed with status ${res.status}, treating all drafts as pending`,
      );
      return { entries: [] };
    }
    const json = await res.json();
    const parsed = PublishedManifestSchema.safeParse(json);
    if (!parsed.success) {
      console.warn(
        "[seed] manifest parse failed, treating all drafts as pending:",
        parsed.error.issues,
      );
      return { entries: [] };
    }
    return { entries: parsed.data.entries };
  } catch (err) {
    console.warn(
      "[seed] manifest load threw (likely no Blob credentials), treating all drafts as pending:",
      (err as Error).message,
    );
    return { entries: [] };
  }
}

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------

async function seedQueue(): Promise<void> {
  const existing = await db.queueItem.count();
  if (existing > 0) {
    console.log(`[seed] queue: ${existing} rows already exist, skipping`);
    return;
  }

  const file = path.join(process.cwd(), "content", "queue.json");
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = QueueFileSchema.parse(JSON.parse(raw));
    let position = 0;
    let inserted = 0;
    for (const item of parsed.items) {
      await db.queueItem.create({
        data: {
          theme: themeToDb(item.theme),
          angle: item.angle,
          notes: item.notes ?? null,
          cta: item.cta ?? false,
          position: position++,
        },
      });
      inserted += 1;
    }
    console.log(`[seed] queue: ${inserted} items`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("[seed] queue: file not found, skipping");
      return;
    }
    throw err;
  }
}

async function seedIdeas(): Promise<void> {
  const existing = await db.idea.count();
  if (existing > 0) {
    console.log(`[seed] ideas: ${existing} rows already exist, skipping`);
    return;
  }

  const file = path.join(process.cwd(), "content", "ideas.md");
  try {
    const raw = await fs.readFile(file, "utf-8");
    const entries = parseIdeas(raw);
    for (const entry of entries) {
      await db.idea.create({
        data: { text: entry.text, hardCta: entry.hardCta },
      });
    }
    console.log(`[seed] ideas: ${entries.length} entries`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("[seed] ideas: file not found, skipping");
      return;
    }
    throw err;
  }
}

async function seedDrafts(): Promise<void> {
  const dir = path.join(process.cwd(), "drafts");
  let files: string[];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("[seed] drafts: folder not found, skipping");
      return;
    }
    throw err;
  }

  const { entries } = await loadManifestInline();
  const publishedById = new Map(entries.map((e) => [e.draftId, e]));

  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), "utf-8");
    const draft = DraftSchema.parse(JSON.parse(raw));
    const pub = publishedById.get(draft.id);

    const existing = await db.draft.findUnique({ where: { id: draft.id } });
    if (existing) {
      console.log(`[seed] draft ${draft.id}: already exists, skipping`);
      continue;
    }

    await db.draft.create({
      data: {
        id: draft.id,
        theme: themeToDb(draft.theme),
        caption: draft.caption,
        hashtags: draft.hashtags,
        createdAt: new Date(draft.createdAt),
        status: pub ? DraftStatus.published : DraftStatus.pending,
        mediaId: pub?.mediaId ?? null,
        publishedAt: pub ? new Date(pub.publishedAt) : null,
        slideBlobUrls: pub?.blobSlideUrls ?? [],
        slides: {
          create: draft.slides.map((s, i) => ({
            position: i,
            kind: s.kind as z.infer<typeof SlideKindSchema>,
            title: s.title,
            body: s.body ?? null,
            footer: s.footer ?? null,
          })),
        },
      },
    });
    console.log(
      `[seed] draft ${draft.id}: inserted (${pub ? "published" : "pending"})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await seedQueue();
  await seedIdeas();
  await seedDrafts();
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
