# prompts/

System prompt pour la Claude.ai Scheduled Task qui genere les drafts Instagram.

## Fichier actif

| Fichier | Usage |
|---|---|
| `scheduled-task-claude-ai.md` | Prompt pour **Claude.ai Scheduled Task** (MCP GitHub, pas de shell). Contient la strategie editoriale, le profil de voix, le workflow et le schema Draft. |

## Workflow

1. La Scheduled Task lit `content/next-source.json` dans le repo via MCP GitHub
2. Genere un draft JSON conforme au `DraftSchema` (Zod, dans `lib/content.ts`)
3. Ecrit le draft dans `drafts/pending/<id>.json` via MCP GitHub
4. Le webhook GitHub intake detecte le nouveau fichier et l'injecte dans Neon

## Modifier le prompt

Le prompt vit dans ce repo pour etre versionne — chaque ajustement editorial est un commit. La Scheduled Task lit le prompt directement, pas de resync manuelle necessaire.

## Historique

L'ancien prompt `scheduled-task.md` (workflow Bash/curl) a ete supprime le 2026-04-12. Il reste accessible dans l'historique git si un revert est necessaire.
