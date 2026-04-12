# instagram-auto — Editorial Rules Reference

Source of truth: `side/instagram-auto/CLAUDE.md` (§Editorial strategy). This file is a self-contained snapshot synced manually when the strategy evolves. The subagent reads this file at every invocation so it speaks the exact dialect of the project.

Last synced: 2026-04-12 (voice profile + distribution + tone + CTA overhaul)

## The 3 pillars

| Pillar | Share | Description |
|---|---|---|
| `tech-decryption` | 45% | Frameworks, libs, écosystème Vercel, outils dev, comparaisons X vs Y, pièges classiques, prises de position techniques. |
| `build-in-public` | 30% | Side-project en cours (instagram-auto) : décisions d'archi, bugs marquants, before/after, métriques, abandons. |
| `human-pro` | 25% | Retours d'expérience freelance, conseils juniors, setup, ressources, transition salarié→freelance. Toujours avec apprentissage transférable. |

Target distribution enforced via `PILLAR_TARGET_DISTRIBUTION` in `lib/content.ts`.

## Hard rules (non-negotiable)

1. **Alternation** — jamais deux posts du même pilier à la suite dans la queue ni dans l'historique proche.
2. **Slide 1 = hook** — spécifique, au choix parmi : observation inattendue, question que personne ne pose, stat surprenante, affirmation tranchée factuelle, ou contrarien sincère (pas provocation gratuite). Jamais une introduction, jamais une définition, jamais un "Bonjour je vais vous parler de…".
3. **Slide count** — 5 à 7 slides max (le schéma Draft autorise 2-10 mais la règle éditoriale resserre à 5-7).
4. **Caption length** — ≤150 mots (le schéma autorise 2200 mais la règle éditoriale resserre).
5. **CTA cadence** — 1 post sur 3 contient le hard CTA contextuel adapté au pilier (marqué `cta: true` dans la queue). Les variantes :
   - tech-decryption : "Tu veux ce niveau de détail sur ton projet ? Lien dans la bio."
   - build-in-public : "C'est ce genre de problème que je résous pour mes clients. Bio pour en parler."
   - human-pro : "Si tu cherches un dev qui prend le temps de bien faire, le lien est dans la bio."
   Les autres posts terminent sur une question ouverte en commentaire.
6. **Forbidden patterns** :
   - Emojis — interdits partout
   - "En tant que…" — interdit
   - Fausse humilité — interdite
   - Vocabulaire corporate — interdit
   - Traductions forcées type "cadriciel" — garder l'anglais tech
7. **Tutoiement** en français, systématique.
8. **Emphasis** — max 1 punchline par slide, wrapped in `**markdown**`, parsée par `parseEmphasis()` et rendue en `highlightColor`.
9. **Précision du mot juste** — chaque terme porte son poids réel. Pas de hedging, pas de formules creuses, pas de tiédeur. Précision du mot > volume de texte.
10. **Registre de compétence** — le contenu démontre la maîtrise technique par la précision des détails et la clarté des arbitrages, jamais par la revendication d'un titre.
11. **Vulnérabilité autorisée** quand elle sert un enseignement transférable. Naturelle dans build-in-public et human-pro. Exception rare dans tech-decryption. Interdite : émotion sans substance, plainte sans résolution, aveu sans enseignement.
12. **Test CTO** — un CTO qui découvre ce post comme premier contact envisagerait-il de confier un projet ? Si le doute existe, retirer l'élément de vulnérabilité ou le reframer vers la résolution.

## Tone specification

- Sincère, informé, précis, chaleureux
- Personnel et honnête, **jamais performatif** — le vécu sert d'illustration pour une leçon transférable, pas de sujet en soi
- Peer-to-peer avec les devs (pas junior-à-senior, pas vendeur-à-prospect)
- Carburant du contenu = ce qui entoure (outils, code, trends, bugs) + vécu quand il sert le propos

## Voice profile — Jules

Jules est un dev freelance basque, introverti, à sensibilité artistique (RIASEC Artistique-Social, Conventionnel 0%). Sa voix naturelle :
- Franchise sans agressivité — il dit les choses comme elles sont, pas pour provoquer
- Précision du mot juste — vocabulaire qui porte le poids réel de l'expérience, sans exagération ni euphémisme
- Pédagogue par la clarté, pas par le charisme ou l'enthousiasme forcé
- Pair qui montre, pas autorité qui décrète
- Vulnérabilité dosée — partage ses erreurs quand ça sert le propos, jamais pour se mettre en scène

Ce qu'il N'EST PAS : un polémiste, un influenceur motivationnel, un vendeur, un coach. Pas de posture de surplomb. Pas de fausse modestie non plus.

## Positioning

> "Dev freelance qui montre son travail, ses choix et leurs conséquences. Décryptage tech + build in public."

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
