# prompts/

System prompts utilisés en dehors du code de l'app — typiquement dans une Scheduled Task Claude.ai ou un autre agent externe qui pilote le pipeline.

## Fichiers

| Fichier | Usage |
|---|---|
| `scheduled-task.md` | System prompt complet pour la Scheduled Task Claude.ai qui génère un draft chaque matin et le POST sur `/api/intake`. Inclut workflow, règles éditoriales, schéma de sortie, et instructions de test. |

## Setup d'une Scheduled Task Claude.ai

1. Va sur `https://claude.ai`.
2. Crée une nouvelle conversation, puis clique sur l'icône "Schedule" (ou utilise la feature "Tasks" selon ta version).
3. Configure les outils nécessaires : un serveur MCP GitHub avec un PAT scope `repo`, et l'accès web fetch pour les POST HTTP.
4. Colle le contenu de `scheduled-task.md` comme system prompt.
5. Remplace dans le prompt la chaîne `REMPLACE_PAR_LA_VRAIE_VALEUR_DE_INTAKE_SECRET` par la vraie valeur de `INTAKE_SECRET` (récupérable dans `.env.local` ou via `vercel env pull`).
6. Lance la task en mode manuel une première fois pour vérifier que tout passe.
7. Une fois validée, programme-la sur la cadence souhaitée (recommandé : `0 8 * * 1-5` = 8h00 du lundi au vendredi, Europe/Paris).

## Modifier le prompt

Le prompt vit dans ce repo pour être versionné — chaque ajustement éditorial est un commit, ce qui te permet de tracer l'évolution de ton ton et de tes règles dans le temps. Quand tu modifies `scheduled-task.md`, n'oublie pas de re-coller la version à jour dans la Scheduled Task Claude.ai côté web (claude.ai ne resync pas automatiquement avec ton repo).
