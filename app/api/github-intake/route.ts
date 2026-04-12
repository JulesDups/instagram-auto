import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { DraftSchema } from "@/lib/content";
import { createDraft } from "@/lib/repos/drafts";
import { markIdeaConsumed } from "@/lib/repos/ideas";
import { markQueueItemConsumed } from "@/lib/repos/queue";
import { verifyGitHubWebhook, readGitHubFile } from "@/lib/github";
import { Prisma } from "@prisma/client";
// Pas d'email — Jules consulte /library?tab=pending directement.

export const runtime = "nodejs";

const LOG = "[github-intake]";

interface GitHubPushPayload {
  ref: string;
  commits: Array<{ added: string[]; modified: string[] }>;
  head_commit: { id: string; timestamp: string } | null;
}

export async function POST(req: Request) {
  const receivedAt = new Date().toISOString();
  console.log(`${LOG} webhook received at=${receivedAt}`);

  const { GITHUB_WEBHOOK_SECRET, GITHUB_TOKEN, GITHUB_REPO } = env();

  // 1. Lire le body brut AVANT de parser (nécessaire pour la vérification HMAC)
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  // DEBUG — à retirer après validation
  console.log(`${LOG} debug secret_len=${GITHUB_WEBHOOK_SECRET.length} body_len=${rawBody.length} sig_prefix=${signature?.slice(0, 16)}`);

  try {
    await verifyGitHubWebhook(rawBody, signature, GITHUB_WEBHOOK_SECRET);
  } catch (err) {
    console.warn(`${LOG} invalid signature:`, err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // 2. Parser le payload
  let payload: GitHubPushPayload;
  try {
    payload = JSON.parse(rawBody) as GitHubPushPayload;
  } catch {
    console.error(`${LOG} payload parse error`);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const commitId = payload.head_commit?.id?.slice(0, 7) ?? "unknown";
  const commitTs = payload.head_commit?.timestamp ?? "unknown";

  // 3. Ignorer les pushs hors main
  if (payload.ref !== "refs/heads/main") {
    console.log(`${LOG} skip ref=${payload.ref}`);
    return NextResponse.json({ ok: true, skipped: "not_main" });
  }

  // 4. Collecter les fichiers ajoutés OU modifiés dans drafts/pending/
  const draftFiles = payload.commits
    .flatMap((c) => [...c.added, ...c.modified])
    .filter((f) => f.startsWith("drafts/pending/") && f.endsWith(".json"))
    .filter((f, i, arr) => arr.indexOf(f) === i); // dédupliquer

  if (draftFiles.length === 0) {
    console.log(`${LOG} skip commit=${commitId} — no draft files`);
    return NextResponse.json({ ok: true, skipped: "no_draft_files" });
  }

  console.log(
    `${LOG} processing commit=${commitId} commitAt=${commitTs} files=${draftFiles.join(",")}`,
  );

  const results: Array<{
    file: string;
    ok: boolean;
    draftId?: string;
    skipped?: string;
    error?: string;
  }> = [];

  for (const filePath of draftFiles) {
    const fileLog = `${LOG}[${filePath}]`;
    try {
      // 5. Lire le contenu — retry x3 avec 1s (réplication GitHub peut être en cours)
      const file = await readGitHubFile(filePath, GITHUB_TOKEN, GITHUB_REPO, {
        maxRetries: 3,
        retryDelayMs: 1000,
      });
      if (!file) {
        console.error(`${fileLog} file not found after retries`);
        // Return 500 (not continue) to trigger a GitHub webhook redeliver for the
        // entire push event. Files already processed in this loop are idempotent
        // (P2002 guard), so redelivery is safe. `continue` would silently drop
        // the file without any retry, which is worse for transient replication lag.
        results.push({ file: filePath, ok: false, error: "file_not_found" });
        return NextResponse.json({ error: "internal_error", results }, { status: 500 });
      }

      // 6. Parser le JSON
      let raw: unknown;
      try {
        raw = JSON.parse(file.content);
      } catch {
        console.error(`${fileLog} JSON parse error`);
        results.push({ file: filePath, ok: false, error: "parse_error" });
        continue; // fichier corrompu : inutile de retenter
      }

      // 7. Valider le schema
      const parsed = DraftSchema.safeParse(raw);
      if (!parsed.success) {
        console.error(`${fileLog} schema invalid:`, parsed.error.issues);
        results.push({ file: filePath, ok: false, error: "schema_invalid" });
        continue; // erreur éditoriale : inutile de retenter
      }

      const draft = parsed.data;

      // 8. Persister le draft (idempotent : P2002 sur id dupliqué = skip)
      try {
        await createDraft(draft);
        console.log(`${fileLog} draft created id=${draft.id}`);
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          console.log(`${fileLog} duplicate id=${draft.id} — skipping`);
          results.push({
            file: filePath,
            ok: true,
            draftId: draft.id,
            skipped: "duplicate",
          });
          continue;
        }
        throw err; // autre erreur DB → propagée → 500 → GitHub retente
      }

      // 9. Marquer la source consommée (non-fatal si elle l'est déjà)
      if (draft.sourceId) {
        try {
          if (draft.sourceKind === "idea") {
            await markIdeaConsumed(draft.sourceId);
            console.log(`${fileLog} idea consumed id=${draft.sourceId}`);
          } else if (draft.sourceKind === "queue") {
            await markQueueItemConsumed(draft.sourceId);
            console.log(`${fileLog} queueItem consumed id=${draft.sourceId}`);
          }
        } catch (err) {
          // Non-fatal : le draft est persisté, la source reste réservée jusqu'à TTL.
          console.error(`${fileLog} markConsumed failed (non-fatal):`, err);
        }
      }

      // Pas d'email — Jules consulte /library?tab=pending directement.
      results.push({ file: filePath, ok: true, draftId: draft.id });
    } catch (err) {
      // Erreur inattendue (ex: DB down) → 500 pour déclencher retry GitHub
      console.error(`${fileLog} unexpected error:`, err);
      return NextResponse.json({ error: "internal_error", results }, { status: 500 });
    }
  }

  console.log(`${LOG} done results=${JSON.stringify(results)}`);
  return NextResponse.json({ ok: true, results });
}
