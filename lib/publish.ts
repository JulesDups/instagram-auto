import "server-only";
import { put } from "@vercel/blob";
import { env } from "./env";
import { loadDraft } from "./drafts";
import { publishCarousel, type PublishCarouselResult } from "./instagram";
import { buildFullCaption } from "./content";
import { appendToManifest, loadManifest } from "./published";

export interface PublishDraftResult extends PublishCarouselResult {
  draftId: string;
  imageUrls: string[];
}

export class AlreadyPublishedError extends Error {
  constructor(
    public readonly draftId: string,
    public readonly mediaId: string,
  ) {
    super(`Draft ${draftId} already published as media ${mediaId}`);
    this.name = "AlreadyPublishedError";
  }
}

export async function publishDraft(
  draftId: string,
): Promise<PublishDraftResult> {
  // Idempotence : refuse de publier 2× le même draftId.
  const { manifest } = await loadManifest();
  const existing = manifest.entries.find((e) => e.draftId === draftId);
  if (existing) {
    throw new AlreadyPublishedError(draftId, existing.mediaId);
  }

  const draft = await loadDraft(draftId);
  const base = env().PUBLIC_BASE_URL;

  const imageUrls: string[] = [];
  for (let i = 0; i < draft.slides.length; i++) {
    const renderUrl = `${base}/api/render/${draftId}/${i}`;
    const res = await fetch(renderUrl);
    if (!res.ok) {
      throw new Error(
        `Render failed for slide ${i} (${renderUrl}): ${res.status}`,
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const blob = await put(
      `instagram/${draftId}/${Date.now()}-${i}.png`,
      buf,
      {
        access: "public",
        contentType: "image/png",
      },
    );
    imageUrls.push(blob.url);
  }

  const result = await publishCarousel({
    auth: {
      igUserId: env().IG_BUSINESS_ACCOUNT_ID,
      accessToken: env().META_PAGE_ACCESS_TOKEN,
    },
    imageUrls,
    caption: buildFullCaption(draft),
  });

  try {
    await appendToManifest({
      draftId,
      mediaId: result.mediaId,
      theme: draft.theme,
      publishedAt: new Date().toISOString(),
      blobSlideUrls: imageUrls,
      captionPreview: draft.caption.slice(0, 200),
    });
  } catch (err) {
    console.error(
      `[publish] Failed to append draft ${draftId} to manifest:`,
      err,
    );
    // Le post est déjà sur Instagram, on ne fait pas échouer le publish.
  }

  return { ...result, draftId, imageUrls };
}
