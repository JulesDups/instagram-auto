import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import {
  createQueueItem,
  listQueue,
  updateQueueItem,
  deleteQueueItem,
  markQueueItemConsumed,
} from "@/lib/repos/queue";

describe("queue repo", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("createQueueItem appends with auto-incremented position", async () => {
    const a = await createQueueItem(
      { theme: "tech-decryption", angle: "A", cta: false },
      testDb,
    );
    const b = await createQueueItem(
      { theme: "human-pro", angle: "B", cta: true },
      testDb,
    );
    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
  });

  test("listQueue returns pending items ordered by position", async () => {
    await createQueueItem({ theme: "tech-decryption", angle: "A" }, testDb);
    await createQueueItem({ theme: "human-pro", angle: "B" }, testDb);
    const items = await listQueue({ consumed: false }, testDb);
    expect(items).toHaveLength(2);
    expect(items[0].angle).toBe("A");
  });

  test("markQueueItemConsumed flips consumed flag", async () => {
    const a = await createQueueItem({ theme: "tech-decryption", angle: "A" }, testDb);
    await markQueueItemConsumed(a.id, testDb);
    const remaining = await listQueue({ consumed: false }, testDb);
    expect(remaining).toHaveLength(0);
  });

  test("updateQueueItem + deleteQueueItem work", async () => {
    const a = await createQueueItem({ theme: "tech-decryption", angle: "A" }, testDb);
    await updateQueueItem(a.id, { angle: "A2", notes: "note" }, testDb);
    const items = await listQueue({}, testDb);
    expect(items[0].angle).toBe("A2");
    expect(items[0].notes).toBe("note");
    await deleteQueueItem(a.id, testDb);
    expect(await listQueue({}, testDb)).toHaveLength(0);
  });
});
