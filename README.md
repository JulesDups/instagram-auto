# instagram-auto

Pipeline automatisé de génération, rendu et publication de carousels Instagram.
Trois thèmes : Claude Code, automation, création de contenu IA.

## Architecture

```
Claude.ai (Scheduled Task)
    │
    │ [POST JSON via webhook]
    ▼
GitHub repo (drafts/*.json)
    │
    │ [auto-deploy on push]
    ▼
Next.js app (Vercel)
    ├── /api/intake     ← webhook receiver, valide & envoie l'email
    ├── /api/render     ← rend une slide en PNG via next/og
    ├── /api/publish    ← lien signé email → upload Blob + Instagram Graph
    └── /api/reject     ← lien signé email → noop
    │
    ▼
Resend → julesdupspro@gmail.com
    │
    │ [click "Publier"]
    ▼
Vercel Blob (PNG hosting) → Instagram Graph API → @julesd.dev
```

## Stack

- Next.js 16 (App Router, Turbopack, React Compiler)
- React 19
- TypeScript strict
- Tailwind CSS v4
- Zod (validation)
- Resend (email)
- @vercel/blob (image hosting)

## Structure

```
instagram-auto/
├── app/
│   ├── page.tsx                           # liste des drafts
│   ├── preview/[draftId]/page.tsx         # aperçu HTML d'un draft
│   └── api/
│       ├── intake/route.ts                # webhook depuis Claude.ai
│       ├── render/[draftId]/[index]/      # ImageResponse → PNG 1080×1080
│       ├── publish/route.ts               # lien signé → publish to IG
│       └── reject/route.ts                # lien signé → noop
├── lib/
│   ├── env.ts                             # env vars typées (Zod)
│   ├── content.ts                         # types Draft / Slide / Theme
│   ├── drafts.ts                          # I/O drafts (lecture/écriture JSON)
│   ├── instagram.ts                       # Graph API client
│   ├── publish.ts                         # orchestration render → blob → IG
│   ├── email.ts                           # template email Resend
│   └── tokens.ts                          # HMAC signed tokens (publier/rejeter)
├── templates/
│   ├── slide-hook.tsx                     # template slide d'accroche
│   ├── slide-content.tsx                  # template slide de contenu
│   └── slide-cta.tsx                      # template slide CTA
└── drafts/
    └── sample.json                        # draft d'exemple
```

## Variables d'environnement

Voir `.env.local.example`. Les variables sensibles doivent rester dans `.env.local` (git-ignored).

| Variable                 | Source                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| `META_APP_ID`            | developers.facebook.com → app → Paramètres → Général                 |
| `META_APP_SECRET`        | idem                                                                 |
| `META_PAGE_ACCESS_TOKEN` | échange token via `oauth/access_token` puis `me/accounts`            |
| `IG_BUSINESS_ACCOUNT_ID` | `PAGE_ID?fields=instagram_business_account` dans Graph API Explorer  |
| `RESEND_API_KEY`         | resend.com → API Keys                                                |
| `EMAIL_FROM`             | adresse vérifiée sur Resend (ex: `instagram-bot@julesdupuis.fr`)     |
| `EMAIL_TO`               | destinataire des drafts à valider                                    |
| `INTAKE_SECRET`          | random 32 bytes hex (`crypto.randomBytes(32).toString('hex')`)       |
| `DRAFT_TOKEN_SECRET`     | random 32 bytes hex                                                  |
| `BLOB_READ_WRITE_TOKEN`  | provisionné par `vercel integration add` ou Marketplace              |
| `PUBLIC_BASE_URL`        | `http://localhost:3000` en dev, URL Vercel en prod                   |

## Commandes

```bash
npm run dev       # serveur dev sur :3000
npm run build     # build production
npm run lint      # ESLint
```

## Flux de validation

1. Une **Scheduled Task Claude.ai** s'exécute chaque matin et POST un JSON sur `/api/intake` avec le header `x-intake-secret`.
2. L'app valide le draft, l'enregistre dans `drafts/`, et envoie un email Resend à `EMAIL_TO` avec aperçu des slides + caption + deux liens signés (publier / rejeter).
3. Si le destinataire clique **Publier**, l'app rend chaque slide en PNG via `/api/render`, les uploade sur Vercel Blob, puis appelle l'API Instagram Graph pour créer et publier le carousel.
4. Si le destinataire clique **Rejeter**, l'app affiche une confirmation et rien n'est publié.

## Tester en local

1. Copier `.env.local.example` en `.env.local` et remplir les variables (au minimum `META_PAGE_ACCESS_TOKEN` et `META_APP_SECRET`, le reste est déjà rempli).
2. `npm run dev`
3. Ouvrir `http://localhost:3000` → liste des drafts.
4. Cliquer sur `sample` → aperçu HTML avec les 7 slides rendues.
5. `http://localhost:3000/api/render/sample/0` → PNG direct de la première slide.

Pour publier réellement, il faut soit déployer sur Vercel (les URLs deviennent publiques pour Instagram), soit exposer le port via ngrok et mettre `PUBLIC_BASE_URL` à l'URL ngrok.
