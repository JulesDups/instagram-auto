@AGENTS.md

# instagram-auto

Pipeline carousel Instagram. Claude.ai task → GitHub commit → Vercel webhook → Resend email validation → Instagram Graph API.

Compte cible : Creator account (handle dans `.env.local`). Cadence : 4-5 posts / semaine. CTA unique : "Travailler avec moi → bio".

## Editorial strategy

| Pillar (`theme`) | Share | Description |
|---|---|---|
| `tech-decryption` | 50% | Frameworks, libs, écosystème Vercel, outils dev, comparaisons X vs Y, pièges classiques, hot takes. |
| `build-in-public` | 30% | Side-project en cours (`instagram-auto`) : décisions d'archi, bugs marquants, before/after, métriques, abandons. |
| `human-pro` | 20% | Retours d'expérience freelance, conseils juniors, setup, ressources, transition salarié→freelance. Toujours avec apprentissage transférable. |

Hard rules pour la génération (Claude.ai task prompt) :
- Jamais deux posts du même pilier à la suite
- Slide 1 = hook contrarien, stat surprenante ou affirmation tranchée
- 5–7 slides max, caption ≤ 150 mots
- 1 post sur 3 contient le CTA "Travailler avec moi → bio" (champ `cta: true` dans la queue ou détecté par Claude.ai)
- Les autres posts terminent par une question ouverte en commentaire
- Tutoiement, vocabulaire tech en anglais, pas de "En tant que…", pas de fausse humilité, emojis interdits
- Ton : sincère, informé, direct, personnel mais jamais autobiographique

Audience : pairs devs + juniors francophones. Positionnement : dev full-stack freelance FR, décryptage tech + build in public.

## Flow

```
Claude.ai Scheduled Task ──POST x-intake-secret──▶ /api/intake
                                                         │ DraftSchema (Zod) → drafts/{id}.json → Resend email
                                                         ▼
                                              Email à EMAIL_TO (.env.local)
                                                         │ click signed link
                               ┌─── /api/publish ───┴─── /api/reject
                               │ verifyDraftToken (HMAC SHA256, 7d TTL)
                               ▼
                       publishDraft(draftId)
                       1. fetch /api/render/{id}/{0..N} → PNG 1080×1080
                       2. put → Vercel Blob (public URL, IG needs internet-fetchable URLs)
                       3. publishCarousel → Graph API v21.0 (children → parent → publish)
                       4. return media_id
```

## Files (read these instead of grepping)

| Path | Role |
|---|---|
| `lib/env.ts` | Zod-typed env, lazy cached, throws if invalid |
| `lib/content.ts` | `DraftSchema`, `SlideSchema`, `Theme` (3 pillars), `themeLabel`, `buildFullCaption`, `parseEmphasis`, `PILLAR_TARGET_DISTRIBUTION` |
| `lib/drafts.ts` | fs I/O on `drafts/*.json` (`loadDraft`, `listDraftIds`, `saveDraft`) |
| `lib/queue.ts` | fs I/O on `content/queue.json` (`loadQueue`, `saveQueue`, `QueueItemSchema`) |
| `lib/instagram.ts` | Graph API client + `waitForContainerReady` polling + `publishCarousel` |
| `lib/publish.ts` | `publishDraft(draftId)` orchestration render→Blob→IG |
| `lib/email.ts` | Resend HTML draft review email with inline slide previews |
| `lib/tokens.ts` | `createDraftToken` / `verifyDraftToken`, HMAC SHA256, base64url, 7d default TTL |
| `templates/slide-hook.tsx` | Cream bg + dark teal title + tan accent label + swipe footer |
| `templates/slide-content.tsx` | Cream bg + numbered indicator + tan accent rule |
| `templates/slide-cta.tsx` | Inverted: dark teal bg + cream text + tan accent (visual close) |
| `app/api/intake/route.ts` | POST, validates `x-intake-secret`, parses Draft, persists, sends email |
| `app/api/render/[draftId]/[index]/route.tsx` | `next/og` `ImageResponse`, runtime nodejs |
| `app/api/publish/route.ts` | GET signed link, runtime nodejs, `maxDuration = 300` |
| `app/api/reject/route.ts` | GET signed link, returns confirmation HTML |
| `app/preview/[draftId]/page.tsx` | Server component grid preview, async `params` |
| `app/page.tsx` | Lists drafts via `listDraftIds()` |
| `app/queue/page.tsx` | Editorial dashboard: queue (up next) + published (history), theme counts |
| `content/queue.json` | Editorial queue (FIFO), seeded with 15 items across the 3 pillars |
| `drafts/sample.json` | 7-slide test draft, theme `tech-decryption` |

## Brand palette

