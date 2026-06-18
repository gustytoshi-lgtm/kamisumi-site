import { beforeEach, describe, expect, it } from "vitest";
import { createSettingsService } from "@/lib/commerce/settingsService";
import {
  createMockSettingsRepository,
  type MockSettingsRepository,
} from "@/repositories/mock/mockSettingsRepository";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "o1", role: "owner" };
const front: ActorContext = { userId: "f1", role: "front_staff" };

let repo: MockSettingsRepository;
let service: ReturnType<typeof createSettingsService>;

beforeEach(() => {
  repo = createMockSettingsRepository();
  repo.seed();
  service = createSettingsService(repo);
});

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("settings service", () => {
  it("owner lists seeded settings", async () => {
    const list = await service.listSettings(owner);
    expect(list.find((s) => s.key === "hold_hours")?.value).toBe("48");
  });

  it("front_staff cannot read or write settings", async () => {
    await expectErr(service.listSettings(front), "forbidden");
    await expectErr(service.updateSetting(front, "hold_hours", "24"), "forbidden");
  });

  it("validates value by type", async () => {
    await expectErr(service.updateSetting(owner, "contact_email", "not-an-email"), "validation");
    await expectErr(service.updateSetting(owner, "hold_hours", "0"), "validation");
    await expectErr(service.updateSetting(owner, "hold_hours", "abc"), "validation");
    await expectErr(service.updateSetting(owner, "order_accepting", "maybe"), "validation");
  });

  it("rejects non-whitelisted (secret) keys", async () => {
    await expectErr(service.updateSetting(owner, "SUPABASE_SERVICE_ROLE_KEY", "x"), "forbidden");
    await expectErr(service.updateSetting(owner, "bank_account", "123"), "forbidden");
  });

  it("updates a valid value and records history (old → new)", async () => {
    await service.updateSetting(owner, "contact_email", "hello@kamisumi.test");
    expect((await service.getSetting(owner, "contact_email"))?.value).toBe("hello@kamisumi.test");
    const history = await service.listHistory(owner, "contact_email");
    expect(history[0]?.newValue).toBe("hello@kamisumi.test");
    expect(history[0]?.changedBy).toBe("o1");
  });

  it("reset clears state", async () => {
    await service.updateSetting(owner, "hold_hours", "72");
    repo.reset();
    expect(await repo.listSettings()).toHaveLength(0);
  });
});
