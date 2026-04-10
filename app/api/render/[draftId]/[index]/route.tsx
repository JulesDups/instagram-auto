import { ImageResponse } from "next/og";
import { loadDraft } from "@/lib/drafts";
import { HookSlide } from "@/templates/slide-hook";
import { ContentSlide } from "@/templates/slide-content";
import { CtaSlide } from "@/templates/slide-cta";

export const runtime = "nodejs";

const SIZE = 1080;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ draftId: string; index: string }> },
) {
  const { draftId, index: indexStr } = await ctx.params;
  const index = Number.parseInt(indexStr, 10);

  let draft;
  try {
    draft = await loadDraft(draftId);
  } catch (err) {
    return new Response(
      `Draft not found: ${draftId}\n${err instanceof Error ? err.message : ""}`,
      { status: 404 },
    );
  }

  if (Number.isNaN(index) || index < 0 || index >= draft.slides.length) {
    return new Response(
      `Invalid slide index ${indexStr} for draft with ${draft.slides.length} slides`,
      { status: 400 },
    );
  }

  const slide = draft.slides[index];
  const element = (() => {
    switch (slide.kind) {
      case "hook":
        return <HookSlide slide={slide} theme={draft.theme} />;
      case "cta":
        return <CtaSlide slide={slide} theme={draft.theme} />;
      case "content":
      default:
        return (
          <ContentSlide
            slide={slide}
            theme={draft.theme}
            index={index}
            total={draft.slides.length}
          />
        );
    }
  })();

  return new ImageResponse(element, {
    width: SIZE,
    height: SIZE,
  });
}