| Token | Hex | Usage |
|---|---|---|
| Text | `#1C343A` | titles, body on cream slides; bg on CTA slide |
| Background | `#FBFAF8` | bg on hook/content slides; text on CTA slide |
| Accent | `#D4A374` | theme labels, indicators, rules, swipe arrow, CTA footer; also serves as highlight on CTA's dark bg |
| Highlight | `#BF2C23` | punchline emphasis on hook/content slides only — too low contrast on dark CTA |

Body text uses `rgba(28, 52, 58, 0.65–0.72)` on cream and `rgba(251, 250, 248, 0.75)` on dark.

## Editorial queue (`content/queue.json`)

```json
{
  "items": [
    {
      "theme": "tech-decryption",
      "angle": "Next.js Cache Components vs ISR : quand utiliser quoi en 2026",
      "notes": "Démystifier 'use cache directive', cacheLife, cacheTag. Trade-offs réels.",
      "cta": true
    }
  ]
}
```

Each item has `theme` (one of the three pillars), `angle` (the post premise / hook to develop), optional `notes` (extra context for Claude.ai task to ground the content authentically), and optional `cta: true` to mark a "Travailler avec moi → bio" hard CTA post (default = soft CTA = open question in caption).

Claude.ai task workflow:
1. Read `content/queue.json` from the GitHub repo
2. Pop the first item that respects the alternation rule (different pillar from the last published draft in `drafts/`)
3. Generate the Draft JSON respecting all editorial rules above
4. POST to `/api/intake` with the `x-intake-secret` header
5. Commit the updated `content/queue.json` minus the consumed item
6. If queue is empty: fall back to picking the most under-represented pillar over the last 7 drafts and generating an exploratory post

`/queue` page on the deployed app shows the live state: pending items (FIFO order with index, theme badge, notes preview, CTA flag) and published history (sorted by `createdAt` desc).

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
| `BLOB_READ_WRITE_TOKEN` | **TODO** : `vercel integration add` (Blob) |
| Vercel link | not yet (`vercel link` pending) |
| GitHub repo | not yet (`gh repo create instagram-auto --private`) |

## Gotchas (cost real time if missed)

- **Next.js 16 breaking** : `middleware.ts` → `proxy.ts`, `params`/`searchParams`/`cookies()`/`headers()` are async, `unstable_cache` → `'use cache'` directive, `experimental.ppr` → top-level `cacheComponents: true`. See `node_modules/next/dist/docs/`.
- **Satori (next/og)** : every flex container needs explicit `display: "flex"` (otherwise silent layout breakage). No Tailwind class strings — use inline `style` objects. Limited CSS subset, no `gap` on non-flex, no transforms. Use `rgba()` for opacity, not `opacity` prop on parent.
- **Instagram Graph carousel** : image URLs MUST be publicly fetchable (localhost fails — use Vercel Blob or ngrok). Containers are async — must poll `status_code` until `FINISHED` before publish, can take 10–60s. Carousel children: min 2, max 10. Use Graph API `v21.0`.
- **Resend** : `EMAIL_FROM` must be on a verified domain.
- **`.gitignore`** : `.env*` is ignored but `!.env*.example` is allowed through (added manually at scaffold).
- **Vercel hooks** : auto-skill-loading fires aggressively on `app/**`, `next.config.*`, `.env.*`, `@vercel/blob` imports. Tolerate or use the suggested skills.

## Commands

```bash
npm run dev          # turbopack, :3000
npm run build        # turbopack production
npm run lint         # eslint
npx tsc --noEmit     # type-check only
```

## Local test (no external services needed)

- `http://localhost:3000/` — drafts list
- `http://localhost:3000/preview/sample` — HTML preview of all 7 slides
- `http://localhost:3000/api/render/sample/{0..6}` — PNG 1080×1080 per slide
- `curl -s http://localhost:3000/api/render/sample/0 -o /tmp/0.png` then Read tool on the PNG to visually verify

## Next pending steps (in order)

1. `vercel link` → `vercel integration add` (Blob) → `vercel env pull`
2. `vercel deploy` (preview) → note the public URL → set as `PUBLIC_BASE_URL`
3. `gh repo create instagram-auto --private --source=. --push`
4. Configure Claude.ai Scheduled Task → POST to `/api/intake` with header `x-intake-secret`
5. First end-to-end test with the `sample` draft

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
- Drafts are stored as **JSON files in `drafts/`**, committed to the repo. No DB. Each Claude.ai task commit triggers a redeploy (or in pure webhook mode, skips redeploy and just calls `/api/intake`).
- **GitHub repo as mailbox** (Pont 2 of 3 considered: webhook direct, GitHub, Notion).
- **Email as garde-fou** with HMAC signed links for publish/reject. No Slack, no Telegram (user pref).
- Slides rendered via **`next/og`** in inline-styled React (Satori). No Canva, no Bannerbear, no Playwright.
- **Vercel Blob** for image hosting (Instagram needs public URLs, localhost can't be used in dev).
- **Single project, no monorepo** → `vercel link` (not `--repo`).
