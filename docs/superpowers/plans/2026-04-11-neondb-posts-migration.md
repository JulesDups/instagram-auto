# NeonDB posts migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate drafts, editorial queue, ideas, and published history from filesystem/Blob to NeonDB (Prisma), expose HTTP endpoints for Claude.ai Scheduled Task, and enable full CRUD editing from the dashboard.

**Architecture:** Prisma-backed repos replace the existing `lib/drafts.ts` / `lib/queue.ts` / `lib/ideas.ts` / `lib/published.ts` fs modules. A single atomic `GET /api/next-source` endpoint implements the editorial priority logic (ideas > queue > fallback). Draft statuses (`pending` / `published` / `rejected`) persist in DB. Vercel Blob is still used for slide image hosting (IG requires public URLs) but no longer hosts `meta/published.json`.

**Tech Stack:** Next.js 16, Prisma 6, Neon Postgres, Vitest (new), Zod, TypeScript.

**Spec reference:** `docs/superpowers/specs/2026-04-11-neondb-posts-migration-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `prisma/schema.prisma` | Prisma schema with Idea / QueueItem / Draft / Slide models + enums |
| `prisma/migrations/**` | Generated migrations |
| `lib/db.ts` | Prisma client singleton (Neon pooler + direct URL) |
| `lib/theme.ts` | Map between Postgres enum (`tech_decryption`) and app form (`tech-decryption`) |
| `lib/repos/drafts.ts` | DB access: create/read/update/list drafts + slides |
| `lib/repos/queue.ts` | DB access: CRUD on QueueItem, mark consumed |
| `lib/repos/ideas.ts` | DB access: CRUD on Idea, mark consumed |
| `lib/repos/published.ts` | Queries replacing the old Blob manifest loader (stats, distribution, last post) |
| `lib/repos/next-source.ts` | Atomic priority selector `ideas > queue > fallback` |
| `scripts/seed-from-files.ts` | One-shot idempotent seed from legacy fs/Blob sources |
| `app/api/next-source/route.ts` | `GET` endpoint used by Claude.ai Scheduled Task |
| `app/(dashboard)/ideas/page.tsx` | Ideas list + CRUD |
| `app/(dashboard)/ideas/actions.ts` | Server actions for ideas CRUD |
| `app/(dashboard)/queue/actions.ts` | Server actions for queue CRUD |
| `app/(dashboard)/preview/[draftId]/edit-form.tsx` | Client component for inline slide/caption/hashtag editing |
| `app/(dashboard)/preview/[draftId]/actions.ts` | Server actions: save draft edits, publish, reject |
| `vitest.config.ts` | Vitest config, node env |
| `test/repos/next-source.test.ts` | Priority + atomicity tests |
| `test/repos/drafts.test.ts` | CRUD tests |
| `test/api/next-source.test.ts` | HTTP auth + response shape |
| `test/helpers/db.ts` | Test DB reset helper |

### Modified files

| Path | Change |
|---|---|
| `app/api/intake/route.ts` | Replace `saveDraft` fs call with Prisma repo insert |
| `app/api/publish/route.ts` | Update `Draft` status in DB, remove manifest Blob write |
| `app/api/reject/route.ts` | Persist `status=rejected` instead of just returning HTML |
| `lib/publish.ts` | `publishDraft` loads + updates via Prisma, still uploads PNGs to Blob |
| `lib/stats.ts` | Queries Prisma instead of manifest |
| `app/(dashboard)/overview/page.tsx` | Stats via Prisma repos |
| `app/(dashboard)/queue/page.tsx` | CRUD UI via server actions |
| `app/(dashboard)/library/page.tsx` | Filter by `status` tab (`all`/`pending`/`published`/`rejected`) |
| `app/(dashboard)/preview/[draftId]/page.tsx` | Wrap in edit form, add Publier/Rejeter actions |
| `components/sidebar.tsx` | Add `/ideas` nav entry |
| `package.json` | Add deps |
| `.env.local.example` | Add `DATABASE_URL`, `DIRECT_URL` |
| `CLAUDE.md` / `AGENTS.md` | Update data flow sections |

### Deleted files (final cleanup task)

- `lib/drafts.ts`
- `lib/queue.ts`
- `lib/ideas.ts`
- `lib/published.ts`
- `drafts/*.json`
- `content/queue.json`
- `content/ideas.md`

---

## Task 1: Provision Neon + install Prisma + Vitest

**Files:**
- Create: `prisma/schema.prisma`
- Create: `vitest.config.ts`
- Modify: `package.json`
- Modify: `.env.local.example`

- [ ] **Step 1: Create Neon project and branches**

Run:
```bash
neonctl projects create --name instagram-auto
neonctl branches create --name shadow --project-id <id>
neonctl branches create --name test --project-id <id>
neonctl connection-string --project-id <id> --pooled  # → DATABASE_URL
neonctl connection-string --project-id <id>            # → DIRECT_URL
neonctl connection-string --project-id <id> --branch test  # → TEST_DATABASE_URL
```

Expected: three connection strings.

- [ ] **Step 2: Write them to `.env.local` and `.env.local.example`**

`.env.local` (real secrets, gitignored):
```
DATABASE_URL="postgres://...-pooler.neon.tech/..."
DIRECT_URL="postgres://...neon.tech/..."
TEST_DATABASE_URL="postgres://...neon.tech/...?branch=test"
```

`.env.local.example` (committed, no secrets):
```
DATABASE_URL="postgres://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require"
DIRECT_URL="postgres://USER:PASSWORD@HOST.REGION.aws.neon.tech/DB?sslmode=require"
TEST_DATABASE_URL="postgres://USER:PASSWORD@HOST.REGION.aws.neon.tech/DB?sslmode=require&options=project%3Dtest"
```

- [ ] **Step 3: Install deps**

Run:
```bash
npm install prisma@6 @prisma/client@6
npm install -D vitest@3 @vitest/coverage-v8 tsx dotenv-cli
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "eslint",
  "test": "dotenv -e .env.local -- vitest run",
  "test:watch": "dotenv -e .env.local -- vitest",
  "db:migrate": "dotenv -e .env.local -- prisma migrate dev",
  "db:push": "dotenv -e .env.local -- prisma db push",
  "db:studio": "dotenv -e .env.local -- prisma studio",
  "db:seed": "dotenv -e .env.local -- tsx scripts/seed-from-files.ts"
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts .env.local.example
git commit -m "chore: install prisma + vitest, configure neon env"
```

---

## Task 2: Prisma schema + initial migration

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Theme {
  tech_decryption
  build_in_public
  human_pro
}

enum SlideKind {
  hook
  content
  cta
}

enum DraftStatus {
  pending
  published
  rejected
}

model Idea {
  id        String   @id @default(cuid())
  text      String
  hardCta   Boolean  @default(false)
  consumed  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([consumed, createdAt])
}

model QueueItem {
  id        String   @id @default(cuid())
  theme     Theme
  angle     String
  notes     String?
  cta       Boolean  @default(false)
  consumed  Boolean  @default(false)
  position  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([consumed, position])
}

model Draft {
  id            String      @id
  theme         Theme
  caption       String
  hashtags      String[]
  status        DraftStatus @default(pending)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  publishedAt   DateTime?
  mediaId       String?
  slideBlobUrls String[]
  slides        Slide[]

  @@index([status, createdAt])
}

model Slide {
  id       String    @id @default(cuid())
  draftId  String
  draft    Draft     @relation(fields: [draftId], references: [id], onDelete: Cascade)
  position Int
  kind     SlideKind
  title    String
  body     String?
  footer   String?

  @@unique([draftId, position])
}
```

- [ ] **Step 2: Run initial migration**

Run:
```bash
npm run db:migrate -- --name init
```

Expected: migration applied, `prisma/migrations/<timestamp>_init/` created, Prisma Client generated.

- [ ] **Step 3: Verify with Prisma Studio**

Run:
```bash
npm run db:studio
```

Expected: four empty tables visible.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): initial prisma schema (idea, queueitem, draft, slide)"
```

---

## Task 3: Prisma client singleton

**Files:**
- Create: `lib/db.ts`

- [ ] **Step 1: Write `lib/db.ts`**

```ts
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db.ts
git commit -m "feat(db): add prisma client singleton"
```

---

## Task 4: Theme enum conversion helper

**Files:**
- Create: `lib/theme.ts`
- Create: `test/lib/theme.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/lib/theme.test.ts
import { describe, expect, test } from "vitest";
import { Theme as PrismaTheme } from "@prisma/client";
import { themeToDb, themeFromDb } from "@/lib/theme";

describe("theme enum conversion", () => {
  test("themeToDb maps hyphenated to underscored", () => {
    expect(themeToDb("tech-decryption")).toBe(PrismaTheme.tech_decryption);
    expect(themeToDb("build-in-public")).toBe(PrismaTheme.build_in_public);
    expect(themeToDb("human-pro")).toBe(PrismaTheme.human_pro);
  });

  test("themeFromDb maps underscored to hyphenated", () => {
    expect(themeFromDb(PrismaTheme.tech_decryption)).toBe("tech-decryption");
    expect(themeFromDb(PrismaTheme.build_in_public)).toBe("build-in-public");
    expect(themeFromDb(PrismaTheme.human_pro)).toBe("human-pro");
  });

  test("round-trip is identity", () => {
    const values = ["tech-decryption", "build-in-public", "human-pro"] as const;
    for (const v of values) {
      expect(themeFromDb(themeToDb(v))).toBe(v);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- theme`
Expected: FAIL, module not found.

- [ ] **Step 3: Write `lib/theme.ts`**

```ts
import { Theme as PrismaTheme } from "@prisma/client";
import type { Theme } from "./content";

export function themeToDb(theme: Theme): PrismaTheme {
  switch (theme) {
    case "tech-decryption":
      return PrismaTheme.tech_decryption;
    case "build-in-public":
      return PrismaTheme.build_in_public;
    case "human-pro":
      return PrismaTheme.human_pro;
  }
}

export function themeFromDb(theme: PrismaTheme): Theme {
  switch (theme) {
    case PrismaTheme.tech_decryption:
      return "tech-decryption";
    case PrismaTheme.build_in_public:
      return "build-in-public";
    case PrismaTheme.human_pro:
      return "human-pro";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- theme`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/theme.ts test/lib/theme.test.ts
git commit -m "feat(db): theme enum conversion helper (prisma ↔ app)"
```

---

## Task 5: Test DB reset helper

**Files:**
- Create: `test/helpers/db.ts`

- [ ] **Step 1: Write `test/helpers/db.ts`**

```ts
import { PrismaClient } from "@prisma/client";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required for tests");
}

export const testDb = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});

export async function resetDb(): Promise<void> {
  // Order matters: Slide → Draft (FK), then QueueItem, Idea.
  await testDb.slide.deleteMany();
  await testDb.draft.deleteMany();
  await testDb.queueItem.deleteMany();
  await testDb.idea.deleteMany();
}
```

- [ ] **Step 2: Commit**

```bash
git add test/helpers/db.ts
git commit -m "test(db): add test db reset helper"
```

---

## Task 6: Drafts repo

**Files:**
- Create: `lib/repos/drafts.ts`
- Create: `test/repos/drafts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/repos/drafts.test.ts
import { beforeEach, describe, expect, test } from "vitest";
import { DraftStatus } from "@prisma/client";
import { resetDb, testDb } from "../helpers/db";
import {
  createDraft,
  getDraft,
  updateDraftContent,
  setDraftStatus,
  listDrafts,
} from "@/lib/repos/drafts";
import type { Draft } from "@/lib/content";

const sample: Draft = {
  id: "test-draft-1",
  createdAt: "2026-04-11T10:00:00.000Z",
  theme: "tech-decryption",
  caption: "hello",
  hashtags: ["nextjs"],
  slides: [
    { kind: "hook", title: "Hook title" },
    { kind: "content", title: "Body", body: "body text" },
  ],
};

describe("drafts repo", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("createDraft persists draft + slides", async () => {
    await createDraft(sample, testDb);
    const row = await testDb.draft.findUnique({
      where: { id: "test-draft-1" },
      include: { slides: { orderBy: { position: "asc" } } },
    });
    expect(row?.slides).toHaveLength(2);
    expect(row?.status).toBe(DraftStatus.pending);
    expect(row?.slides[0].title).toBe("Hook title");
  });

  test("getDraft returns app-shaped draft", async () => {
    await createDraft(sample, testDb);
    const draft = await getDraft("test-draft-1", testDb);
    expect(draft).not.toBeNull();
    expect(draft!.theme).toBe("tech-decryption");
    expect(draft!.slides).toHaveLength(2);
  });

  test("updateDraftContent replaces slides atomically", async () => {
    await createDraft(sample, testDb);
    await updateDraftContent(
      "test-draft-1",
      {
        caption: "updated",
        hashtags: ["updated"],
        slides: [{ kind: "hook", title: "New hook" }],
      },
      testDb,
    );
    const draft = await getDraft("test-draft-1", testDb);
    expect(draft!.caption).toBe("updated");
    expect(draft!.slides).toHaveLength(1);
    expect(draft!.slides[0].title).toBe("New hook");
  });

  test("setDraftStatus transitions pending → published", async () => {
    await createDraft(sample, testDb);
    await setDraftStatus(
      "test-draft-1",
      {
        status: "published",
        mediaId: "ig_123",
        slideBlobUrls: ["https://blob/0.png"],
      },
      testDb,
    );
    const row = await testDb.draft.findUnique({ where: { id: "test-draft-1" } });
    expect(row?.status).toBe(DraftStatus.published);
    expect(row?.mediaId).toBe("ig_123");
    expect(row?.publishedAt).not.toBeNull();
  });

  test("listDrafts filters by status", async () => {
    await createDraft(sample, testDb);
    await createDraft({ ...sample, id: "test-draft-2" }, testDb);
    await setDraftStatus(
      "test-draft-2",
      { status: "rejected" },
      testDb,
    );
    const pending = await listDrafts({ status: "pending" }, testDb);
    const rejected = await listDrafts({ status: "rejected" }, testDb);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("test-draft-1");
    expect(rejected).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- drafts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `lib/repos/drafts.ts`**

```ts
import "server-only";
import { Prisma, PrismaClient, DraftStatus } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";
import type { Draft, Slide } from "@/lib/content";
import { themeToDb, themeFromDb } from "@/lib/theme";

type DB = PrismaClient | Prisma.TransactionClient;

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

export async function getDraft(id: string, dbArg: DB = defaultDb): Promise<Draft | null> {
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
  await dbArg.$transaction(async (tx) => {
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
  });
}

export interface StatusUpdate {
  status: "pending" | "published" | "rejected";
  mediaId?: string;
  slideBlobUrls?: string[];
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
    },
  });
}

export interface ListFilter {
  status?: "pending" | "published" | "rejected";
}

export async function listDrafts(
  filter: ListFilter = {},
  dbArg: DB = defaultDb,
): Promise<Draft[]> {
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
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- drafts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/repos/drafts.ts test/repos/drafts.test.ts
git commit -m "feat(db): drafts repo with CRUD + status transitions"
```

---

## Task 7: Queue repo

**Files:**
- Create: `lib/repos/queue.ts`
- Create: `test/repos/queue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/repos/queue.test.ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import {
  createQueueItem,
  listQueue,
  updateQueueItem,
  deleteQueueItem,
  markQueueItemConsumed,
} from "@/lib/repos/queue";

describe("queue repo", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("createQueueItem appends with auto-incremented position", async () => {
    const a = await createQueueItem(
      { theme: "tech-decryption", angle: "A", cta: false },
      testDb,
    );
    const b = await createQueueItem(
      { theme: "human-pro", angle: "B", cta: true },
      testDb,
    );
    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
  });

  test("listQueue returns pending items ordered by position", async () => {
    await createQueueItem({ theme: "tech-decryption", angle: "A" }, testDb);
    await createQueueItem({ theme: "human-pro", angle: "B" }, testDb);
    const items = await listQueue({ consumed: false }, testDb);
    expect(items).toHaveLength(2);
    expect(items[0].angle).toBe("A");
  });

  test("markQueueItemConsumed flips consumed flag", async () => {
    const a = await createQueueItem({ theme: "tech-decryption", angle: "A" }, testDb);
    await markQueueItemConsumed(a.id, testDb);
    const remaining = await listQueue({ consumed: false }, testDb);
    expect(remaining).toHaveLength(0);
  });

  test("updateQueueItem + deleteQueueItem work", async () => {
    const a = await createQueueItem({ theme: "tech-decryption", angle: "A" }, testDb);
    await updateQueueItem(a.id, { angle: "A2", notes: "note" }, testDb);
    const items = await listQueue({}, testDb);
    expect(items[0].angle).toBe("A2");
    expect(items[0].notes).toBe("note");
    await deleteQueueItem(a.id, testDb);
    expect(await listQueue({}, testDb)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- queue`
Expected: FAIL.

- [ ] **Step 3: Write `lib/repos/queue.ts`**

```ts
import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
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

export async function markQueueItemConsumed(id: string, dbArg: DB = defaultDb): Promise<void> {
  await updateQueueItem(id, { consumed: true }, dbArg);
}

export async function deleteQueueItem(id: string, dbArg: DB = defaultDb): Promise<void> {
  await dbArg.queueItem.delete({ where: { id } });
}

function toRow(row: {
  id: string;
  theme: Prisma.$Enums.Theme;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- queue`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/repos/queue.ts test/repos/queue.test.ts
git commit -m "feat(db): queue repo with crud + position tracking"
```

---

## Task 8: Ideas repo

**Files:**
- Create: `lib/repos/ideas.ts`
- Create: `test/repos/ideas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/repos/ideas.test.ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import {
  createIdea,
  listIdeas,
  updateIdea,
  deleteIdea,
  markIdeaConsumed,
} from "@/lib/repos/ideas";

describe("ideas repo", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("create + list pending ideas", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    await createIdea({ text: "B", hardCta: true }, testDb);
    const items = await listIdeas({ consumed: false }, testDb);
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("A");
    expect(a.hardCta).toBe(false);
  });

  test("markIdeaConsumed removes from pending list", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    await markIdeaConsumed(a.id, testDb);
    expect(await listIdeas({ consumed: false }, testDb)).toHaveLength(0);
    expect(await listIdeas({ consumed: true }, testDb)).toHaveLength(1);
  });

  test("update + delete work", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    await updateIdea(a.id, { text: "A2", hardCta: true }, testDb);
    const items = await listIdeas({}, testDb);
    expect(items[0].text).toBe("A2");
    expect(items[0].hardCta).toBe(true);
    await deleteIdea(a.id, testDb);
    expect(await listIdeas({}, testDb)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ideas`
Expected: FAIL.

- [ ] **Step 3: Write `lib/repos/ideas.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ideas`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/repos/ideas.ts test/repos/ideas.test.ts
git commit -m "feat(db): ideas repo with crud"
```

---

## Task 9: Published queries repo

**Files:**
- Create: `lib/repos/published.ts`

Note: replaces `lib/published.ts` (Blob manifest). No new tests — pure read queries; covered by `lib/repos/drafts.ts` tests implicitly. We add a focused test for `getPillarDistribution`.

- [ ] **Step 1: Write the failing test**

```ts
// test/repos/published.test.ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import { createDraft, setDraftStatus } from "@/lib/repos/drafts";
import {
  listPublished,
  getLastPublished,
  getPillarDistribution,
  countPublishedThisWeek,
} from "@/lib/repos/published";
import type { Draft } from "@/lib/content";

function make(id: string, theme: Draft["theme"]): Draft {
  return {
    id,
    createdAt: "2026-04-11T10:00:00.000Z",
    theme,
    caption: "c",
    hashtags: [],
    slides: [
      { kind: "hook", title: "t" },
      { kind: "content", title: "t" },
    ],
  };
}

describe("published repo", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("getPillarDistribution over last N published", async () => {
    await createDraft(make("a", "tech-decryption"), testDb);
    await setDraftStatus("a", { status: "published", mediaId: "1" }, testDb);
    await createDraft(make("b", "build-in-public"), testDb);
    await setDraftStatus("b", { status: "published", mediaId: "2" }, testDb);

    const dist = await getPillarDistribution({ last: 7 }, testDb);
    expect(dist["tech-decryption"]).toBe(1);
    expect(dist["build-in-public"]).toBe(1);
    expect(dist["human-pro"]).toBe(0);
  });

  test("getLastPublished returns most recent", async () => {
    await createDraft(make("a", "tech-decryption"), testDb);
    await setDraftStatus("a", { status: "published", mediaId: "1" }, testDb);
    const last = await getLastPublished(testDb);
    expect(last?.id).toBe("a");
  });

  test("listPublished ordered desc", async () => {
    await createDraft(make("a", "tech-decryption"), testDb);
    await setDraftStatus("a", { status: "published", mediaId: "1" }, testDb);
    const list = await listPublished(testDb);
    expect(list).toHaveLength(1);
  });

  test("countPublishedThisWeek", async () => {
    await createDraft(make("a", "tech-decryption"), testDb);
    await setDraftStatus("a", { status: "published", mediaId: "1" }, testDb);
    expect(await countPublishedThisWeek(testDb)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- published`
Expected: FAIL.

- [ ] **Step 3: Write `lib/repos/published.ts`**

```ts
import "server-only";
import { Prisma, PrismaClient, DraftStatus } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";
import type { Draft, Theme } from "@/lib/content";
import { themeFromDb } from "@/lib/theme";

type DB = PrismaClient | Prisma.TransactionClient;

function rowToDraft(row: {
  id: string;
  createdAt: Date;
  theme: Prisma.$Enums.Theme;
  caption: string;
  hashtags: string[];
  slides: { kind: Prisma.$Enums.SlideKind; title: string; body: string | null; footer: string | null; position: number }[];
}): Draft {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    theme: themeFromDb(row.theme),
    caption: row.caption,
    hashtags: row.hashtags,
    slides: row.slides
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        kind: s.kind,
        title: s.title,
        body: s.body ?? undefined,
        footer: s.footer ?? undefined,
      })),
  };
}

export async function listPublished(dbArg: DB = defaultDb): Promise<Draft[]> {
  const rows = await dbArg.draft.findMany({
    where: { status: DraftStatus.published },
    orderBy: { publishedAt: "desc" },
    include: { slides: true },
  });
  return rows.map(rowToDraft);
}

export async function getLastPublished(dbArg: DB = defaultDb): Promise<Draft | null> {
  const row = await dbArg.draft.findFirst({
    where: { status: DraftStatus.published },
    orderBy: { publishedAt: "desc" },
    include: { slides: true },
  });
  return row ? rowToDraft(row) : null;
}

export async function countPublishedThisWeek(dbArg: DB = defaultDb): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return dbArg.draft.count({
    where: { status: DraftStatus.published, publishedAt: { gte: weekAgo } },
  });
}

export async function getPillarDistribution(
  opts: { last: number },
  dbArg: DB = defaultDb,
): Promise<Record<Theme, number>> {
  const rows = await dbArg.draft.findMany({
    where: { status: DraftStatus.published },
    orderBy: { publishedAt: "desc" },
    take: opts.last,
    select: { theme: true },
  });
  const dist: Record<Theme, number> = {
    "tech-decryption": 0,
    "build-in-public": 0,
    "human-pro": 0,
  };
  for (const r of rows) {
    dist[themeFromDb(r.theme)] += 1;
  }
  return dist;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- published`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/repos/published.ts test/repos/published.test.ts
git commit -m "feat(db): published repo (stats, distribution, last post)"
```

---

## Task 10: next-source repo with atomic priority logic

**Files:**
- Create: `lib/repos/next-source.ts`
- Create: `test/repos/next-source.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/repos/next-source.test.ts
import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import { pickNextSource } from "@/lib/repos/next-source";
import { createIdea } from "@/lib/repos/ideas";
import { createQueueItem } from "@/lib/repos/queue";
import { createDraft, setDraftStatus } from "@/lib/repos/drafts";

describe("next-source", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("ideas take priority over queue", async () => {
    await createIdea({ text: "idea A", hardCta: true }, testDb);
    await createQueueItem({ theme: "tech-decryption", angle: "queue A" }, testDb);

    const result = await pickNextSource(testDb);
    expect(result.kind).toBe("idea");
    if (result.kind === "idea") {
      expect(result.text).toBe("idea A");
      expect(result.hardCta).toBe(true);
    }
  });

  test("queue used when ideas empty", async () => {
    await createQueueItem(
      { theme: "tech-decryption", angle: "queue A", notes: "n", cta: true },
      testDb,
    );
    const result = await pickNextSource(testDb);
    expect(result.kind).toBe("queue");
    if (result.kind === "queue") {
      expect(result.angle).toBe("queue A");
      expect(result.theme).toBe("tech-decryption");
    }
  });

  test("fallback picks under-represented theme when both empty", async () => {
    // 2 tech-decryption + 1 build-in-public published → human-pro is most under-represented
    await createDraft(
      {
        id: "p1",
        createdAt: "2026-04-10T10:00:00.000Z",
        theme: "tech-decryption",
        caption: "c",
        hashtags: [],
        slides: [
          { kind: "hook", title: "t" },
          { kind: "content", title: "t" },
        ],
      },
      testDb,
    );
    await setDraftStatus("p1", { status: "published", mediaId: "1" }, testDb);
    await createDraft(
      {
        id: "p2",
        createdAt: "2026-04-10T10:00:00.000Z",
        theme: "tech-decryption",
        caption: "c",
        hashtags: [],
        slides: [
          { kind: "hook", title: "t" },
          { kind: "content", title: "t" },
        ],
      },
      testDb,
    );
    await setDraftStatus("p2", { status: "published", mediaId: "2" }, testDb);
    await createDraft(
      {
        id: "p3",
        createdAt: "2026-04-10T10:00:00.000Z",
        theme: "build-in-public",
        caption: "c",
        hashtags: [],
        slides: [
          { kind: "hook", title: "t" },
          { kind: "content", title: "t" },
        ],
      },
      testDb,
    );
    await setDraftStatus("p3", { status: "published", mediaId: "3" }, testDb);

    const result = await pickNextSource(testDb);
    expect(result.kind).toBe("fallback");
    if (result.kind === "fallback") {
      expect(result.theme).toBe("human-pro");
    }
  });

  test("picking an idea marks it consumed atomically", async () => {
    const idea = await createIdea({ text: "idea A", hardCta: false }, testDb);
    await pickNextSource(testDb);
    const fresh = await testDb.idea.findUnique({ where: { id: idea.id } });
    expect(fresh?.consumed).toBe(true);
  });

  test("picking a queue item marks it consumed atomically", async () => {
    const q = await createQueueItem({ theme: "tech-decryption", angle: "A" }, testDb);
    await pickNextSource(testDb);
    const fresh = await testDb.queueItem.findUnique({ where: { id: q.id } });
    expect(fresh?.consumed).toBe(true);
  });

  test("concurrent calls never return the same idea", async () => {
    await createIdea({ text: "only one", hardCta: false }, testDb);
    const [a, b] = await Promise.all([pickNextSource(testDb), pickNextSource(testDb)]);
    const kinds = [a.kind, b.kind].filter((k) => k === "idea");
    expect(kinds).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- next-source`
Expected: FAIL.

- [ ] **Step 3: Write `lib/repos/next-source.ts`**

```ts
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

export async function pickNextSource(dbArg: DB = defaultDb): Promise<NextSource> {
  return dbArg.$transaction(async (tx) => {
    // 1. Ideas first
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
      // Lost the race; fall through.
    }

    // 2. Queue next
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
    }

    // 3. Fallback: most under-represented theme over last 7 published
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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- next-source`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/repos/next-source.ts test/repos/next-source.test.ts
git commit -m "feat(db): atomic next-source priority picker (ideas > queue > fallback)"
```

---

## Task 11: Seed-from-files script

**Files:**
- Create: `scripts/seed-from-files.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/seed-from-files.ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { themeToDb } from "@/lib/theme";
import { parseIdeas } from "@/lib/ideas";
import { loadManifest } from "@/lib/published";
import { DraftSchema } from "@/lib/content";
import { QueueFileSchema } from "@/lib/queue";

async function seedQueue() {
  const file = path.join(process.cwd(), "content", "queue.json");
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = QueueFileSchema.parse(JSON.parse(raw));
    let position = 0;
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
    }
    console.log(`[seed] queue: ${parsed.items.length} items`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("[seed] queue: file not found, skipping");
      return;
    }
    throw err;
  }
}

async function seedIdeas() {
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

async function seedDrafts() {
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

  const { manifest } = await loadManifest();
  const publishedById = new Map(manifest.entries.map((e) => [e.draftId, e]));

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
        status: pub ? "published" : "pending",
        mediaId: pub?.mediaId ?? null,
        publishedAt: pub ? new Date(pub.publishedAt) : null,
        slideBlobUrls: pub?.blobSlideUrls ?? [],
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
    console.log(`[seed] draft ${draft.id}: inserted (${pub ? "published" : "pending"})`);
  }
}

async function main() {
  await seedQueue();
  await seedIdeas();
  await seedDrafts();
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the seed**

Run: `npm run db:seed`
Expected: logs listing queue/ideas/drafts counts matching what's on disk.

- [ ] **Step 3: Verify counts**

Run: `npm run db:studio`
Expected: rows match file counts.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-from-files.ts
git commit -m "feat(db): idempotent seed script from legacy fs sources"
```

---

## Task 12: Rewrite `/api/intake` to use drafts repo

**Files:**
- Modify: `app/api/intake/route.ts`

- [ ] **Step 1: Replace `saveDraft` call with repo**

```ts
// app/api/intake/route.ts
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { DraftSchema } from "@/lib/content";
import { createDraft } from "@/lib/repos/drafts";
import { sendDraftReviewEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = req.headers.get("x-intake-secret");
  if (!secret || secret !== env().INTAKE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = DraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid draft", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const draft = parsed.data;

  try {
    await createDraft(draft);
  } catch (err) {
    console.error("[intake] createDraft failed:", err);
    return NextResponse.json({ error: "persistence failed" }, { status: 500 });
  }

  await sendDraftReviewEmail(draft);

  return NextResponse.json({
    ok: true,
    draftId: draft.id,
    slides: draft.slides.length,
  });
}
```

- [ ] **Step 2: Smoke-test**

Run: `curl -X POST http://localhost:3000/api/intake -H "x-intake-secret: $INTAKE_SECRET" -H "content-type: application/json" -d @drafts/sample.json`
Expected: `{"ok":true,...}` (note: sample.json still exists at this point; Task 19 removes it).

- [ ] **Step 3: Commit**

```bash
git add app/api/intake/route.ts
git commit -m "refactor(intake): persist via prisma drafts repo"
```

---

## Task 13: Create `/api/next-source` route

**Files:**
- Create: `app/api/next-source/route.ts`
- Create: `test/api/next-source.test.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/next-source/route.ts
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pickNextSource } from "@/lib/repos/next-source";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = req.headers.get("x-intake-secret");
  if (!secret || secret !== env().INTAKE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const source = await pickNextSource();
    return NextResponse.json(source);
  } catch (err) {
    console.error("[next-source] failed:", err);
    return NextResponse.json({ error: "pick failed" }, { status: 503 });
  }
}
```

- [ ] **Step 2: Smoke-test auth**

Run: `curl -i http://localhost:3000/api/next-source`
Expected: 401.

Run: `curl -i http://localhost:3000/api/next-source -H "x-intake-secret: $INTAKE_SECRET"`
Expected: 200 with JSON body containing `kind`.

- [ ] **Step 3: Commit**

```bash
git add app/api/next-source/route.ts
git commit -m "feat(api): GET /api/next-source for scheduled task"
```

---

## Task 14: Rewrite `lib/publish.ts` + `/api/publish` + `/api/reject`

**Files:**
- Modify: `lib/publish.ts`
- Modify: `app/api/publish/route.ts`
- Modify: `app/api/reject/route.ts`

- [ ] **Step 1: Read current `lib/publish.ts`**

Run: `cat lib/publish.ts`
Expected: understand the current render → Blob → IG → manifest flow.

- [ ] **Step 2: Rewrite `lib/publish.ts`**

Replace the manifest Blob write with `setDraftStatus`:

```ts
import "server-only";
import { put } from "@vercel/blob";
import { getDraft, setDraftStatus } from "@/lib/repos/drafts";
import { publishCarousel } from "./instagram";
import { buildFullCaption } from "./content";
import { env } from "./env";

export async function publishDraft(draftId: string): Promise<{ mediaId: string }> {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error(`draft ${draftId} not found`);

  const base = env().PUBLIC_BASE_URL;
  const slideBlobUrls: string[] = [];

  for (let i = 0; i < draft.slides.length; i++) {
    const res = await fetch(`${base}/api/render/${draftId}/${i}`);
    if (!res.ok) throw new Error(`render ${i} failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const uploaded = await put(`slides/${draftId}/${i}.png`, buf, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    slideBlobUrls.push(uploaded.url);
  }

  const { mediaId } = await publishCarousel({
    imageUrls: slideBlobUrls,
    caption: buildFullCaption(draft),
  });

  await setDraftStatus(draftId, {
    status: "published",
    mediaId,
    slideBlobUrls,
  });

  return { mediaId };
}
```

Note: copy the exact current signature of `publishCarousel` — do not invent it. Re-check after reading the file.

- [ ] **Step 3: Update `/api/publish/route.ts`**

Keep the existing signed-link flow. Only change: imports pull from `lib/repos/drafts` for reads, not `lib/drafts`.

```ts
// relevant imports
import { getDraft } from "@/lib/repos/drafts";
import { publishDraft } from "@/lib/publish";
```

No other logic change — the route already calls `publishDraft(draftId)`.

- [ ] **Step 4: Update `/api/reject/route.ts`**

Add a `setDraftStatus` call before returning the confirmation HTML:

```ts
import { setDraftStatus, getDraft } from "@/lib/repos/drafts";
// ... after verifying token and id:
const draft = await getDraft(draftId);
if (!draft) {
  return new Response("Draft not found", { status: 404 });
}
await setDraftStatus(draftId, { status: "rejected" });
// ... existing confirmation HTML
```

- [ ] **Step 5: Smoke-test publish and reject**

Run: publish via the signed-link email on the `sample` draft.
Expected: IG carousel posted, `Draft.status=published` in DB Studio, `mediaId` populated.

Run: reject another draft via its link.
Expected: row present with `status=rejected`.

- [ ] **Step 6: Commit**

```bash
git add lib/publish.ts app/api/publish/route.ts app/api/reject/route.ts
git commit -m "refactor(publish): persist status in db, drop blob manifest write"
```

---

## Task 15: Rewrite `/overview` page to use Prisma repos

**Files:**
- Modify: `lib/stats.ts`
- Modify: `app/(dashboard)/overview/page.tsx`

- [ ] **Step 1: Rewrite `lib/stats.ts`**

Replace manifest loading with `listPublished` / `countPublishedThisWeek` / `getPillarDistribution`. Keep the `formatRelativeFrench` helper.

```ts
import "server-only";
import type { Theme } from "./content";
import {
  countPublishedThisWeek,
  getLastPublished,
  getPillarDistribution,
} from "./repos/published";
import { listQueue } from "./repos/queue";
import { listIdeas } from "./repos/ideas";

export interface OverviewStats {
  queuePending: number;
  ideasPending: number;
  publishedThisWeek: number;
  lastPublishedAt: string | null;
  lastPublishedTheme: Theme | null;
  distribution7d: Record<Theme, number>;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [queue, ideas, weekCount, last, dist] = await Promise.all([
    listQueue({ consumed: false }),
    listIdeas({ consumed: false }),
    countPublishedThisWeek(),
    getLastPublished(),
    getPillarDistribution({ last: 7 }),
  ]);

  return {
    queuePending: queue.length,
    ideasPending: ideas.length,
    publishedThisWeek: weekCount,
    lastPublishedAt: last ? last.createdAt : null,
    lastPublishedTheme: last ? last.theme : null,
    distribution7d: dist,
  };
}

export function formatRelativeFrench(isoDate: string): string {
  const delta = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(delta / (24 * 60 * 60 * 1000));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return "il y a 1 semaine";
  return `il y a ${Math.floor(days / 7)} semaines`;
}
```

- [ ] **Step 2: Update `app/(dashboard)/overview/page.tsx`**

Replace the existing fs/manifest reads with `getOverviewStats()`. The existing stat cards stay, only the data source changes.

- [ ] **Step 3: Smoke-test**

Run: `npm run dev`, visit `http://localhost:3000/overview`.
Expected: cards render correctly with DB-backed counts.

- [ ] **Step 4: Commit**

```bash
git add lib/stats.ts app/\(dashboard\)/overview/page.tsx
git commit -m "refactor(overview): stats via prisma repos"
```

---

## Task 16: Rewrite `/queue` page + CRUD server actions

**Files:**
- Create: `app/(dashboard)/queue/actions.ts`
- Modify: `app/(dashboard)/queue/page.tsx`

- [ ] **Step 1: Write `actions.ts`**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ThemeSchema } from "@/lib/content";
import {
  createQueueItem,
  updateQueueItem,
  deleteQueueItem,
} from "@/lib/repos/queue";

const CreateSchema = z.object({
  theme: ThemeSchema,
  angle: z.string().min(1).max(240),
  notes: z.string().max(800).optional(),
  cta: z.coerce.boolean().optional(),
});

const UpdateSchema = CreateSchema.partial();

export async function createQueueItemAction(formData: FormData) {
  const parsed = CreateSchema.parse(Object.fromEntries(formData));
  await createQueueItem({
    theme: parsed.theme,
    angle: parsed.angle,
    notes: parsed.notes,
    cta: parsed.cta,
  });
  revalidatePath("/queue");
}

export async function updateQueueItemAction(id: string, formData: FormData) {
  const parsed = UpdateSchema.parse(Object.fromEntries(formData));
  await updateQueueItem(id, parsed);
  revalidatePath("/queue");
}

export async function deleteQueueItemAction(id: string) {
  await deleteQueueItem(id);
  revalidatePath("/queue");
}
```

- [ ] **Step 2: Rewrite `queue/page.tsx`**

Read pending + consumed via `listQueue` (from `lib/repos/queue`), render a create form + an edit/delete row per item. Bind form actions to `createQueueItemAction` etc.

(Exact JSX preserved from existing layout — replace only the data source and add forms.)

- [ ] **Step 3: Smoke-test**

Run: visit `/queue`, create, edit, delete an item. Verify DB Studio matches.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/queue/
git commit -m "feat(queue): full crud via server actions"
```

---

## Task 17: Create `/ideas` page + CRUD server actions

**Files:**
- Create: `app/(dashboard)/ideas/page.tsx`
- Create: `app/(dashboard)/ideas/actions.ts`
- Modify: `components/sidebar.tsx`

- [ ] **Step 1: Write `actions.ts`**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createIdea,
  updateIdea,
  deleteIdea,
} from "@/lib/repos/ideas";

const CreateSchema = z.object({
  text: z.string().min(1).max(2000),
  hardCta: z.coerce.boolean().optional(),
});

export async function createIdeaAction(formData: FormData) {
  const parsed = CreateSchema.parse(Object.fromEntries(formData));
  await createIdea({ text: parsed.text, hardCta: parsed.hardCta ?? false });
  revalidatePath("/ideas");
  revalidatePath("/overview");
}

export async function updateIdeaAction(id: string, formData: FormData) {
  const parsed = CreateSchema.partial().parse(Object.fromEntries(formData));
  await updateIdea(id, parsed);
  revalidatePath("/ideas");
}

export async function deleteIdeaAction(id: string) {
  await deleteIdea(id);
  revalidatePath("/ideas");
  revalidatePath("/overview");
}
```

- [ ] **Step 2: Write `page.tsx`**

```tsx
import { listIdeas } from "@/lib/repos/ideas";
import {
  createIdeaAction,
  deleteIdeaAction,
} from "./actions";

export default async function IdeasPage() {
  const ideas = await listIdeas({ consumed: false });
  return (
    <div>
      <h1>Idées en stock</h1>
      <form action={createIdeaAction}>
        <textarea name="text" required maxLength={2000} />
        <label><input type="checkbox" name="hardCta" /> hard CTA</label>
        <button type="submit">Ajouter</button>
      </form>
      <ul>
        {ideas.map((i) => (
          <li key={i.id}>
            <pre>{i.text}</pre>
            {i.hardCta && <span>hard CTA</span>}
            <form action={deleteIdeaAction.bind(null, i.id)}>
              <button type="submit">Supprimer</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

(Apply the existing cream/teal palette and layout conventions; do not invent new styling. Match `/queue` page visual language.)

- [ ] **Step 3: Add `/ideas` to sidebar nav**

In `components/sidebar.tsx`, add an entry next to `/queue` with label "Idées".

- [ ] **Step 4: Smoke-test**

Visit `/ideas`, create an anecdote, verify `/overview` count updates, delete it.

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/ideas/ components/sidebar.tsx
git commit -m "feat(ideas): /ideas crud page + sidebar entry"
```

---

## Task 18: Rewrite `/library` + `/preview/[draftId]` with edit form

**Files:**
- Modify: `app/(dashboard)/library/page.tsx`
- Modify: `app/(dashboard)/preview/[draftId]/page.tsx`
- Create: `app/(dashboard)/preview/[draftId]/edit-form.tsx`
- Create: `app/(dashboard)/preview/[draftId]/actions.ts`

- [ ] **Step 1: Rewrite `library/page.tsx` to use `listDrafts`**

Replace `getDraftsWithStatus()` calls with `listDrafts({ status })` based on the `?tab=` query (`all` / `pending` / `published` / `rejected`). Map `all` to no filter.

- [ ] **Step 2: Write `preview/[draftId]/actions.ts`**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SlideSchema } from "@/lib/content";
import {
  getDraft,
  setDraftStatus,
  updateDraftContent,
} from "@/lib/repos/drafts";
import { publishDraft } from "@/lib/publish";

const EditSchema = z.object({
  caption: z.string().min(1).max(2200),
  hashtags: z.string().transform((s) =>
    s.split(/\s+/).map((t) => t.replace(/^#/, "")).filter(Boolean),
  ),
  slides: z.string().transform((raw, ctx) => {
    try {
      const parsed = JSON.parse(raw);
      return z.array(SlideSchema).min(2).max(10).parse(parsed);
    } catch (err) {
      ctx.addIssue({ code: "custom", message: (err as Error).message });
      return z.NEVER;
    }
  }),
});

export async function saveDraftAction(draftId: string, formData: FormData) {
  const parsed = EditSchema.parse(Object.fromEntries(formData));
  await updateDraftContent(draftId, parsed);
  revalidatePath(`/preview/${draftId}`);
}

export async function publishDraftAction(draftId: string) {
  await publishDraft(draftId);
  revalidatePath(`/preview/${draftId}`);
  redirect(`/preview/${draftId}?published=1`);
}

export async function rejectDraftAction(draftId: string) {
  const draft = await getDraft(draftId);
  if (!draft) return;
  await setDraftStatus(draftId, { status: "rejected" });
  revalidatePath(`/preview/${draftId}`);
  revalidatePath("/library");
  redirect("/library?tab=rejected");
}
```

- [ ] **Step 3: Write `edit-form.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { Draft } from "@/lib/content";
import {
  saveDraftAction,
  publishDraftAction,
  rejectDraftAction,
} from "./actions";

export function EditForm({ draft }: { draft: Draft }) {
  const [slides, setSlides] = useState(JSON.stringify(draft.slides, null, 2));
  return (
    <div>
      <form action={saveDraftAction.bind(null, draft.id)}>
        <label>
          Caption
          <textarea name="caption" defaultValue={draft.caption} maxLength={2200} />
        </label>
        <label>
          Hashtags (espaces)
          <input
            name="hashtags"
            defaultValue={draft.hashtags.map((h) => `#${h}`).join(" ")}
          />
        </label>
        <label>
          Slides JSON
          <textarea
            name="slides"
            value={slides}
            onChange={(e) => setSlides(e.target.value)}
            rows={20}
          />
        </label>
        <button type="submit">Save</button>
      </form>
      <form action={publishDraftAction.bind(null, draft.id)}>
        <button type="submit">Publier</button>
      </form>
      <form action={rejectDraftAction.bind(null, draft.id)}>
        <button type="submit">Rejeter</button>
      </form>
    </div>
  );
}
```

Note: JSON textarea for slides is intentionally minimal for v1. A richer slide editor is a follow-up.

- [ ] **Step 4: Update `preview/[draftId]/page.tsx`**

Replace the existing preview view: still show the slide thumbnails, but below them mount `<EditForm draft={...}>`. The preview's `status` banner reads `draft.status === "published"`.

- [ ] **Step 5: Smoke-test**

Visit `/preview/sample`, edit caption, save, verify in DB Studio. Publish. Reject a different draft.

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/library app/\(dashboard\)/preview
git commit -m "feat(library,preview): db-backed views + inline edit + publish/reject actions"
```

---

## Task 19: Delete legacy files

**Files:**
- Delete: `lib/drafts.ts`, `lib/queue.ts`, `lib/ideas.ts`, `lib/published.ts`
- Delete: `drafts/*.json`, `content/queue.json`, `content/ideas.md`

- [ ] **Step 1: Verify no imports remain**

Run: `grep -r "from \"@/lib/drafts\"" app lib components`
Expected: zero matches.

Run: `grep -r "from \"@/lib/queue\"" app lib components`
Expected: zero matches.

Run: `grep -r "from \"@/lib/ideas\"" app lib components`
Expected: zero matches.

Run: `grep -r "from \"@/lib/published\"" app lib components`
Expected: zero matches (except the seed script, which we also delete below).

- [ ] **Step 2: Delete files**

Run:
```bash
trash lib/drafts.ts lib/queue.ts lib/ideas.ts lib/published.ts
trash drafts content/queue.json content/ideas.md
```

- [ ] **Step 3: Delete the seed script**

The seed script imported the legacy files. It's a one-shot migration tool; delete it now that migration is done.

Run: `trash scripts/seed-from-files.ts`

Also remove the `db:seed` script from `package.json`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 6: Run all tests**

Run: `npm run test`
Expected: everything passes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove legacy fs/blob sources, keep db as single source of truth"
```

---

## Task 20: Update CLAUDE.md + AGENTS.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md` (if it contains flow docs)

- [ ] **Step 1: Update the Flow section in `CLAUDE.md`**

Replace the ASCII flow diagram: the Scheduled Task now calls `GET /api/next-source` before `POST /api/intake`. Add the DB as the source of truth.

- [ ] **Step 2: Update the Files table**

Remove `lib/drafts.ts`, `lib/queue.ts`, `lib/ideas.ts`, `lib/published.ts`. Add `lib/db.ts`, `lib/theme.ts`, `lib/repos/*.ts`.

- [ ] **Step 3: Update the Editorial priority order section**

Note that the priority (ideas > queue > fallback) is now enforced **server-side atomically** in `/api/next-source`, not in the Claude.ai prompt.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "docs: update claude.md for db-backed data layer"
```

---

## Task 21: Update Claude.ai Scheduled Task prompt

**Files:** (none — external prompt)

- [ ] **Step 1: Rewrite the task prompt**

The new prompt should:
1. `GET /api/next-source` with `x-intake-secret` header
2. Branch on `kind`:
   - `idea` → transform anecdote into a full draft
   - `queue` → use `angle` + `notes` + `theme`
   - `fallback` → generate exploratory post for the returned `theme`
3. Respect editorial rules (slide count, caption length, tone)
4. `POST /api/intake` with the finalized draft JSON

Document the new prompt in `docs/claude-task-prompt.md` so it's versioned.

- [ ] **Step 2: Commit**

```bash
git add docs/claude-task-prompt.md
git commit -m "docs: scheduled task prompt for db-backed flow"
```

---

## Task 22: Deploy + end-to-end verification

- [ ] **Step 1: Add env vars on Vercel**

Run:
```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
# Same for preview
```

- [ ] **Step 2: Deploy preview**

Run: `vercel deploy`
Expected: build succeeds (Prisma generate runs in `build` script).

- [ ] **Step 3: Run migration on prod DB**

Run: `DATABASE_URL=<prod> DIRECT_URL=<prod> prisma migrate deploy`
Expected: `init` migration applied to prod Neon branch.

- [ ] **Step 4: E2E test on preview URL**

- `GET /api/next-source` with header → returns a source
- Hand-craft a draft, `POST /api/intake` → draft exists in DB, email received
- Open `/library`, edit the draft, click Publier
- Verify IG carousel published, `Draft.status=published`, `mediaId` set
- Reject another draft, verify `status=rejected` in DB

- [ ] **Step 5: Update Claude.ai Scheduled Task to point at preview**

Run next Scheduled Task manually, verify end-to-end in production DB.

- [ ] **Step 6: Promote to production**

Run: `vercel promote <preview-url>`

---

## Self-review notes

- **Spec coverage:** All four entities (ideas, queue, drafts, published) have a repo + tests. `/api/next-source` atomicity is explicitly tested. Dashboard CRUD is covered for ideas, queue, and draft content. Rejection persistence is in Task 14. Manifest Blob removal is in Task 14 (write) + Task 19 (lib deletion).
- **Type consistency:** All repos import `Theme` from `@/lib/content` and use `themeToDb` / `themeFromDb`. `DraftStatus` enum comes from Prisma, mapped via string literals in app code.
- **No placeholders:** All code blocks are complete. The one exception is the JSX of `queue/page.tsx` and `preview/[draftId]/page.tsx`, where the plan says "preserve existing JSX, swap data source" — this is reasonable because the visual design is already locked in and not the subject of this migration.
- **Out of scope (intentionally):** Richer slide editor UI (plan keeps JSON textarea), draft email resend, approval status between pending and published, soft-delete for queue/ideas (hard delete via `deleteQueueItem` is acceptable since consume is the common path).
