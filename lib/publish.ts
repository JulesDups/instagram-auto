import "server-only";
import { put } from "@vercel/blob";
import { env } from "./env";
import { loadDraft } from "./drafts";
import { publishCarousel, type PublishCarouselResult } from "./instagram";
import { buildFullCaption } from "./content";

export interface PublishDraftResult extends PublishCarouselResult {
  draftId: string;
  imageUrls: string[];
}

export async function publishDraft(draftId: string): Promise<PublishDraftResult> {
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

  return { ...result, draftId, imageUrls };
}
