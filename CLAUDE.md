@AGENTS.md

# instagram-auto

Pipeline carousel Instagram. Claude.ai task → GET /api/next-source → POST /api/intake → Neon Postgres → Resend email validation → Instagram Graph API.

Compte cible : Creator account (handle dans `.env.local`). Cadence : 4-5 posts / semaine. CTA contextuel par pilier (1 post sur 3).

## Editorial strategy

| Pillar (`theme`) | Share | Description |
|---|---|---|
| `tech-decryption` | 45% | Frameworks, libs, écosystème Vercel, outils dev, comparaisons X vs Y, pièges classiques, prises de position techniques. |
| `build-in-public` | 30% | Side-project en cours (`instagram-auto`) : décisions d'archi, bugs marquants, before/after, métriques, abandons. |
| `human-pro` | 25% | Retours d'expérience freelance, conseils juniors, setup, ressources, transition salarié→freelance. Toujours avec apprentissage transférable. |

Hard rules pour la génération (Claude.ai task prompt) :
- Jamais deux posts du même pilier à la suite
- Slide 1 = hook spécifique : observation inattendue, question que personne ne pose, stat surprenante, affirmation tranchée factuelle, ou contrarien sincère. Pas de clickbait creux.
- 5–7 slides max, caption ≤ 150 mots
- 1 post sur 3 contient le CTA contextuel adapté au pilier (champ `cta: true` dans la queue ou détecté par Claude.ai)
- Les autres posts terminent par une question ouverte en commentaire
- Tutoiement, vocabulaire tech en anglais, pas de "En tant que…", pas de fausse humilité, emojis interdits
- Ton : sincère, informé, précis, chaleureux. Personnel et honnête, jamais performatif — le vécu sert d'illustration, pas de sujet en soi
- Précision du mot juste : chaque terme porte son poids réel, pas de hedging ni de formules creuses
- Vulnérabilité autorisée (adossée à un enseignement transférable) dans build-in-public et human-pro, exception rare dans tech-decryption

Audience : pairs devs + juniors francophones. Positionnement : dev freelance FR qui montre son travail, ses choix et leurs conséquences. Décryptage tech + build in public.

## Editorial priority order

When the Scheduled Task runs, it selects the next draft source in this order :

1. **`Idea` table** — pop the first raw anecdote, transform into a full draft. Marked consumed in DB.
2. **`QueueItem` table** — if ideas table is empty, pop the next queue item respecting pillar alternation.
3. **Fallback rotation** — if both are empty, pick the pillar most under-represented over the last 7 published drafts and generate an exploratory sujet.

The dashboard `/overview` shows the current stock of ideas as a stat card.

This priority order is enforced atomically server-side in `lib/repos/next-source.ts` via a Serializable transaction — not in the Claude.ai prompt.

## Flow

```
Claude.ai Scheduled Task ──GET x-intake-secret──▶ /api/next-source
                                                         │ atomic pick (ideas > queue > fallback)
                                                         │ source marked consumed in DB
                                                         ▼
                                              Claude.ai generates draft JSON
                                                         │
                                              ──POST x-intake-secret──▶ /api/intake
                                                         │ DraftSchema (Zod) → Prisma Draft insert (status=pending)
                                                         ▼
                                              Email à EMAIL_TO (.env.local)
                                                         │ click signed link
                               ┌─── /api/publish ───┴─── /api/reject
                               │ verifyDraftToken (HMAC SHA256, 7d TTL)
                               │                         │ → sets Draft status=rejected in DB
                               ▼
                       publishDraft(draftId)
                       1. fetch /api/render/{id}/{0..N} → PNG 1080×1080
                       2. put → Vercel Blob (public URL, IG needs internet-fetchable URLs)
                       3. publishCarousel → Graph API v21.0 (children → parent → publish)
                       4. set Draft status=published, mediaId, publishedAt, permalink in DB
                       5. return media_id
```

## Files (read these instead of grepping)

### Lib

