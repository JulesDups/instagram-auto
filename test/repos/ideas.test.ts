import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import {
  createIdea,
  listIdeas,
  updateIdea,
  deleteIdea,
  markIdeaConsumed,
} from "@/lib/repos/ideas";

describe("ideas repo", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("create + list pending ideas", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    await createIdea({ text: "B", hardCta: true }, testDb);
    const items = await listIdeas({ consumed: false }, testDb);
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("A");
    expect(a.hardCta).toBe(false);
  });

  test("markIdeaConsumed removes from pending list", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    await markIdeaConsumed(a.id, testDb);
    expect(await listIdeas({ consumed: false }, testDb)).toHaveLength(0);
    expect(await listIdeas({ consumed: true }, testDb)).toHaveLength(1);
  });

  test("update + delete work", async () => {
    const a = await createIdea({ text: "A", hardCta: false }, testDb);
    await updateIdea(a.id, { text: "A2", hardCta: true }, testDb);
    const items = await listIdeas({}, testDb);
    expect(items[0].text).toBe("A2");
    expect(items[0].hardCta).toBe(true);
    await deleteIdea(a.id, testDb);
    expect(await listIdeas({}, testDb)).toHaveLength(0);
  });
});
