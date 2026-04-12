import { NextResponse } from "next/server";
import { DraftStatus } from "@prisma/client";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { pickNextSource } from "@/lib/repos/next-source";
import { readGitHubFile, writeGitHubFile } from "@/lib/github";

export const runtime = "nodejs";
export const maxDuration = 60;

const LOG = "[cron:export-queue]";

export async function GET(request: Request) {
  const now = new Date();
  console.log(`${LOG} start at=${now.toISOString()}`);

  // 1. Auth — Vercel injecte automatiquement Authorization: Bearer <CRON_SECRET>
  const { CRON_SECRET, GITHUB_TOKEN, GITHUB_REPO } = env();
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    console.warn(`${LOG} unauthorized`);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Guard anti-doublon : un draft pending créé aujourd'hui signifie que
  //    le pipeline est déjà en cours (cron déjà passé + Claude.ai a généré).
  //    On saute pour ne pas écraser une source en plein traitement.
  //    Note: `createdAt` est fourni par le payload Claude.ai — un draft backdaté
  //    pourrait contourner ce guard. Acceptable comme risque éditorial rare.
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const pendingToday = await db.draft.count({
    where: { status: DraftStatus.pending, createdAt: { gte: todayStart } },
  });
  if (pendingToday > 0) {
    console.log(`${LOG} skip — draft pending already created today`);
    return NextResponse.json({ ok: true, skipped: "draft_already_pending_today" });
  }

  // 3. Sélectionner et réserver la prochaine source (reservedAt = now)
  //    NE PAS marquer consumed ici — c'est le webhook /api/github-intake qui le fait.
  let source;
  try {
    source = await pickNextSource();
  } catch (err) {
    console.error(`${LOG} pickNextSource failed:`, err);
    return NextResponse.json({ error: "db_error" }, { status: 503 });
  }
  console.log(
    `${LOG} picked kind=${source.kind}` +
      ("sourceId" in source ? ` sourceId=${source.sourceId}` : ""),
  );

  // 4. Sérialiser dans content/next-source.json
  const payload = JSON.stringify({ exportedAt: now.toISOString(), ...source }, null, 2);

  const path = "content/next-source.json";
  try {
    const existing = await readGitHubFile(path, GITHUB_TOKEN, GITHUB_REPO);
    await writeGitHubFile(
      path,
      payload,
      `chore: export next source (${source.kind}) at ${now.toISOString()}`,
      GITHUB_TOKEN,
      GITHUB_REPO,
      existing?.sha,
    );
  } catch (err) {
    // La source reste réservée (reservedAt posé). Le TTL de 24h permettra
    // au prochain run de la récupérer si le webhook ne passe jamais.
    console.error(`${LOG} GitHub write failed:`, err);
    return NextResponse.json({ error: "github_write_failed" }, { status: 500 });
  }

  console.log(`${LOG} done kind=${source.kind} exportedAt=${now.toISOString()}`);
  return NextResponse.json({
    ok: true,
    kind: source.kind,
    exportedAt: now.toISOString(),
  });
}
