import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import { pickNextSource } from "@/lib/repos/next-source";
import { createIdea } from "@/lib/repos/ideas";
import { createQueueItem } from "@/lib/repos/queue";
import { createDraft, setDraftStatus } from "@/lib/repos/drafts";

describe("next-source", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("ideas take priority over queue", async () => {
    await createIdea({ text: "idea A", hardCta: true }, testDb);
    await createQueueItem({ theme: "tech-decryption", angle: "queue A" }, testDb);

    const result = await pickNextSource(testDb);
    expect(result.kind).toBe("idea");
    if (result.kind === "idea") {
      expect(result.text).toBe("idea A");
      expect(result.hardCta).toBe(true);
    }
  });

  test("queue used when ideas empty", async () => {
    await createQueueItem(
      { theme: "tech-decryption", angle: "queue A", notes: "n", cta: true },
      testDb,
    );
    const result = await pickNextSource(testDb);
    expect(result.kind).toBe("queue");
    if (result.kind === "queue") {
      expect(result.angle).toBe("queue A");
      expect(result.theme).toBe("tech-decryption");
    }
  });

  test("fallback picks under-represented theme when both empty", async () => {
    // Published: 2 tech-decryption + 1 build-in-public → human-pro is most under-represented.
    for (const [id, theme] of [
      ["p1", "tech-decryption"],
      ["p2", "tech-decryption"],
      ["p3", "build-in-public"],
    ] as const) {
      await createDraft(
        {
          id,
          createdAt: "2026-04-10T10:00:00.000Z",
          theme,
          caption: "c",
          hashtags: [],
          slides: [
            { kind: "hook", title: "t" },
            { kind: "content", title: "t" },
          ],
        },
        testDb,
      );
      await setDraftStatus(id, { status: "published", mediaId: id }, testDb);
    }

    const result = await pickNextSource(testDb);
    expect(result.kind).toBe("fallback");
    if (result.kind === "fallback") {
      expect(result.theme).toBe("human-pro");
    }
  });

  test("picking an idea marks it consumed atomically", async () => {
    const idea = await createIdea({ text: "idea A", hardCta: false }, testDb);
    await pickNextSource(testDb);
    const fresh = await testDb.idea.findUnique({ where: { id: idea.id } });
    expect(fresh?.consumed).toBe(true);
  });

  test("picking a queue item marks it consumed atomically", async () => {
    const q = await createQueueItem({ theme: "tech-decryption", angle: "A" }, testDb);
    await pickNextSource(testDb);
    const fresh = await testDb.queueItem.findUnique({ where: { id: q.id } });
    expect(fresh?.consumed).toBe(true);
  });

  test("concurrent calls never return the same idea", async () => {
    await createIdea({ text: "only one", hardCta: false }, testDb);
    const [a, b] = await Promise.all([pickNextSource(testDb), pickNextSource(testDb)]);
    const kinds = [a.kind, b.kind].filter((k) => k === "idea");
    expect(kinds).toHaveLength(1);
  });
});
