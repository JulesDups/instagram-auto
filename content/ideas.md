# Ideas pour instagram-auto

Chaque idée est séparée par `---` sur une ligne seule. Le scheduler en pioche
une à chaque run, la transforme en carousel Instagram complet, et la retire
d'ici. Format libre : raconte en quelques phrases. Plus tu donnes de contexte
concret (chiffres, noms d'outils, citations), mieux Claude peut en faire un
post authentique. Inutile de spécifier le pilier, Claude le déduira.

Tu peux préfixer une entrée avec `[hard-cta]` sur sa première ligne pour
forcer le CTA "Travailler avec moi → bio" sur le draft généré.

---

Bug fantôme pendant le dev de mon dashboard Next.js 16 : toutes mes routes retournaient 500 avec "TypeError: adapterFn is not a function". Aucun changement dans le middleware, stacktraces masquées par les "ignore-listed frames" de Next. 30 minutes perdues à chercher. Solution : rm -rf .next et restart du dev server. Le cache Turbopack s'était corrompu silencieusement après une modification de proxy.ts. Depuis, règle d'or : quand Next 16 fait n'importe quoi, purge .next avant tout.

---

[hard-cta]
J'ai laissé traîner mon email personnel dans l'Author de 28 commits sur un repo que je voulais passer public. Fix propre : git-filter-repo (pas filter-branch qui est déprécié) avec un mailmap qui remplace tout par mon noreply GitHub. En bonus, j'ai scrubbé un ancien secret API qui s'était glissé dans l'historique. 5 minutes pour réécrire 28 commits, force-push, repo clean. Les deux règles apprises : 1. git config user.email en local à chaque repo sensible. 2. Jamais committer de secret en clair, même dans un repo privé — il deviendra public un jour.

---

J'avais designé un pipeline Instagram avec un garde-fou email Resend : génération du draft, POST sur /api/intake, Resend envoie les slides pour validation. Premier run en prod → 403 host_not_allowed. L'environnement Claude.ai Scheduled Tasks est derrière un egress proxy qui whitelist ses domaines autorisés, et mon déploiement Vercel n'y figure pas. Pivot en 20 minutes : la task commit le draft directement dans drafts/ via GitHub MCP, je valide depuis un dashboard Next.js avec auth cookie. Moins de composants mobiles, plus simple, et ça marche depuis n'importe quel environnement qui peut push sur git.

---

Route groups Next.js 16 pour isoler l'auth en 10 lignes : app/(dashboard)/layout.tsx wrappe overview, queue, library, preview. Le (dashboard) n'apparaît pas dans l'URL, mais il force un layout commun avec sidebar pour toutes les pages enfants. Les routes API restent hors du group pour garder leur accès public. Pattern propre, zéro refactor si je veux déplacer le login ailleurs plus tard, et le middleware proxy.ts n'a qu'une liste blanche à maintenir.

---
