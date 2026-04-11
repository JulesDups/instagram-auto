"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createIdea,
  updateIdea,
  deleteIdea,
  reorderIdeas,
} from "@/lib/repos/ideas";
import {
  type ActionResult,
  successAction,
  errorAction,
} from "@/lib/action-result";

const CreateSchema = z.object({
  text: z.string().min(1, "Le texte est vide").max(2000, "Trop long (max 2000)"),
  hardCta: z
    .string()
    .transform((s) => s === "on" || s === "true")
    .optional(),
});

export async function createIdeaAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorAction(parsed.error.issues[0]?.message ?? "Entrée invalide");
  }
  try {
    await createIdea({
      text: parsed.data.text,
      hardCta: parsed.data.hardCta ?? false,
    });
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur à la création de l'idée",
    );
  }
  revalidatePath("/ideas");
  revalidatePath("/overview");
  return successAction("Idée ajoutée");
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, "Le texte est vide").max(2000, "Trop long (max 2000)"),
  hardCta: z
    .string()
    .transform((s) => s === "on" || s === "true")
    .optional(),
});

export async function updateIdeaAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorAction(parsed.error.issues[0]?.message ?? "Entrée invalide");
  }
  try {
    await updateIdea(parsed.data.id, {
      text: parsed.data.text,
      hardCta: parsed.data.hardCta ?? false,
    });
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur à la mise à jour",
    );
  }
  revalidatePath("/ideas");
  revalidatePath("/overview");
  return successAction("Idée mise à jour");
}

export async function deleteIdeaAction(id: string): Promise<ActionResult> {
  try {
    await deleteIdea(id);
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur à la suppression",
    );
  }
  revalidatePath("/ideas");
  revalidatePath("/overview");
  return successAction("Idée supprimée");
}

export async function reorderIdeasAction(
  orderedIds: string[],
): Promise<ActionResult> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return errorAction("Liste d'ordre vide");
  }
  try {
    await reorderIdeas(orderedIds);
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur au réordonnancement",
    );
  }
  revalidatePath("/ideas");
  return successAction("Ordre sauvegardé");
}
