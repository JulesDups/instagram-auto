import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required for tests");
}

export const testDb = new PrismaClient({
  adapter: new PrismaPg(process.env.TEST_DATABASE_URL),
});

export async function resetDb(): Promise<void> {
  // Order matters: Slide → Draft (FK), then QueueItem, Idea.
  await testDb.slide.deleteMany();
  await testDb.draft.deleteMany();
  await testDb.queueItem.deleteMany();
  await testDb.idea.deleteMany();
}
