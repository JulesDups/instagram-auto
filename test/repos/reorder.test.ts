import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import {
  createIdea,
  listIdeas,
  markIdeaConsumed,
  reorderIdeas,
} from "@/lib/repos/ideas";
import {
  createQueueItem,
  listQueue,
  reorderQueueItems,
} from "@/lib/repos/queue";
import { pickNextSource } from "@/lib/repos/next-source";

describe("reorder: ideas", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("createIdea assigns monotonically increasing position", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    const b = await createIdea({ text: "B", hardCta: false }, testDb);
    const c = await createIdea({ text: "C", hardCta: false }, testDb);
    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
    expect(c.position).toBe(2);
  });

  test("createIdea scopes position to non-consumed ideas, ignoring consumed ones", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    await markIdeaConsumed(a.id, testDb);
    const b = await createIdea({ text: "B", hardCta: false }, testDb);
    expect(b.position).toBe(0);
  });

  test("reorderIdeas updates positions so listIdeas returns the new order", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    const b = await createIdea({ text: "B", hardCta: false }, testDb);
    const c = await createIdea({ text: "C", hardCta: false }, testDb);

    await reorderIdeas([c.id, a.id, b.id], testDb);

    const items = await listIdeas({ consumed: false }, testDb);
    expect(items.map((i) => i.text)).toEqual(["C", "A", "B"]);
    expect(items.map((i) => i.position)).toEqual([0, 1, 2]);
  });

  test("pickNextSource respects reordered ideas position", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    const b = await createIdea({ text: "B", hardCta: false }, testDb);
    // Move B to front
    await reorderIdeas([b.id, a.id], testDb);

    const source = await pickNextSource(testDb);
    expect(source.kind).toBe("idea");
    if (source.kind === "idea") {
      expect(source.text).toBe("B");
    }
  });
});

describe("reorder: queue", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("reorderQueueItems updates positions so listQueue returns the new order", async () => {
    const a = await createQueueItem(
      { theme: "tech-decryption", angle: "A" },
      testDb,
    );
    const b = await createQueueItem(
      { theme: "build-in-public", angle: "B" },
      testDb,
    );
    const c = await createQueueItem(
      { theme: "human-pro", angle: "C" },
      testDb,
    );

    await reorderQueueItems([c.id, a.id, b.id], testDb);

    const items = await listQueue({ consumed: false }, testDb);
    expect(items.map((i) => i.angle)).toEqual(["C", "A", "B"]);
    expect(items.map((i) => i.position)).toEqual([0, 1, 2]);
  });

  test("pickNextSource respects reordered queue position after no ideas", async () => {
    const a = await createQueueItem(
      { theme: "tech-decryption", angle: "first" },
      testDb,
    );
    const b = await createQueueItem(
      { theme: "build-in-public", angle: "second" },
      testDb,
    );
    await reorderQueueItems([b.id, a.id], testDb);

    const source = await pickNextSource(testDb);
    expect(source.kind).toBe("queue");
    if (source.kind === "queue") {
      expect(source.angle).toBe("second");
    }
  });
});
