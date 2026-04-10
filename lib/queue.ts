import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ThemeSchema } from "./content";

const QUEUE_FILE = path.join(process.cwd(), "content", "queue.json");

export const QueueItemSchema = z.object({
  theme: ThemeSchema,
  angle: z.string().min(1).max(240),
  notes: z.string().max(800).optional(),
  cta: z.boolean().optional(),
});
export type QueueItem = z.infer<typeof QueueItemSchema>;

export const QueueFileSchema = z.object({
  items: z.array(QueueItemSchema),
});
export type QueueFile = z.infer<typeof QueueFileSchema>;

export async function loadQueue(): Promise<QueueFile> {
  try {
    const raw = await fs.readFile(QUEUE_FILE, "utf-8");
    return QueueFileSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { items: [] };
    }
    throw err;
  }
}

export async function saveQueue(queue: QueueFile): Promise<void> {
  await fs.mkdir(path.dirname(QUEUE_FILE), { recursive: true });
  await fs.writeFile(
    QUEUE_FILE,
    JSON.stringify(queue, null, 2) + "\n",
    "utf-8",
  );
}
