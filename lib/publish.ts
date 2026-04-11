import "server-only";
import { put } from "@vercel/blob";
import { env } from "./env";
import { getDraft, setDraftStatus } from "./repos/drafts";
import {
  publishCarousel,
  getPermalink,
  type PublishCarouselResult,
} from "./instagram";
import { buildFullCaption } from "./content";

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

export async function publishDraft(draftId: string): Promise<PublishDraftResult> {
  // 1. Load draft and idempotency check via DB status
  const draft = await getDraft(draftId);
  if (!draft) throw new Error(`Draft ${draftId} not found`);
  if (draft.status === "published" && draft.mediaId) {
    throw new AlreadyPublishedError(draftId, draft.mediaId);
  }

  const base = env().PUBLIC_BASE_URL;

  // 2. Render each slide to PNG and upload to Vercel Blob
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
      { access: "public", contentType: "image/png" },
    );
    imageUrls.push(blob.url);
  }

  // 3. Publish carousel via Instagram Graph API
  const result = await publishCarousel({
    auth: {
      igUserId: env().IG_BUSINESS_ACCOUNT_ID,
      accessToken: env().META_PAGE_ACCESS_TOKEN,
    },
    imageUrls,
    caption: buildFullCaption(draft),
  });

  // 4. Best-effort: fetch permalink then persist to DB.
  //    The post is already live on Instagram at this point — DB failures
  //    must NOT surface as publish errors to the caller.
  let permalink: string | undefined;
  try {
    const p = await getPermalink(result.mediaId, env().META_PAGE_ACCESS_TOKEN);
    if (p) permalink = p;
  } catch (err) {
    console.error(`[publish] getPermalink failed for ${draftId}:`, err);
  }

  try {
    await setDraftStatus(draftId, {
      status: "published",
      mediaId: result.mediaId,
      slideBlobUrls: imageUrls,
      permalink,
    });
  } catch (err) {
    console.error(`[publish] setDraftStatus failed for ${draftId}:`, err);
    // Post is live on Instagram — do not fail the publish response.
  }

  return { ...result, draftId, imageUrls };
}
