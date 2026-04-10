---
name: insta-strategist
description: Editorial strategist for the instagram-auto project — audits the queue, brainstorms new angles, and challenges drafts via the insta-challenger subagent. Project-scoped, French-only.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Agent
argument-hint: [queue | angle <pillar> | challenge <draft-id>]
---

# insta-strategist

Editorial strategist skill for the `instagram-auto` project. Orchestrates three modes — queue audit, angle brainstorm, draft challenge — and delegates all persona-driven editorial work to the `insta-challenger` subagent. Read-only on project files: the skill never modifies `content/queue.json`, `drafts/*.json`, or any app code.

## Usage

```
/insta-strategist                           # default: menu + project state
/insta-strategist queue                     # queue audit
/insta-strategist angle tech-decryption     # angle brainstorm for a pillar
/insta-strategist angle build-in-public
/insta-strategist angle human-pro
/insta-strategist challenge <draft-id>      # critique a specific draft
```

Valid pillars: `tech-decryption`, `build-in-public`, `human-pro`.

## Styles and references this skill relies on

- **Editorial rules** (hard rules, pillars, tone, palette) — `references/editorial-rules.md`, self-contained snapshot of `CLAUDE.md` §Editorial strategy
- **Quality tests** (swap / scroll / surprise / earn / AI smell) — `references/quality-tests.md`, adapted from the `/copywriting` self-review for Instagram carousels
- **Draft schema** — `side/instagram-auto/lib/content.ts` (authoritative Zod)
- **Persona voice** — the `insta-challenger` subagent (benevolent, pedagogical, always proposes justified alternatives)
- **Optional reference** (one-way file read) — `~/.claude/skills/copywriting/references/banned-patterns.md`

The skill has **no runtime dependency** on the `/copywriting` skill. Uninstalling `/copywriting` does not break this skill.

## Behavior — invocation without arguments

1. Read `side/instagram-auto/content/queue.json` and count items per `theme`.
2. Glob `side/instagram-auto/drafts/*.json`. Read the 10 most recent files (by `createdAt` descending). If fewer than 10 drafts exist, read all available.
3. Compute the pillar distribution over those drafts as percentages.
4. Identify the `theme` of the single most recent draft (the "last published pillar").
5. Detect drift: any pillar more than ±10 points from its target (50 / 30 / 20).
6. Display the snapshot + menu exactly in this format:

```
État actuel instagram-auto
  Queue: <N> items (<n1> tech-decryption · <n2> build-in-public · <n3> human-pro)
  Dernier pilier publié: <pillar ou "aucun draft">
  Équilibre <M> derniers drafts: <%tech>% / <%build>% / <%human>%
  <Ligne "Dérive détectée: <pillar> <±écart>pts" si applicable, sinon "Équilibre conforme">

Que veux-tu faire ?
  [1] queue     — Audit de la queue éditoriale + drifts à corriger
  [2] angle     — Brainstorm de nouveaux angles ancrés dans ta stack
  [3] challenge — Critique itérative d'un draft (avec alternatives)
```

7. Wait for the user's reply. Accept `[1]`, `1`, `queue`, `audit`, etc. loosely. Route to the corresponding mode.

## Behavior — mode `queue`

1. Read `content/queue.json` and all files in `drafts/*.json`.
2. Compute:
   - Raw queue counts per pillar (absolute)
   - Queue distribution per pillar (percentages)
   - Last 10 drafts distribution per pillar (percentages)
   - Alternation check in queue order: flag any two adjacent queue items with the same `theme`
   - Gap detection: any pillar with 0 items in queue
   - CTA cadence: ratio of `cta: true` items over total queue items (target ~1/3)
3. Emit a structured Markdown report, no LLM rephrasing:

```
## Audit queue éditoriale

### Distribution queue (<N> items)
| Pilier | Queue count | Queue % | Target | Écart |
|---|---|---|---|---|
| tech-decryption | <n> | <%> | 50% | <±pts> |
| build-in-public | <n> | <%> | 30% | <±pts> |
| human-pro | <n> | <%> | 20% | <±pts> |

### Historique (10 derniers drafts)
| Pilier | Count | % | Target | Écart |
|---|---|---|---|---|
<même tableau>

### Cadence CTA
- Hard CTA queue: <n_cta>/<N_total> = <%>
- Target: ~1/3 (33%)
- <"Conforme" ou "Sous-cible" ou "Sur-cible">

### Violations détectées
- <Alternation warning si applicable, ex : "Items #3 et #4 tous deux `tech-decryption` — règle d'alternation violée en queue order">
- <Gap warning si applicable, ex : "0 item `human-pro` dans la queue → risque de rupture d'équilibre">
- <Drift warning si écart ≥ 10 pts>

### Recommandations
<liste d'actions concrètes, max 5 points, formulées comme des verbes : "Réordonner #3 après #5", "Ajouter 2 angles human-pro (mode `angle`)", "Retirer le flag cta de #7 pour ajuster la cadence", etc.>
```

