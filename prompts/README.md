# prompts/

System prompts utilisés par l'agent externe qui pilote le pipeline — typiquement un trigger Claude Code cron qui génère un draft chaque matin et l'envoie à l'app via HTTP.

## Fichiers

| Fichier | Usage |
|---|---|
| `scheduled-task.md` | System prompt complet pour l'agent Claude Code qui génère un draft via `GET /api/next-source` + `POST /api/intake`. Inclut workflow, règles éditoriales, schéma Zod et instructions de test. |

## Setup d'un trigger Claude Code

1. Exporte `INTAKE_SECRET` (copié depuis `.env.local`) et `PUBLIC_BASE_URL` (ex. `https://instagram-auto.vercel.app`) dans l'environnement du trigger.
2. Colle le contenu du bloc `## System prompt` de `scheduled-task.md` comme prompt du trigger.
3. Lance-le manuellement une première fois — vérifie que le draft apparaît dans `/library?tab=pending` et qu'un email Resend est envoyé.
4. Une fois validé, planifie le trigger (recommandé : `0 8 * * 1-5` = 8h00 du lundi au vendredi, Europe/Paris).

## Modifier le prompt

Le prompt vit dans ce repo pour être versionné — chaque ajustement éditorial est un commit. Quand tu modifies `scheduled-task.md`, n'oublie pas de mettre à jour la version utilisée par ton trigger Claude Code (elle ne resync pas automatiquement).
