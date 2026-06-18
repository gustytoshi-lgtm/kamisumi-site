import { describe, expect, it } from "vitest";
import { createMockNotifier, createSandboxEmailNotifier } from "@/lib/commerce/notifications";
import {
  createMockSnsDraftRepository,
  generateJournalDraftFromThread,
  generateSnsDraftBody,
} from "@/lib/commerce/snsDraft";
import { createSnsDraftService } from "@/lib/commerce/snsDraftService";
import type { ActorContext } from "@/repositories/core/writeModels";

const front: ActorContext = { userId: "f1", role: "front_staff" };
const inventory: ActorContext = { userId: "i1", role: "inventory_staff" };

describe("mock notifier", () => {
  it("records sends with masked recipient and never throws on valid input", async () => {
    const notifier = createMockNotifier();
    const r = await notifier.send({ channel: "email", kind: "order_status", to: "customer@example.com", body: "hi" });
    expect(r.status).toBe("sent");
    expect(notifier.listSent()).toHaveLength(1);
    // listSent must not leak full recipient
    expect(JSON.stringify(notifier.listSent())).not.toContain("customer@example.com");
  });

  it("validates recipient/body and sandbox email is not implemented", async () => {
    const notifier = createMockNotifier();
    await expect(notifier.send({ channel: "email", kind: "restock", to: "", body: "x" })).rejects.toThrow();
    await expect(createSandboxEmailNotifier().send({ channel: "email", kind: "restock", to: "a@b.c", body: "x" })).rejects.toThrow();
  });
});

describe("sns draft generators (no invented facts)", () => {
  it("builds body from provided fields only", () => {
    const body = generateSnsDraftBody({ platform: "threads", title: "京都薄茶", region: "京都", shortDescription: "やさしい香り" });
    expect(body).toContain("京都薄茶");
    expect(body).toContain("京都");
    expect(body).toContain("やさしい香り");
  });
  it("derives a journal draft title from the first line", () => {
    const d = generateJournalDraftFromThread("今日の買付メモ\n二行目");
    expect(d.title).toBe("今日の買付メモ");
    expect(d.body).toContain("二行目");
  });
});

describe("sns draft approval flow (no auto-publish)", () => {
  it("creates pending, approves, and prevents double-approval", async () => {
    const service = createSnsDraftService(createMockSnsDraftRepository());
    const draft = await service.createDraftFromProduct(front, { platform: "threads", title: "抹茶" });
    expect(draft.status).toBe("pending");
    const approved = await service.approveDraft(front, draft.id);
    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe("f1");
    await expect(service.approveDraft(front, draft.id)).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("rejects, and inventory_staff cannot manage drafts", async () => {
    const service = createSnsDraftService(createMockSnsDraftRepository());
    const draft = await service.createDraft(front, { platform: "instagram", body: "x" });
    const rejected = await service.rejectDraft(front, draft.id);
    expect(rejected.status).toBe("rejected");
    await expect(service.createDraft(inventory, { platform: "threads", body: "y" })).rejects.toMatchObject({ code: "forbidden" });
  });
});
