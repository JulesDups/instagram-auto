"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ThemeSchema } from "@/lib/content";
import {
  createQueueItem,
  updateQueueItem,
  deleteQueueItem,
} from "@/lib/repos/queue";

const CreateSchema = z.object({
  theme: ThemeSchema,
  angle: z.string().min(1).max(240),
  notes: z
    .string()
    .max(800)
    .transform((s) => (s.trim() ? s : undefined))
    .optional(),
  cta: z
    .string()
    .transform((s) => s === "on" || s === "true")
    .optional(),
});

export async function createQueueItemAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = CreateSchema.parse(raw);
  await createQueueItem({
    theme: parsed.theme,
    angle: parsed.angle,
    notes: parsed.notes,
    cta: parsed.cta ?? false,
  });
  revalidatePath("/queue");
  revalidatePath("/overview");
}

const UpdateSchema = z.object({
  theme: ThemeSchema.optional(),
  angle: z.string().min(1).max(240).optional(),
  notes: z.string().max(800).optional(),
  cta: z
    .string()
    .transform((s) => s === "on" || s === "true")
    .optional(),
});

export async function updateQueueItemAction(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = UpdateSchema.parse(raw);
  await updateQueueItem(id, parsed);
  revalidatePath("/queue");
  revalidatePath("/overview");
}

export async function deleteQueueItemAction(id: string) {
  await deleteQueueItem(id);
  revalidatePath("/queue");
  revalidatePath("/overview");
}
