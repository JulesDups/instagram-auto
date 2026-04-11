---
name: insta-strategist
description: Editorial strategist for the instagram-auto project — audits the queue, brainstorms new angles, and challenges drafts via the insta-challenger subagent. Project-scoped, French-only. Reads live state from Neon via Prisma.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Agent
argument-hint: [queue | angle <pillar> | challenge <draft-id>]
---

# insta-strategist

Editorial strategist skill for the `instagram-auto` project. Orchestrates three modes — queue audit, angle brainstorm, draft challenge — and delegates all persona-driven editorial work to the `insta-challenger` subagent. Read-only: the skill queries the Neon DB via Prisma (through `tsx`) and never mutates it. Writes happen only via the app dashboard (`/queue`, `/ideas`, `/preview/[id]`).

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

## Data access helper

All modes below query the live Neon DB via a one-shot `tsx` command. The canonical snapshot query:

```bash
npx dotenv -e .env.local -- tsx -e '
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const [queue, drafts] = await Promise.all([
  db.queueItem.findMany({ where: { consumed: false }, orderBy: { position: "asc" } }),
  db.draft.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { slides: { orderBy: { position: "asc" } } } }),
]);
console.log(JSON.stringify({ queue, drafts }, null, 2));
await db.$disconnect();
'
```

The skill runs this via Bash, parses the JSON output, and uses it to compute stats. Never mutate the DB from a skill command — writes go through the dashboard (`/queue`, `/ideas`, `/preview/[id]`).

## Behavior — invocation without arguments

1. Run the snapshot query above. Parse `queue` and `drafts` from its output.
2. Count items per `theme` in the queue.
3. Compute the pillar distribution over the last 10 drafts as percentages.
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

1. Run the snapshot query. Also run a second query to get the full set of published drafts for historical stats (`db.draft.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 10 })`).
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

4. **Never mutate the DB.** Report only. The user edits via the `/queue` dashboard page.
5. Do **not** invoke the subagent for this mode — it is pure data analysis.

## Behavior — mode `angle`

1. Parse the pillar argument. Valid values: `tech-decryption`, `build-in-public`, `human-pro`. If missing or invalid, ask the user which pillar they want to brainstorm for.
2. Run the snapshot query to get pending queue items + 10 most recent drafts. Read `CLAUDE.md`, `lib/content.ts`, and `prisma/schema.prisma` for context.
3. Build a de-duplication list of already-covered angles:
   - All `angle` fields from the pending queue
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
2. Pour chaque angle retenu, fournis : headline (niveau QueueItem.angle), notes (niveau QueueItem.notes), hook slide 1 possible, et la règle éditoriale / test qualité qui le valide.
3. Rejette explicitement au moins 2 angles tièdes en expliquant pourquoi ils échouent (nom du test).
4. Termine par une question ouverte pour l'itération.

Suis ton format de sortie standard pour le mode angle (défini dans ta fiche persona).
```

5. Return the subagent output directly to the user, no post-processing.
6. **Never mutate the DB.** The user decides which angles to add manually via `/ideas` or `/queue` dashboard pages.

## Behavior — mode `challenge`

1. Parse the draft ID argument. If missing, list available draft IDs via `npx dotenv -e .env.local -- tsx -e 'import { PrismaClient } from "@prisma/client"; const db = new PrismaClient(); console.log((await db.draft.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, theme: true, status: true } })).map((d) => \`\${d.id} (\${d.theme}, \${d.status})\`).join("\n")); await db.$disconnect();'` and ask which one to challenge.
2. Fetch the target draft via Prisma (`db.draft.findUnique({ where: { id: "<draft-id>" }, include: { slides: { orderBy: { position: "asc" } } } })`). If null, report the error.
3. Read supporting context: `CLAUDE.md`, `lib/content.ts`, `prisma/schema.prisma`.
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
7. **Never modify the draft in the DB directly.** The user hand-applies changes via `/preview/[id]` edit form.

## Hard boundaries

- **Read-only on the DB.** Never run `INSERT`, `UPDATE`, `DELETE`, or any write against Neon. Writes go through the dashboard.
- **No ex-nihilo content generation.** This skill critiques and iterates; it does not produce initial drafts (that is the role of the Scheduled Task agent defined in `prompts/scheduled-task.md`).
- **French output only.** All user-facing text and subagent prompts are in French. Code identifiers and English tech terms stay as-is.
- **Project-scoped only.** Never apply to any directory other than `side/instagram-auto/`. If invoked from outside the project root, report that the skill is project-scoped and exit cleanly.
- **No hook, no auto-trigger.** The skill only runs when the user invokes it. Drafts arriving via `/api/intake` are not auto-challenged.