| Path | Role |
|---|---|
| `lib/env.ts` | Zod-typed env, lazy cached, throws if invalid |
| `lib/auth.ts` | Cookie HMAC SHA256 sign/verify + `comparePassword` (timingSafeEqual), COOKIE_NAME `dashboard-session`, TTL 30d |
| `lib/content.ts` | `DraftSchema`, `SlideSchema`, `Theme` (3 pillars), `themeLabel`, `buildFullCaption`, `parseEmphasis`, `PILLAR_TARGET_DISTRIBUTION` |
| `lib/db.ts` | Prisma client singleton (import `server-only`) |
| `lib/theme.ts` | Enum mapping between URL-safe pillar slugs (`tech-decryption`) and Prisma enum values (`tech_decryption`) |
| `lib/repos/drafts.ts` | `createDraft`, `getDraft`, `updateDraftContent`, `setDraftStatus`, `listDrafts`. Returns `PersistedDraft` (Draft + status/mediaId/publishedAt/permalink) |
| `lib/repos/queue.ts` | CRUD on `QueueItem` |
| `lib/repos/ideas.ts` | CRUD on `Idea` |
| `lib/repos/published.ts` | Stats queries: `listPublished`, `getLastPublished`, `countPublishedThisWeek`, `getPillarDistribution` |
| `lib/repos/next-source.ts` | Atomic `pickNextSource()` implementing priority ideas > queue > fallback (Serializable isolation + P2034 retry) |
| `lib/stats.ts` | Overview helpers: weekly counts, last-7d distribution vs 45/30/25 target, `formatRelativeFrench` |
| `lib/instagram.ts` | Graph API client + `waitForContainerReady` polling + `publishCarousel` |
| `lib/publish.ts` | `publishDraft(draftId)` orchestration render→Blob→IG→DB update |
| `lib/email.ts` | Resend HTML draft review email with inline slide previews |
| `lib/tokens.ts` | `createDraftToken` / `verifyDraftToken`, HMAC SHA256, base64url, 7d default TTL |

### Middleware

| Path | Role |
|---|---|
| `proxy.ts` (root) | Next.js 16 middleware. **Must use `export default function proxy(...)`.** Gates UI routes behind session cookie, exempts `/api/*`, `/_next/*`, `/favicon`, `/login`. Redirects `/` → `/overview` when authed. |

### App routes (public)

| Path | Role |
|---|---|
| `app/login/page.tsx` | Login form (no auth) |
| `app/api/auth/login/route.ts` | POST password → signed session cookie |
| `app/api/auth/logout/route.ts` | POST → clear cookie |
| `app/api/next-source/route.ts` | GET, auth `x-intake-secret`, returns `{ kind: "idea"\|"queue"\|"fallback", ... }` and atomically marks source consumed in DB |
| `app/api/intake/route.ts` | POST, validates `x-intake-secret`, parses Draft via Zod, persists via Prisma (status=pending), sends email |
| `app/api/render/[draftId]/[index]/route.tsx` | `next/og` `ImageResponse`, runtime nodejs |
| `app/api/publish/route.ts` | GET signed link, runtime nodejs, `maxDuration = 300` |
| `app/api/reject/route.ts` | GET signed link, sets Draft status=rejected in DB, returns confirmation HTML |

### App routes (behind auth, route group `(dashboard)`)

| Path | Role |
|---|---|
| `app/(dashboard)/layout.tsx` | Sidebar fixed 240px + max-w 1280px main, cream theme |
| `app/(dashboard)/overview/page.tsx` | 4 stat cards: Queue restante / Publiés cette semaine / Dernier post / Distribution 7 derniers jours |
| `app/(dashboard)/ideas/page.tsx` | CRUD UI for `Idea` table (add/edit/delete raw anecdotes) |
| `app/(dashboard)/queue/page.tsx` | Full CRUD on `QueueItem` (up next + published history + theme counts) |
| `app/(dashboard)/library/page.tsx` | Tabs `All` / `Pending` / `Published` / `Rejected`, grid 3-col of draft cards |
| `app/(dashboard)/preview/[draftId]/page.tsx` | Slides grid + publish status banner (mediaId + IG link) + caption |
| `app/(dashboard)/preview/[draftId]/edit-form.tsx` | **Client.** Inline draft slide editor |
| `app/(dashboard)/preview/[draftId]/actions.ts` | Server Actions for draft update + reject |

### Components (Server by default, Client marked with `"use client"`)

| Path | Role |
|---|---|
| `components/sidebar.tsx` | **Client.** Fixed-left nav with `usePathname()` for active state + logout form |
| `components/pillar-badge.tsx` | Server. Small colored badge per pillar (cream/teal/tan/red palette) |
| `components/stat-card.tsx` | Server. Generic card (label/value/hint/children) |
| `components/distribution-bar.tsx` | Server. 3-segment horizontal bar with optional labels + target indicators |
| `components/draft-card.tsx` | Server. Thumbnail via `/api/render/{id}/0` + title + pillar + published state |
| `components/tabs.tsx` | Server. URL-based tabs via `?tab=` query param |

