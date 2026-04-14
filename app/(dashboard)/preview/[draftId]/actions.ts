"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SlideSchema, type Slide, type SlideKind } from "@/lib/content";
import {
  getDraft,
  setDraftStatus,
  updateDraftContent,
} from "@/lib/repos/drafts";
import {
  type ActionResult,
  successAction,
  errorAction,
} from "@/lib/action-result";

const HASHTAG_SEPARATOR = /\s+/;

function parseHashtags(raw: string): string[] {
  return raw
    .split(HASHTAG_SEPARATOR)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);
}

function parseSlides(formData: FormData): Slide[] {
  const count = Number(formData.get("slide_count") ?? "0");
  const slides: Slide[] = [];
  for (let i = 0; i < count; i++) {
    const kind = formData.get(`slide_${i}_kind`);
    const title = formData.get(`slide_${i}_title`);
    const body = formData.get(`slide_${i}_body`);
    const footer = formData.get(`slide_${i}_footer`);
    const slide = SlideSchema.parse({
      kind: kind as SlideKind,
      title: typeof title === "string" ? title : "",
      body:
        typeof body === "string" && body.trim() ? body : undefined,
      footer:
        typeof footer === "string" && footer.trim() ? footer : undefined,
    });
    slides.push(slide);
  }
  return slides;
}

const DraftMetaSchema = z.object({
  id: z.string().min(1),
  caption: z.string().min(1, "Caption vide").max(2200, "Caption trop longue"),
  hashtags: z.string().max(2000),
});

export async function saveDraftAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const meta = DraftMetaSchema.safeParse({
    id: formData.get("id"),
    caption: formData.get("caption"),
    hashtags: formData.get("hashtags") ?? "",
  });
  if (!meta.success) {
    return errorAction(meta.error.issues[0]?.message ?? "Entrée invalide");
  }
  let slides: Slide[];
  try {
    slides = parseSlides(formData);
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Slides invalides",
    );
  }
  if (slides.length < 2 || slides.length > 10) {
    return errorAction("Un carousel nécessite entre 2 et 10 slides");
  }
  try {
    await updateDraftContent(meta.data.id, {
      caption: meta.data.caption,
      hashtags: parseHashtags(meta.data.hashtags),
      slides,
    });
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur à la sauvegarde",
    );
  }
  revalidatePath(`/preview/${meta.data.id}`);
  revalidatePath("/library");
  return successAction("Draft sauvegardé");
}

export async function rejectDraftAction(draftId: string): Promise<ActionResult> {
  const draft = await getDraft(draftId);
  if (!draft) return errorAction("Draft introuvable");
  try {
    await setDraftStatus(draftId, { status: "rejected" });
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur au rejet",
    );
  }
  revalidatePath(`/preview/${draftId}`);
  revalidatePath("/library");
  return successAction("Draft rejeté");
}

export async function resetToPendingAction(draftId: string): Promise<ActionResult> {
  const draft = await getDraft(draftId);
  if (!draft) return errorAction("Draft introuvable");
  if (draft.status !== "published") return errorAction("Le draft n'est pas publié");
  try {
    await setDraftStatus(draftId, { status: "pending" });
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur au reset",
    );
  }
  revalidatePath(`/preview/${draftId}`);
  revalidatePath("/library");
  return successAction("Draft remis en attente");
}
