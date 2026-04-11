"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ThemeSchema } from "@/lib/content";
import {
  createQueueItem,
  updateQueueItem,
  deleteQueueItem,
  reorderQueueItems,
} from "@/lib/repos/queue";
import {
  type ActionResult,
  successAction,
  errorAction,
} from "@/lib/action-result";

const CreateSchema = z.object({
  theme: ThemeSchema,
  angle: z.string().min(1, "L'angle est vide").max(240, "Trop long (max 240)"),
  notes: z.string().max(800).optional(),
  cta: z
    .string()
    .transform((s) => s === "on" || s === "true")
    .optional(),
});

export async function createQueueItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return errorAction(parsed.error.issues[0]?.message ?? "Entrée invalide");
  }
  try {
    await createQueueItem({
      theme: parsed.data.theme,
      angle: parsed.data.angle,
      notes: parsed.data.notes?.trim() ? parsed.data.notes : undefined,
      cta: parsed.data.cta ?? false,
    });
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur à la création du sujet",
    );
  }
  revalidatePath("/queue");
  revalidatePath("/overview");
  return successAction("Sujet ajouté à la queue");
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  theme: ThemeSchema,
  angle: z.string().min(1, "L'angle est vide").max(240, "Trop long (max 240)"),
  notes: z.string().max(800).optional(),
  cta: z
    .string()
    .transform((s) => s === "on" || s === "true")
    .optional(),
});

export async function updateQueueItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return errorAction(parsed.error.issues[0]?.message ?? "Entrée invalide");
  }
  try {
    await updateQueueItem(parsed.data.id, {
      theme: parsed.data.theme,
      angle: parsed.data.angle,
      notes: parsed.data.notes ?? null,
      cta: parsed.data.cta ?? false,
    });
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur à la mise à jour",
    );
  }
  revalidatePath("/queue");
  revalidatePath("/overview");
  return successAction("Sujet mis à jour");
}

export async function deleteQueueItemAction(id: string): Promise<ActionResult> {
  try {
    await deleteQueueItem(id);
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur à la suppression",
    );
  }
  revalidatePath("/queue");
  revalidatePath("/overview");
  return successAction("Sujet supprimé");
}

export async function reorderQueueAction(
  orderedIds: string[],
): Promise<ActionResult> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return errorAction("Liste d'ordre vide");
  }
  try {
    await reorderQueueItems(orderedIds);
  } catch (err) {
    return errorAction(
      err instanceof Error ? err.message : "Erreur au réordonnancement",
    );
  }
  revalidatePath("/queue");
  return successAction("Ordre sauvegardé");
}