### Content

All content now lives in Neon Postgres. See `prisma/schema.prisma` for the schema. Fallback fixtures for tests in `test/**`.

## Brand palette

| Token | Hex | Usage |
|---|---|---|
| Text | `#1C343A` | titles, body on cream slides; bg on CTA slide |
| Background | `#FBFAF8` | bg on hook/content slides; text on CTA slide |
| Accent | `#D4A374` | theme labels, indicators, rules, swipe arrow, CTA footer; also serves as highlight on CTA's dark bg |
| Highlight | `#BF2C23` | punchline emphasis on hook/content slides only — too low contrast on dark CTA |

Body text uses `rgba(28, 52, 58, 0.65–0.72)` on cream and `rgba(251, 250, 248, 0.75)` on dark.

## Editorial queue

Each `QueueItem` has `theme` (one of the three pillars), `angle` (the post premise / hook to develop), optional `notes` (extra context for Claude.ai task to ground the content authentically), and optional `cta: true` to mark a hard CTA post with formulation contextuelle par pilier (default = soft CTA = open question in caption). See `prisma/schema.prisma` for the full shape.

Claude.ai task workflow:
1. `GET /api/next-source` with `x-intake-secret` header → atomic pick (ideas > queue > fallback); source marked consumed in DB
2. Generate the Draft JSON respecting all editorial rules above
3. `POST /api/intake` with the Draft JSON and `x-intake-secret` header

`/queue` page on the deployed app shows the live state: pending items (FIFO order with index, theme badge, notes preview, CTA flag) and full CRUD.

## Title/body emphasis convention

Wrap a punchline word or phrase in `**markdown**` inside `slide.title` or `slide.body`. The `EmphasizedText` component (`templates/emphasized-text.tsx`) parses it via `parseEmphasis()` from `lib/content.ts` and renders the marked words in `highlightColor`. Hook/content slides pass `#BF2C23`; CTA slides pass `#D4A374` for contrast on dark bg.

Use sparingly: 1 punchline per slide max, mirroring the user's site (`Vous créez, **je code.**`).

## State and identifiers

| Key | Status |
|---|---|
| Meta dev app name | `Hegoatek-Posts` (Facebook Login flow, NOT Instagram Login) |
| Facebook page link | done — Creator account, page admin = personal FB account |
| Long-lived page token | obtained via `oauth/access_token` then `me/accounts` (no expiry) |
| All Meta IDs and secrets | in `.env.local` (gitignored) |
| Resend domain | verified, reused from `~/Documents/dev/actif/Portfolio/.env` |
| `INTAKE_SECRET`, `DRAFT_TOKEN_SECRET` | random 32-byte hex, generated at scaffold |
| `DASHBOARD_PASSWORD` | random, in `.env.local` and Vercel env vars (prod + dev) |
| `DASHBOARD_COOKIE_SECRET` | 32-byte hex HMAC secret, same storage |
| `BLOB_READ_WRITE_TOKEN` | provisioned via Vercel dashboard, store `instagram-auto-prod` |
| Vercel link | `julesdups-project/instagram-auto`, alias `https://instagram-auto.vercel.app` |
| GitHub repo | `github.com/JulesDups/instagram-auto` (private) |

## Gotchas (cost real time if missed)