4. **Do not write to `queue.json`.** Report only. The user edits the file manually.
5. Do **not** invoke the subagent for this mode — it is pure data analysis.

## Behavior — mode `angle`

1. Parse the pillar argument. Valid values: `tech-decryption`, `build-in-public`, `human-pro`. If missing or invalid, ask the user which pillar they want to brainstorm for.
2. Read: `content/queue.json`, the 10 most recent drafts, `CLAUDE.md`, `lib/content.ts`.
3. Build a de-duplication list of already-covered angles:
   - All `angle` fields from `content/queue.json`
   - All first-slide `title` fields from the recent drafts
4. Invoke the `insta-challenger` subagent via the Agent tool with this prompt template (fill in the placeholders):

```
Mode: angle brainstorm
Pilier cible: <pillar>

Angles déjà couverts (à NE PAS dupliquer) :
<bulleted list of existing angles from queue + recent draft titles>

Contexte Jules (à ancrer tes angles dessus) :
- Dev full-stack freelance FR, lance son freelance en 2026 (actuellement chez HegoaTek)
- Stack : Next.js 16, React 19, Angular 19-21, NestJS, Prisma, TypeScript, Tailwind, shadcn/ui, Vercel
- Editeurs : Zed, VS Code, Antigravity
- Basé Pays Basque, français, audience pairs devs + juniors francophones
- Projet en build public actuel : instagram-auto (pipeline Claude.ai → GitHub → Vercel → Instagram Graph API)

Ton job :
1. Génère 5 à 8 angles NOUVEAUX pour le pilier <pillar>, ancrés dans ce contexte.
2. Pour chaque angle retenu, fournis : headline (niveau queue.json), notes (niveau queue.json), hook slide 1 possible, et la règle éditoriale / test qualité qui le valide.
3. Rejette explicitement au moins 2 angles tièdes en expliquant pourquoi ils échouent (nom du test).
4. Termine par une question ouverte pour l'itération.

Suis ton format de sortie standard pour le mode angle (défini dans ta fiche persona).
```

5. Return the subagent output directly to the user, no post-processing.
6. **Do not write to `queue.json`.** The user decides which angles to inject manually.

## Behavior — mode `challenge`

1. Parse the draft ID argument. If missing, `Glob drafts/*.json`, list all draft IDs, and ask which one to challenge.
2. Read the target draft: `drafts/<draft-id>.json`. If the file does not exist, report the error and list available drafts.
3. Read supporting context: `CLAUDE.md`, `lib/content.ts`.
4. Invoke the `insta-challenger` subagent via the Agent tool with this prompt template:

```
Mode: challenge draft
Draft ID: <draft-id>

Draft JSON complet :
<full JSON content of the draft, pretty-printed>

Ton job :
1. Applique les 5 tests qualité (swap, scroll, surprise, earn, AI smell) slide par slide.
2. Pour chaque slide qui échoue à un test, nomme le test explicitement et propose 2-3 alternatives justifiées avec trade-offs.
3. Les slides qui passent les 5 tests se mentionnent en une seule ligne ("Slide N — passe les 5 tests, RAS.").
4. Analyse la caption séparément avec le même format.
5. Donne un verdict global (ready to ship | needs iteration | reshape needed).
6. Termine par une question d'itération concrète pour continuer la boucle.

Suis ton format de sortie standard pour le mode challenge (défini dans ta fiche persona).
```

5. Return the subagent output to the user.
6. If the user replies with a follow-up (e.g., "OK je prends l'option A pour la slide 2, retravaille la slide 4"), re-invoke the subagent with the updated context and the user's instructions. Loop until the user closes the iteration by saying they are satisfied or by changing modes.
7. **Never modify the draft file directly.** The user hand-applies changes.

## Hard boundaries

- **Read-only on project files.** Never write to `content/queue.json`, `drafts/*.json`, or any app file.
- **No ex-nihilo content generation.** This skill critiques and iterates; it does not produce initial drafts (that is the role of Claude.ai Scheduled Tasks).
- **French output only.** All user-facing text and subagent prompts are in French. Code identifiers and English tech terms stay as-is.
- **Project-scoped only.** Never apply to any directory other than `side/instagram-auto/`. If invoked from outside the project root, report that the skill is project-scoped and exit cleanly.
- **No hook, no auto-trigger.** The skill only runs when the user invokes it. Drafts arriving via `/api/intake` are not auto-challenged.
