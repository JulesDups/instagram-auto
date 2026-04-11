# instagram-auto — Editorial Rules Reference

Source of truth: `side/instagram-auto/CLAUDE.md` (§Editorial strategy). This file is a self-contained snapshot synced manually when the strategy evolves. The subagent reads this file at every invocation so it speaks the exact dialect of the project.

## The 3 pillars

| Pillar | Share | Description |
|---|---|---|
| `tech-decryption` | 50% | Frameworks, libs, écosystème Vercel, outils dev, comparaisons X vs Y, pièges classiques, hot takes. |
| `build-in-public` | 30% | Side-project en cours (instagram-auto) : décisions d'archi, bugs marquants, before/after, métriques, abandons. |
| `human-pro` | 20% | Retours d'expérience freelance, conseils juniors, setup, ressources, transition salarié→freelance. Toujours avec apprentissage transférable. |

Target distribution enforced via `PILLAR_TARGET_DISTRIBUTION` in `lib/content.ts`.

## Hard rules (non-negotiable)

1. **Alternation** — jamais deux posts du même pilier à la suite dans la queue ni dans l'historique proche.
2. **Slide 1 = hook** — contrarien, stat surprenante ou affirmation tranchée. Jamais une introduction, jamais une définition, jamais un "Bonjour je vais vous parler de…".
3. **Slide count** — 5 à 7 slides max (le schéma Draft autorise 2-10 mais la règle éditoriale resserre à 5-7).
4. **Caption length** — ≤150 mots (le schéma autorise 2200 mais la règle éditoriale resserre).
5. **CTA cadence** — 1 post sur 3 contient le hard CTA "Travailler avec moi → bio" (marqué `cta: true` dans la queue). Les autres terminent sur une question ouverte en commentaire.
6. **Forbidden patterns** :
   - Emojis — interdits partout
   - "En tant que…" — interdit
   - Fausse humilité — interdite
   - Vocabulaire corporate — interdit
   - Traductions forcées type "cadriciel" — garder l'anglais tech
7. **Tutoiement** en français, systématique.
8. **Emphasis** — max 1 punchline par slide, wrapped in `**markdown**`, parsée par `parseEmphasis()` et rendue en `highlightColor`.

## Tone specification

- Sincère, informé, direct
- Personnel mais **jamais autobiographique** — le vécu sert d'exemple, pas de sujet
- Peer-to-peer avec les devs (pas junior-à-senior, pas vendeur-à-prospect)
- Carburant du contenu = ce qui entoure (outils, code, trends, bugs), pas la personal story

## Positioning

> "Dev full-stack freelance. Je décrypte ce qui bouge dans la tech française et je construis en public."

Audience : pairs devs + juniors francophones. Langue : français exclusivement.

## Draft schema (authoritative in `lib/content.ts`)

- `Theme` = `"tech-decryption" | "build-in-public" | "human-pro"`
- `SlideKind` = `"hook" | "content" | "cta"`
- `Slide` = `{kind, title (1-140), body? (≤320), footer? (≤80)}`
- `Draft` = `{id (kebab-case), createdAt (ISO), theme, slides[2..10], caption (1-2200), hashtags[≤30]}`
- Queue item = `{theme, angle, notes?, cta?}` in the `QueueItem` table (`prisma/schema.prisma`), managed via `/queue` dashboard page

## Brand palette (layout constraints)

| Token | Hex | Usage |
|---|---|---|
| Text | `#1C343A` | titles, body on cream slides; bg on CTA slide |
| Background | `#FBFAF8` | bg on hook/content slides; text on CTA slide |
| Accent | `#D4A374` | theme labels, indicators, rules, swipe arrow, CTA footer |
| Highlight | `#BF2C23` | punchline emphasis on hook/content slides only — too low contrast on dark CTA |

CTA slide inverts: dark teal bg + cream text + tan accent. Never propose slide content that would break this palette inversion (e.g., punchline highlight in red on CTA).
