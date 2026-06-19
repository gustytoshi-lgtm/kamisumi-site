import { beforeEach, describe, expect, it } from "vitest";
import { createCustomerPortalService } from "@/lib/customer/customerPortalService";
import {
  createMockCustomerPortalRepository,
  MOCK_CUSTOMER_ID,
  MOCK_CUSTOMER_USER_ID,
  type MockCustomerPortalRepository,
} from "@/repositories/mock/mockCustomerPortalRepository";
import type { CustomerSession } from "@/lib/customer/auth";

let repo: MockCustomerPortalRepository;
let service: ReturnType<typeof createCustomerPortalService>;

const session: CustomerSession = {
  userId: MOCK_CUSTOMER_USER_ID,
  customerId: MOCK_CUSTOMER_ID,
  organizationId: "org-kagurakoji",
  preferredLocale: "zh-tw",
};

beforeEach(() => {
  repo = createMockCustomerPortalRepository();
  service = createCustomerPortalService(repo);
});

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("customer portal service", () => {
  it("requires a customer session", async () => {
    await expectErr(service.getSnapshot(null), "forbidden");
  });

  it("loads the linked customer snapshot without exposing internal notes", async () => {
    const snapshot = await service.getSnapshot(session);
    expect(snapshot.account.customerId).toBe(MOCK_CUSTOMER_ID);
    expect(snapshot.profile.email).toBe("guest@example.com");
    expect(snapshot).not.toHaveProperty("notes");
  });

  it("updates profile and preferred locale for the linked customer only", async () => {
    const updated = await service.updateProfile(session, {
      name: "Tea Guest",
      contactHandle: "@guest",
      preferredLocale: "ja",
    });
    expect(updated.profile.name).toBe("Tea Guest");
    expect(updated.profile.contactHandle).toBe("@guest");
    expect(updated.account.preferredLocale).toBe("ja");
    await expectErr(service.updateProfile({ ...session, customerId: "other" }, { name: "x" }), "forbidden");
  });

  it("creates and updates addresses scoped to the session customer", async () => {
    const address = await service.createAddress(session, {
      recipientName: "Tea Guest",
      countryCode: "TW",
      line1: "Taipei",
    });
    expect(address.customerId).toBe(MOCK_CUSTOMER_ID);
    const updated = await service.updateAddress(session, address.id, { line2: "Room 2" });
    expect(updated.line2).toBe("Room 2");
    await expectErr(service.updateAddress({ ...session, customerId: "other" }, address.id, { line1: "x" }), "forbidden");
  });

  it("validates non-empty profile name", async () => {
    await expectErr(service.updateProfile(session, { name: "" }), "validation");
  });
});
