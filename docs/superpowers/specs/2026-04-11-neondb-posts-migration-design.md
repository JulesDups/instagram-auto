# NeonDB posts migration — Design

Date: 2026-04-11
Status: Draft

## Context

Today the editorial pipeline uses four filesystem/blob sources of truth:

- `drafts/*.json` — one JSON per draft, committed to git
- `content/queue.json` — editorial queue (FIFO)
- `content/ideas.md` — raw anecdotes, consumed in priority over the queue
- `meta/published.json` — Vercel Blob manifest of published posts

Drafts are created by a Claude.ai Scheduled Task that reads `queue.json` and `ideas.md` from the GitHub repo, generates a draft, POSTs to `/api/intake`, then commits the updated queue/ideas files back.

This model has three pain points:

1. **No live editing.** Adjusting a draft's wording before publishing requires editing a JSON file and committing.
2. **Rejection is not persisted.** `/api/reject` returns an HTML confirmation but nothing is stored; there is no "rejected" history.
3. **Coupling to git.** Claude.ai has to read + write the repo to run, which ties content generation to GitHub permissions and redeploy cycles.

## Goals

- Move drafts, editorial queue, ideas, and published history to NeonDB (Prisma).
- Allow full CRUD on drafts (edit slides/caption/hashtags), ideas, and queue items from the dashboard.
- Persist the `rejected` status in DB for historical tracking.
- Let Claude.ai Scheduled Task operate via HTTP only (no repo read/write).
- Keep publication manual: the user clicks "Publier" in the app. No auto-publish cron.

## Non-goals

- No MCP server. Claude.ai Scheduled Tasks already supports HTTP tool calls; an MCP layer would add hosting/auth complexity for zero functional gain.
- No automatic publication cron. Generation is scheduled, publication stays manual.
- No approval workflow beyond the three statuses below.
- No migration of the existing email-click publish flow. The signed-link flow keeps working against the new DB-backed draft store.

## Architecture

### Data model (Prisma on Neon Postgres)

```prisma
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
  id            String       @id // kebab-case slug, not cuid
  theme         Theme
  caption       String
  hashtags      String[]
  status        DraftStatus  @default(pending)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  publishedAt   DateTime?
  mediaId       String?      // Instagram media id
  slideBlobUrls String[]     // Vercel Blob URLs of rendered slides
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

Rationale:

- `Draft.id` stays a kebab-case slug (not cuid) to keep render URLs stable and readable: `/api/render/my-post-slug/0`.
- `Slide` is a separate table with `@@unique([draftId, position])` so reordering is a simple position swap.
- `Idea.consumed` and `QueueItem.consumed` are soft flags (not deletes) to preserve history and allow "unconsume" for debugging.
- `Draft.slideBlobUrls` is a plain `String[]` — slides are always published as a set, we never need to query individual URLs.
- `Theme` enum values use underscores (Postgres enum constraint). The app maps to/from the hyphenated public form (`tech-decryption` etc.) in a single helper.

### REST endpoints

All write endpoints authenticated by `x-intake-secret` header (existing pattern), except `/api/publish` and `/api/reject` which keep HMAC-signed links (existing pattern), and dashboard routes which use the session cookie.

| Method | Path                  | Auth              | Purpose                                                                                                                                                                 |
| ------ | --------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/next-source`    | `x-intake-secret` | Atomically selects the next source (ideas > queue > fallback), marks it `consumed=true`, returns `{ kind: "idea" \| "queue" \| "fallback", theme, angle, notes?, hardCta? }`. |
| POST   | `/api/intake`         | `x-intake-secret` | Creates `Draft` + `Slide[]` in DB with `status=pending`. Sends review email. Unchanged externally.                                                                      |
| POST   | `/api/publish`        | signed link       | Renders → Blob → IG → updates Draft (`status=published`, `mediaId`, `publishedAt`, `slideBlobUrls`).                                                                    |
| POST   | `/api/reject`         | signed link       | Sets `Draft.status=rejected`.                                                                                                                                           |

`/api/next-source` atomicity: executed inside a Prisma transaction. The fallback branch (neither ideas nor queue have pending entries) does not mark anything as consumed — it just returns the most under-represented theme over the last 7 published drafts.

### Dashboard (Server Components + Server Actions)

