# instagram-auto

Pipeline automatisé de génération, édition et publication de carousels Instagram, piloté depuis un dashboard privé. Trois piliers éditoriaux : `tech-decryption` (50%), `build-in-public` (30%), `human-pro` (20%).

## Architecture

```
Claude Code trigger (cron)
    │
    │ [1] GET /api/next-source   (x-intake-secret)
    ▼                              ← priorité atomique ideas > queue > fallback, marqué consumed
Next.js app (Vercel)
    │
    │ [2] POST /api/intake  (x-intake-secret)
    ▼
Prisma → Neon Postgres
    │   Draft.status = pending
    ▼
Resend → email review (liens signés publier / rejeter)
    │
    │ OU : Jules édite via /preview/[id], clique Publier
    ▼
lib/publish.ts
    ├─ render slides via /api/render/{id}/{n} (next/og)
    ├─ upload PNG → Vercel Blob
    ├─ publishCarousel → Instagram Graph API v21
    └─ setDraftStatus({ status: "published", mediaId, permalink, slideBlobUrls })
```

## Stack

- Next.js 16 (App Router, Turbopack, React Compiler, cacheComponents)
- React 19 · TypeScript strict · Tailwind CSS v4
- Prisma 6 + Neon Postgres (driverAdapters)
- Zod (validation à la frontière intake)
- Resend (email review)
- @vercel/blob (hosting PNG pour Instagram Graph)
- Vitest (test repos + next-source atomicity)

## Structure

```
instagram-auto/
├── prisma/
│   ├── schema.prisma                 # Idea / QueueItem / Draft / Slide + enums
│   └── migrations/                   # init + add_draft_permalink
├── app/
│   ├── (dashboard)/
│   │   ├── overview/                 # stats cards via Prisma
│   │   ├── queue/                    # CRUD QueueItem
│   │   ├── ideas/                    # CRUD Idea
│   │   ├── library/                  # tabs all/pending/published/rejected
│   │   └── preview/[draftId]/        # edit form + publish/reject actions
│   └── api/
│       ├── next-source/              # GET — atomic priority picker (x-intake-secret)
│       ├── intake/                   # POST — createDraft (x-intake-secret)
│       ├── render/[draftId]/[index]  # next/og ImageResponse 1080×1080
│       ├── publish/ + dashboard-publish/[draftId]
│       └── reject/                   # persists status=rejected
├── lib/
│   ├── db.ts                         # PrismaClient singleton
│   ├── theme.ts                      # enum mapping (tech-decryption ↔ tech_decryption)
│   ├── content.ts                    # DraftSchema (Zod), Theme, PILLAR_TARGET_DISTRIBUTION
│   ├── repos/
│   │   ├── drafts.ts                 # CRUD + setDraftStatus (PersistedDraft)
│   │   ├── queue.ts                  # CRUD + position tracking
│   │   ├── ideas.ts                  # CRUD
│   │   ├── published.ts              # stats + distribution
│   │   └── next-source.ts            # atomic ideas > queue > fallback (Serializable tx)
│   ├── publish.ts                    # orchestration render → blob → IG → DB
│   ├── stats.ts                      # getOverviewStats + formatRelativeFrench
│   ├── instagram.ts · email.ts · env.ts · auth.ts · tokens.ts
├── templates/                        # slide-hook / slide-content / slide-cta (next/og)
├── test/                             # vitest suites pour repos + theme
└── prompts/
    └── scheduled-task.md             # system prompt de l'agent cron Claude Code
```

## Variables d'environnement

Voir `.env.local.example`. Fichier `.env.local` gitignoré.

| Variable                 | Source                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| `DATABASE_URL`           | Neon pooled connection string (`-pooler` host)                       |
| `DIRECT_URL`             | Neon direct connection string (utilisée par `prisma migrate`)        |
| `TEST_DATABASE_URL`      | Neon branch `test` pour les suites vitest                            |
| `META_APP_ID` / `META_APP_SECRET` / `META_PAGE_ACCESS_TOKEN` / `IG_BUSINESS_ACCOUNT_ID` | Meta for Developers |
| `RESEND_API_KEY` · `EMAIL_FROM` · `EMAIL_TO` | Resend                                                |
| `INTAKE_SECRET`          | random 32-byte hex — auth `x-intake-secret`                          |
| `DRAFT_TOKEN_SECRET`     | random 32-byte hex — HMAC links publier/rejeter                      |
| `DASHBOARD_COOKIE_SECRET` / `DASHBOARD_PASSWORD` | session cookie du dashboard                    |
| `BLOB_READ_WRITE_TOKEN`  | `vercel integration add` — hosting PNG pour Instagram Graph          |
| `PUBLIC_BASE_URL`        | `http://localhost:3000` en dev, URL Vercel en prod                   |

## Commandes

```bash
npm run dev              # next dev (turbopack)
npm run build            # prisma generate && next build
npm run lint             # eslint
npm run test             # vitest (Neon test branch)
npm run db:migrate       # prisma migrate dev
npm run db:studio        # Prisma Studio
npx tsc --noEmit         # type-check
```

## Flux de validation

1. Le trigger cron Claude Code (voir `prompts/scheduled-task.md`) appelle `GET /api/next-source` qui pioche atomiquement le prochain sujet (ideas > queue > fallback) et le marque consommé en DB.
2. Le trigger génère le Draft JSON en respectant `DraftSchema` (Zod) et fait `POST /api/intake`.
3. L'app persiste `Draft.status = pending` en Neon et envoie un email Resend à `EMAIL_TO` avec preview des slides et liens signés publier / rejeter.
4. Jules édite si besoin via `/preview/[draftId]` puis clique Publier → rendu des PNG, upload Blob, publication IG, `setDraftStatus(published, mediaId, permalink)`.
5. Reject → `setDraftStatus(rejected)` visible dans `/library?tab=rejected`.

## Tester en local

1. Copier `.env.local.example` en `.env.local` et remplir toutes les variables.
2. `npm run db:migrate` pour appliquer les migrations Prisma sur le branch Neon pointé par `DATABASE_URL`.
3. `npm run dev` puis ouvrir `http://localhost:3000/overview`.
4. Pour injecter un draft de test sans passer par le trigger : `curl -X POST -H "x-intake-secret: $INTAKE_SECRET" -H "content-type: application/json" --data @draft.json http://localhost:3000/api/intake`.
5. `npm run db:studio` pour inspecter / éditer les rows directement.
