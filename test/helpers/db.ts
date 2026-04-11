import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required for tests");
}

export const testDb = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.TEST_DATABASE_URL }),
});

export async function resetDb(): Promise<void> {
  // Order matters: Slide → Draft (FK), then QueueItem, Idea.
  await testDb.slide.deleteMany();
  await testDb.draft.deleteMany();
  await testDb.queueItem.deleteMany();
  await testDb.idea.deleteMany();
}