| Route                    | Feature                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `/overview`              | Stats read directly from Prisma: pending count, published this week, last post, 7-day pillar distribution, ideas in stock. |
| `/queue`                 | CRUD on `QueueItem`. Create/edit/delete/reorder. Toggle `consumed`.                                                          |
| `/ideas`                 | CRUD on `Idea`. Create/edit/delete. Toggle `hardCta`. Toggle `consumed`.                                                     |
| `/library`               | List `Draft` filtered by `status` tab (`all` / `pending` / `published` / `rejected`).                                        |
| `/preview/[id]`          | Inline edit of slides (title/body/footer, reorder, add/delete), caption, hashtags. Theme and slide `kind` are read-only. Buttons: Save, Publier, Rejeter. |

Editable fields on a draft: everything except `theme` and `Slide.kind`. Slides can be reordered, added, or deleted (min 2, max 10, enforced via Zod on save).

### Storage / filesystem migration

- Delete: `drafts/`, `content/queue.json`, `content/ideas.md`.
- Delete libs: `lib/drafts.ts`, `lib/queue.ts`, `lib/ideas.ts`, `lib/published.ts`.
- Replace with: `lib/db.ts` (Prisma client singleton), `lib/repos/drafts.ts`, `lib/repos/queue.ts`, `lib/repos/ideas.ts`, `lib/repos/published.ts`.
- Vercel Blob is **still used** for slide image hosting: Instagram Graph API requires publicly fetchable URLs and localhost/signed URLs are rejected. Only the `meta/published.json` manifest object in Blob disappears — slide PNGs keep being uploaded exactly as today, and their URLs are now stored in `Draft.slideBlobUrls` instead of a separate manifest.

### Data flow (new)

```
Claude.ai Scheduled Task
  │ GET /api/next-source (x-intake-secret)
  │ ← { kind, theme, angle, notes?, hardCta? }   # entry marked consumed in DB
  │
  │ (generate draft content respecting editorial rules)
  │
  │ POST /api/intake (x-intake-secret)
  ▼
/api/intake
  ├─ validate DraftSchema
  ├─ Prisma tx: create Draft + Slides (status=pending)
  └─ send Resend email with signed publish/reject links
           │
           │ user clicks "Publier" in email OR in dashboard /preview/[id]
           ▼
      /api/publish (signed link)
      ├─ render slides via /api/render/[id]/[index]
      ├─ upload PNGs to Vercel Blob
      ├─ Instagram Graph API carousel publish flow
      └─ Prisma: update Draft { status=published, mediaId, publishedAt, slideBlobUrls }
```

## Migration plan

1. Provision Neon database via `neon` CLI.
2. Add Prisma, generate client, run `prisma migrate dev --name init`.
3. Write `scripts/seed-from-files.ts` that reads the existing filesystem/blob sources and inserts them in DB. Idempotent: re-runnable without duplicates (skip records whose id already exists). Manifest loading reuses the existing `loadManifest()` logic before it's deleted.
4. Run the seed script locally against Neon, verify counts match.
5. Rewrite `lib/` modules to use Prisma repos.
6. Update API routes and dashboard pages to use the new repos.
7. Delete the old files and libs in the same commit as the repo updates to avoid leaving dead code.
8. Update `CLAUDE.md` and `AGENTS.md` to reflect the new data flow.
9. Deploy to Vercel preview, verify end-to-end with the sample draft.
10. Update the Claude.ai Scheduled Task prompt to call `/api/next-source` + `/api/intake` instead of reading the repo.

## Testing

- Unit tests for `/api/next-source` priority logic (ideas > queue > fallback) using a Prisma test database.
- Unit test for atomicity: two concurrent calls to `/api/next-source` must not return the same entry.
- Integration test: seed script against a scratch Neon branch, verify row counts equal file entry counts.
- Manual: full flow with the `sample` draft on Vercel preview (intake → edit in dashboard → publish → verify `Draft.status` and `mediaId` in DB).

## Error handling

- `/api/next-source` failure (DB down) → 503, Claude.ai task retries next day. Nothing is marked consumed because the transaction rolls back.
- `/api/intake` failure after draft insert but before email → draft exists in DB as `pending` and is visible in `/library`; email can be resent from the dashboard (future feature, not v1).
- Publish failure → `Draft.status` stays `pending`, error logged, user sees the error banner in `/preview/[id]` (existing UX).

## Open questions

None at spec time. Prisma connection pooling (Neon pooler vs direct) is a standard Neon+Prisma setup decision and will be handled at implementation time per the Neon docs.