- **Next.js 16 `proxy.ts` requires `export default`**. An `export function proxy(...)` named export compiles and lints fine but crashes at runtime with `TypeError: adapterFn is not a function` on every request. Always use `export default function proxy(request: NextRequest) { ... }`.
- **`export const runtime = "nodejs"` is forbidden on `proxy.ts`**. Next.js 16 forces Node.js runtime for proxy files and throws "Route segment config is not allowed in Proxy file" at boot if you try. Omit the runtime export.
- **Turbopack cache corruption**. If routes start returning 500 with `adapterFn is not a function` out of nowhere, `rm -rf .next` and restart the dev server. The cache gets into a stale state when middleware/proxy files change significantly.
- **Turbopack workspace root detection in git worktrees**. Without `turbopack.root` in `next.config.ts`, Next picks the parent repo's `package-lock.json` and serves the wrong files. Pin it to `import.meta.dirname`.
- **Vercel link is per-worktree**. `.vercel/` is gitignored so it's not shared between worktrees. When creating a new worktree, copy `.vercel/` from the main repo or re-run `vercel link`.
- **`vercel env pull` needs a linked worktree**. Without it, you can't fetch Blob tokens and the dev server crashes when `/overview` tries to read the manifest.
- **Next.js 16 breaking** : `middleware.ts` → `proxy.ts`, `params`/`searchParams`/`cookies()`/`headers()` are async, `unstable_cache` → `'use cache'` directive, `experimental.ppr` → top-level `cacheComponents: true`.
- **Satori (next/og)** : every flex container needs explicit `display: "flex"` (otherwise silent layout breakage). No Tailwind class strings — use inline `style` objects. Limited CSS subset, no `gap` on non-flex, no transforms. Use `rgba()` for opacity, not `opacity` prop on parent.
- **Instagram Graph carousel** : image URLs MUST be publicly fetchable (localhost fails — use Vercel Blob or ngrok). Containers are async — must poll `status_code` until `FINISHED` before publish, can take 10–60s. Carousel children: min 2, max 10. Use Graph API `v21.0`.
- **Resend** : `EMAIL_FROM` must be on a verified domain.
- **`.gitignore`** : `.env*` is ignored but `!.env*.example` is allowed through (added manually at scaffold).
- **Vercel hooks** : auto-skill-loading fires aggressively on `app/**`, `next.config.*`, `.env.*`, `@vercel/blob` imports. Tolerate or use the suggested skills.
- **Neon + Prisma** : `DATABASE_URL` is the pooled connection (for runtime), `DIRECT_URL` is the direct connection (for migrations). Both must be set in `.env.local` and Vercel env vars. Tests use `TEST_DATABASE_URL` (separate Neon branch) — see `vitest.config.ts` for file parallelism disabled to avoid shared-DB leakage.
- **`server-only` + Vitest** : `lib/*` files use `import "server-only"` which Next.js resolves at build time. Vitest can't resolve it, so `vitest.config.ts` aliases it to `test/helpers/server-only-stub.ts` (no-op export).

## Commands

```bash
npm run dev          # turbopack, :3000
npm run build        # turbopack production
npm run lint         # eslint
npx tsc --noEmit     # type-check only
npm run test         # vitest against the test Neon branch (TEST_DATABASE_URL)
npm run db:migrate -- --name <name>  # create + apply a Prisma migration
npm run db:studio    # launch Prisma Studio
```

## Local test

- `npm run test` — full vitest suite against the Neon test branch (`TEST_DATABASE_URL`)
- `npm run db:studio` — inspect / edit rows in Prisma Studio
- Seed a draft via `POST /api/intake` (header `x-intake-secret`) or insert directly in Studio, then visit `/preview/<id>` and `/api/render/<id>/<index>` to verify rendering

## Next pending steps (in order)

1. Deploy preview → set `DATABASE_URL` / `DIRECT_URL` on Vercel → run `prisma migrate deploy` on prod branch
2. Update Claude.ai Scheduled Task prompt to use `GET /api/next-source` before generating each draft

## Graph API reference (carousel publish flow)

```
# 1. Per slide (parallel ok):
POST /v21.0/{ig_user_id}/media?image_url=…&is_carousel_item=true&access_token=… → child_id

# 2. Wait until status_code === FINISHED for each child:
GET  /v21.0/{child_id}?fields=status_code&access_token=…

# 3. Create parent carousel:
POST /v21.0/{ig_user_id}/media?media_type=CAROUSEL&children=id1,id2,…&caption=…&access_token=… → parent_id

# 4. Wait for parent FINISHED, then publish:
POST /v21.0/{ig_user_id}/media_publish?creation_id={parent_id}&access_token=… → media_id
```

## Architecture choices (don't re-litigate without good reason)

- Content generation runs in **Claude.ai Scheduled Tasks**, not in this app — the app only receives via webhook. No `ANTHROPIC_API_KEY` here.
- Drafts and editorial state (queue, ideas, published history) live in **Neon Postgres via Prisma**. Accessed via `lib/repos/*`. No filesystem content, no Blob manifest.
- **Email as garde-fou** with HMAC signed links for publish/reject. No Slack, no Telegram (user pref).
- Slides rendered via **`next/og`** in inline-styled React (Satori). No Canva, no Bannerbear, no Playwright.
- **Vercel Blob** for slide image hosting (Instagram needs public URLs, localhost can't be used in dev). No longer used for `meta/published.json` — published state is in Postgres.
- **Single project, no monorepo** → `vercel link` (not `--repo`).
