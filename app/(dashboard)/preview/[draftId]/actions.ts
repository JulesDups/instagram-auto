"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SlideSchema } from "@/lib/content";
import {
  getDraft,
  setDraftStatus,
  updateDraftContent,
} from "@/lib/repos/drafts";

const EditSchema = z.object({
  caption: z.string().min(1).max(2200),
  hashtags: z.string().transform((s) =>
    s
      .split(/\s+/)
      .map((t) => t.replace(/^#/, ""))
      .filter(Boolean),
  ),
  slides: z.string().transform((raw, ctx) => {
    try {
      const parsed = JSON.parse(raw);
      return z.array(SlideSchema).min(2).max(10).parse(parsed);
    } catch (err) {
      ctx.addIssue({
        code: "custom",
        message: (err as Error).message,
      });
      return z.NEVER;
    }
  }),
});

export async function saveDraftAction(draftId: string, formData: FormData) {
  const parsed = EditSchema.parse(Object.fromEntries(formData));
  await updateDraftContent(draftId, parsed);
  revalidatePath(`/preview/${draftId}`);
  revalidatePath("/library");
}

export async function rejectDraftAction(draftId: string) {
  const draft = await getDraft(draftId);
  if (!draft) return;
  await setDraftStatus(draftId, { status: "rejected" });
  revalidatePath(`/preview/${draftId}`);
  revalidatePath("/library");
  redirect("/library?tab=rejected");
}
