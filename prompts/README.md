# prompts/

System prompts utilisés par l'agent externe qui pilote le pipeline — typiquement un trigger Claude Code cron qui génère un draft chaque matin et l'envoie à l'app via HTTP.

## Fichiers

| Fichier | Usage |
|---|---|
| `scheduled-task.md` | Prompt pour **trigger Claude Code** (Bash + curl + env vars `$INTAKE_SECRET` / `$PUBLIC_BASE_URL`). |
| `scheduled-task-claude-ai.md` | Prompt pour **Claude.ai Scheduled Task** (outils HTTP intégrés, valeurs en dur, pas de shell). |

## Prérequis du trigger Claude Code

1. **`INTAKE_SECRET`** copié depuis `.env.local` — variable d'environnement du trigger, jamais en dur dans le prompt.
2. **`PUBLIC_BASE_URL`** : l'URL du déploiement actif (ex. `https://instagram-auto.vercel.app`).
3. **Bash + curl** disponibles (tools par défaut de Claude Code).

## Setup

1. Exporte `INTAKE_SECRET` et `PUBLIC_BASE_URL` dans l'environnement du trigger.
2. Colle le contenu intégral de `scheduled-task.md` comme prompt du trigger.
3. Lance-le manuellement une première fois en mode one-shot (`claude -p "<prompt>"` ou via l'UI). Vérifie que :
   - `GET /api/next-source` renvoie bien un JSON avec un `kind`
   - Le draft généré valide `DraftSchema` (pas de 400 au POST)
   - La réponse de `/api/intake` est `{ ok: true, draftId: "..." }`
   - Le draft apparaît dans `/library?tab=pending` sur le dashboard
   - Un email Resend est envoyé à l'adresse configurée dans `.env.local`
4. Ouvre `/preview/<draftId>` pour voir les slides rendus et éditer si besoin avant publication.
5. Planifie le trigger à `0 8 * * 1-5` (8h00 du lundi au vendredi, Europe/Paris).

## Cadence et garde-fous

- 4–5 runs par semaine. Lundi-vendredi suffit pour atteindre la cible.
- Pour pousser une idée précise demain, ajoute-la via le dashboard `/ideas` (elle sera consommée en priorité au prochain run).
- Pour ignorer un draft douteux, clique "Rejeter" dans le dashboard ou via le lien signé dans l'email — le draft reste en DB avec `status=rejected` et n'est jamais publié.
- Pour rattraper un gap de pilier, ajoute un `QueueItem` explicite via `/queue` avec le thème voulu.

## Modifier le prompt

Le prompt vit dans ce repo pour être versionné — chaque ajustement éditorial est un commit. Quand tu modifies `scheduled-task.md`, n'oublie pas de mettre à jour la version utilisée par ton trigger Claude Code (elle ne resync pas automatiquement).
