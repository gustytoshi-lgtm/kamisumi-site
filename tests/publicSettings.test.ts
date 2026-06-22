import { afterEach, describe, expect, it } from "vitest";
import {
  getPublicSettings,
  hasPublicContactEmail,
  isPublicUrl,
} from "@/lib/settings/publicSettings";
import { mockSettingsRepository } from "@/repositories/mock/mockSettingsRepository";

const ownerCtx = { userId: "owner-1", role: "owner" as const };

afterEach(() => {
  // 後続テストへ影響しないよう既定値へ戻す。
  mockSettingsRepository.seed();
});

describe("hasPublicContactEmail", () => {
  it("rejects blank and the demo placeholder", () => {
    expect(hasPublicContactEmail("")).toBe(false);
    expect(hasPublicContactEmail("   ")).toBe(false);
    expect(hasPublicContactEmail("hello@example.com")).toBe(false);
  });

  it("accepts a real address", () => {
    expect(hasPublicContactEmail("shop@kamisumi.test")).toBe(true);
  });
});

describe("isPublicUrl", () => {
  it("accepts http(s) urls only", () => {
    expect(isPublicUrl("https://threads.net/@kamisumi")).toBe(true);
    expect(isPublicUrl("http://example.test")).toBe(true);
    expect(isPublicUrl("")).toBe(false);
    expect(isPublicUrl("javascript:alert(1)")).toBe(false);
    expect(isPublicUrl("threads.net/@kamisumi")).toBe(false);
  });
});

describe("getPublicSettings", () => {
  it("falls back to siteConfig defaults on a fresh seed", async () => {
    mockSettingsRepository.seed();
    const settings = await getPublicSettings();
    // 既定 seed は仮メール（プレースホルダ）と空 SNS、受付 on。
    expect(hasPublicContactEmail(settings.contactEmail)).toBe(false);
    expect(settings.socialThreads).toBe("");
    expect(settings.orderAccepting).toBe(true);
    expect(settings.holdHours).toBeGreaterThan(0);
  });

  it("reflects owner-edited values (I-017)", async () => {
    await mockSettingsRepository.updateSetting("contact_email", "shop@kamisumi.test", ownerCtx);
    await mockSettingsRepository.updateSetting("social_threads", "https://threads.net/@kamisumi", ownerCtx);
    await mockSettingsRepository.updateSetting("order_accepting", "off", ownerCtx);
    await mockSettingsRepository.updateSetting("hold_hours", "72", ownerCtx);

    const settings = await getPublicSettings();
    expect(settings.contactEmail).toBe("shop@kamisumi.test");
    expect(hasPublicContactEmail(settings.contactEmail)).toBe(true);
    expect(settings.socialThreads).toBe("https://threads.net/@kamisumi");
    expect(settings.orderAccepting).toBe(false);
    expect(settings.holdHours).toBe(72);
  });

  it("guards hold_hours against invalid values", async () => {
    await mockSettingsRepository.updateSetting("hold_hours", "not-a-number", ownerCtx);
    const settings = await getPublicSettings();
    expect(settings.holdHours).toBe(48);
  });
});
