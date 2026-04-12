import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getDraft } from "@/lib/repos/drafts";
import { HookSlide } from "@/templates/slide-hook";
import { ContentSlide } from "@/templates/slide-content";
import { CtaSlide } from "@/templates/slide-cta";

export const runtime = "nodejs";

const SIZE = 1080;

let fontsPromise: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | null =
  null;

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readFile(join(process.cwd(), "fonts/inter-latin-400-normal.woff2")),
      readFile(join(process.cwd(), "fonts/inter-latin-800-normal.woff2")),
    ]).then(([r, b]) => ({
      regular: r.buffer.slice(
        r.byteOffset,
        r.byteOffset + r.byteLength,
      ) as ArrayBuffer,
      bold: b.buffer.slice(
        b.byteOffset,
        b.byteOffset + b.byteLength,
      ) as ArrayBuffer,
    }));
  }
  return fontsPromise;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ draftId: string; index: string }> },
) {
  const { draftId, index: indexStr } = await ctx.params;
  const index = Number.parseInt(indexStr, 10);

  const draft = await getDraft(draftId);
  if (!draft) {
    return new Response(`Draft not found: ${draftId}`, { status: 404 });
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

  const { regular, bold } = await loadFonts();

  return new ImageResponse(element, {
    width: SIZE,
    height: SIZE,
    fonts: [
      { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: bold, weight: 800 as const, style: "normal" as const },
    ],
  });
}
