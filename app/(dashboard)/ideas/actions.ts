"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createIdea, updateIdea, deleteIdea } from "@/lib/repos/ideas";

const CreateSchema = z.object({
  text: z.string().min(1).max(2000),
  hardCta: z
    .string()
    .transform((s) => s === "on" || s === "true")
    .optional(),
});

export async function createIdeaAction(formData: FormData) {
  const parsed = CreateSchema.parse(Object.fromEntries(formData));
  await createIdea({
    text: parsed.text,
    hardCta: parsed.hardCta ?? false,
  });
  revalidatePath("/ideas");
  revalidatePath("/overview");
}

const UpdateSchema = z.object({
  text: z.string().min(1).max(2000).optional(),
  hardCta: z
    .string()
    .transform((s) => s === "on" || s === "true")
    .optional(),
});

export async function updateIdeaAction(id: string, formData: FormData) {
  const parsed = UpdateSchema.parse(Object.fromEntries(formData));
  await updateIdea(id, parsed);
  revalidatePath("/ideas");
  revalidatePath("/overview");
}

export async function deleteIdeaAction(id: string) {
  await deleteIdea(id);
  revalidatePath("/ideas");
  revalidatePath("/overview");
}
