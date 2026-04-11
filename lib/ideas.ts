import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const IDEAS_FILE = path.join(process.cwd(), "content", "ideas.md");

export interface IdeaEntry {
  text: string;
  hardCta: boolean;
}

export interface LoadIdeasResult {
  entries: IdeaEntry[];
}

/**
 * Parse a raw ideas.md content into a list of entries.
 * - Splits on lines containing exactly `---`.
 * - Discards the first chunk (header above the first separator).
 * - Empty chunks (after trim) are filtered out.
 * - An entry starting with `[hard-cta]` on its first line is marked as hard CTA
 *   and the prefix is stripped from the text.
 */
export function parseIdeas(content: string): IdeaEntry[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const chunks = normalized.split(/^---$/m);
  // First chunk is header, skip it.
  const entryChunks = chunks.slice(1);

  return entryChunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      if (chunk.startsWith("[hard-cta]")) {
        const text = chunk.slice("[hard-cta]".length).trim();
        return { text, hardCta: true };
      }
      return { text: chunk, hardCta: false };
    })
    .filter((entry) => entry.text.length > 0);
}

export async function loadIdeas(): Promise<LoadIdeasResult> {
  try {
    const raw = await fs.readFile(IDEAS_FILE, "utf-8");
    return { entries: parseIdeas(raw) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { entries: [] };
    }
    throw err;
  }
}
