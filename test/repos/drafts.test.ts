import { beforeEach, describe, expect, test } from "vitest";
import { DraftStatus } from "@prisma/client";
import { resetDb, testDb } from "../helpers/db";
import {
  createDraft,
  getDraft,
  updateDraftContent,
  setDraftStatus,
  listDrafts,
} from "@/lib/repos/drafts";
import type { Draft } from "@/lib/content";
import type { PersistedDraft } from "@/lib/repos/drafts";

const sample: Draft = {
  id: "test-draft-1",
  createdAt: "2026-04-11T10:00:00.000Z",
  theme: "tech-decryption",
  caption: "hello",
  hashtags: ["nextjs"],
  slides: [
    { kind: "hook", title: "Hook title" },
    { kind: "content", title: "Body", body: "body text" },
  ],
};

describe("drafts repo", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("createDraft persists draft + slides", async () => {
    await createDraft(sample, testDb);
    const row = await testDb.draft.findUnique({
      where: { id: "test-draft-1" },
      include: { slides: { orderBy: { position: "asc" } } },
    });
    expect(row?.slides).toHaveLength(2);
    expect(row?.status).toBe(DraftStatus.pending);
    expect(row?.slides[0].title).toBe("Hook title");
  });

  test("getDraft returns app-shaped draft", async () => {
    await createDraft(sample, testDb);
    const draft = await getDraft("test-draft-1", testDb);
    expect(draft).not.toBeNull();
    expect(draft!.theme).toBe("tech-decryption");
    expect(draft!.slides).toHaveLength(2);
  });

  test("updateDraftContent replaces slides atomically", async () => {
    await createDraft(sample, testDb);
    await updateDraftContent(
      "test-draft-1",
      {
        caption: "updated",
        hashtags: ["updated"],
        slides: [{ kind: "hook", title: "New hook" }],
      },
      testDb,
    );
    const draft = await getDraft("test-draft-1", testDb);
    expect(draft!.caption).toBe("updated");
    expect(draft!.slides).toHaveLength(1);
    expect(draft!.slides[0].title).toBe("New hook");
  });

  test("setDraftStatus transitions pending → published", async () => {
    await createDraft(sample, testDb);
    await setDraftStatus(
      "test-draft-1",
      {
        status: "published",
        mediaId: "ig_123",
        slideBlobUrls: ["https://blob/0.png"],
      },
      testDb,
    );
    const row = await testDb.draft.findUnique({ where: { id: "test-draft-1" } });
    expect(row?.status).toBe(DraftStatus.published);
    expect(row?.mediaId).toBe("ig_123");
    expect(row?.publishedAt).not.toBeNull();
  });

  test("setDraftStatus persists permalink when provided", async () => {
    await createDraft(sample, testDb);
    await setDraftStatus(
      "test-draft-1",
      {
        status: "published",
        mediaId: "ig_456",
        slideBlobUrls: ["https://blob/0.png"],
        permalink: "https://www.instagram.com/p/abc123/",
      },
      testDb,
    );
    const row = await testDb.draft.findUnique({ where: { id: "test-draft-1" } });
    expect(row?.permalink).toBe("https://www.instagram.com/p/abc123/");
  });

  test("getDraft returns PersistedDraft with status and permalink fields", async () => {
    await createDraft(sample, testDb);
    await setDraftStatus(
      "test-draft-1",
      {
        status: "published",
        mediaId: "ig_789",
        slideBlobUrls: ["https://blob/0.png"],
        permalink: "https://www.instagram.com/p/xyz789/",
      },
      testDb,
    );
    const draft = (await getDraft("test-draft-1", testDb)) as PersistedDraft;
    expect(draft).not.toBeNull();
    expect(draft.status).toBe("published");
    expect(draft.mediaId).toBe("ig_789");
    expect(draft.permalink).toBe("https://www.instagram.com/p/xyz789/");
    expect(draft.publishedAt).not.toBeNull();
  });

  test("getDraft returns null permalink for pending draft", async () => {
    await createDraft(sample, testDb);
    const draft = (await getDraft("test-draft-1", testDb)) as PersistedDraft;
    expect(draft).not.toBeNull();
    expect(draft.status).toBe("pending");
    expect(draft.mediaId).toBeNull();
    expect(draft.permalink).toBeNull();
  });

  test("listDrafts filters by status", async () => {
    await createDraft(sample, testDb);
    await createDraft({ ...sample, id: "test-draft-2" }, testDb);
    await setDraftStatus(
      "test-draft-2",
      { status: "rejected" },
      testDb,
    );
    const pending = await listDrafts({ status: "pending" }, testDb);
    const rejected = await listDrafts({ status: "rejected" }, testDb);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("test-draft-1");
    expect(rejected).toHaveLength(1);
  });
});
