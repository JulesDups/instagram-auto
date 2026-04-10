import "server-only";
import { list, put } from "@vercel/blob";
import { z } from "zod";
import { ThemeSchema } from "./content";

const MANIFEST_PATH = "meta/published.json";

export const PublishedEntrySchema = z.object({
  draftId: z.string(),
  mediaId: z.string(),
  theme: ThemeSchema,
  publishedAt: z.string().datetime(),
  blobSlideUrls: z.array(z.string().url()),
  captionPreview: z.string().max(500),
});
export type PublishedEntry = z.infer<typeof PublishedEntrySchema>;

export const PublishedManifestSchema = z.object({
  entries: z.array(PublishedEntrySchema),
});
export type PublishedManifest = z.infer<typeof PublishedManifestSchema>;

export interface LoadResult {
  manifest: PublishedManifest;
  loadFailed: boolean;
}

export async function loadManifest(): Promise<LoadResult> {
  try {
    const { blobs } = await list({ prefix: MANIFEST_PATH });
    if (blobs.length === 0) {
      return { manifest: { entries: [] }, loadFailed: false };
    }
    const url = blobs[0].url;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(
        `[published] Manifest fetch failed with status ${res.status}`,
      );
      return { manifest: { entries: [] }, loadFailed: true };
    }
    const json = await res.json();
    const parsed = PublishedManifestSchema.safeParse(json);
    if (!parsed.success) {
      console.error("[published] Manifest parse failed:", parsed.error.issues);
      return { manifest: { entries: [] }, loadFailed: true };
    }
    return { manifest: parsed.data, loadFailed: false };
  } catch (err) {
    console.error("[published] Manifest load threw:", err);
    return { manifest: { entries: [] }, loadFailed: true };
  }
}

export async function appendToManifest(entry: PublishedEntry): Promise<void> {
  const { manifest } = await loadManifest();
  manifest.entries.push(entry);
  await put(MANIFEST_PATH, JSON.stringify(manifest, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
