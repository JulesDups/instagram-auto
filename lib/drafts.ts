import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DraftSchema, type Draft } from "./content";
import { loadManifest, type PublishedEntry } from "./published";

const DRAFTS_DIR = path.join(process.cwd(), "drafts");

export interface DraftWithStatus {
  draft: Draft;
  published: PublishedEntry | null;
}

export async function loadDraft(id: string): Promise<Draft> {
  const file = path.join(DRAFTS_DIR, `${id}.json`);
  const raw = await fs.readFile(file, "utf-8");
  const parsed = JSON.parse(raw);
  return DraftSchema.parse(parsed);
}

export async function listDraftIds(): Promise<string[]> {
  try {
    const entries = await fs.readdir(DRAFTS_DIR);
    return entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export async function saveDraft(draft: Draft): Promise<void> {
  await fs.mkdir(DRAFTS_DIR, { recursive: true });
  const file = path.join(DRAFTS_DIR, `${draft.id}.json`);
  await fs.writeFile(file, JSON.stringify(draft, null, 2), "utf-8");
}

export async function getDraftsWithStatus(): Promise<{
  items: DraftWithStatus[];
  manifestLoadFailed: boolean;
}> {
  const ids = await listDraftIds();
  const drafts: Draft[] = [];
  for (const id of ids) {
    try {
      drafts.push(await loadDraft(id));
    } catch (err) {
      console.error(`[drafts] Failed to load draft ${id}:`, err);
    }
  }
  drafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const { manifest, loadFailed } = await loadManifest();
  const byDraftId = new Map<string, PublishedEntry>();
  for (const entry of manifest.entries) {
    byDraftId.set(entry.draftId, entry);
  }

  return {
    items: drafts.map((draft) => ({
      draft,
      published: byDraftId.get(draft.id) ?? null,
    })),
    manifestLoadFailed: loadFailed,
  };
}
