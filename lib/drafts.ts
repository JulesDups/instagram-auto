import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DraftSchema, type Draft } from "./content";

const DRAFTS_DIR = path.join(process.cwd(), "drafts");

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
