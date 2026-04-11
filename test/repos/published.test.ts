import { beforeEach, describe, expect, test } from "vitest";
import { resetDb, testDb } from "../helpers/db";
import { createDraft, setDraftStatus } from "@/lib/repos/drafts";
import {
  listPublished,
  getLastPublished,
  getPillarDistribution,
  countPublishedThisWeek,
} from "@/lib/repos/published";
import type { Draft } from "@/lib/content";

function make(id: string, theme: Draft["theme"]): Draft {
  return {
    id,
    createdAt: "2026-04-11T10:00:00.000Z",
    theme,
    caption: "c",
    hashtags: [],
    slides: [
      { kind: "hook", title: "t" },
      { kind: "content", title: "t" },
    ],
  };
}

describe("published repo", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("getPillarDistribution over last N published", async () => {
    await createDraft(make("a", "tech-decryption"), testDb);
    await setDraftStatus("a", { status: "published", mediaId: "1" }, testDb);
    await createDraft(make("b", "build-in-public"), testDb);
    await setDraftStatus("b", { status: "published", mediaId: "2" }, testDb);

    const dist = await getPillarDistribution({ last: 7 }, testDb);
    expect(dist["tech-decryption"]).toBe(1);
    expect(dist["build-in-public"]).toBe(1);
    expect(dist["human-pro"]).toBe(0);
  });

  test("getLastPublished returns most recent", async () => {
    await createDraft(make("a", "tech-decryption"), testDb);
    await setDraftStatus("a", { status: "published", mediaId: "1" }, testDb);
    const last = await getLastPublished(testDb);
    expect(last?.id).toBe("a");
  });

  test("listPublished ordered desc", async () => {
    await createDraft(make("a", "tech-decryption"), testDb);
    await setDraftStatus("a", { status: "published", mediaId: "1" }, testDb);
    const list = await listPublished(testDb);
    expect(list).toHaveLength(1);
  });

  test("countPublishedThisWeek", async () => {
    await createDraft(make("a", "tech-decryption"), testDb);
    await setDraftStatus("a", { status: "published", mediaId: "1" }, testDb);
    expect(await countPublishedThisWeek(testDb)).toBe(1);
  });
});
