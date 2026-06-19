import { describe, expect, it } from "vitest";
import type { CustomerPortalRepository } from "@/repositories/core/customerRepository";

export function runCustomerPortalContract(
  name: string,
  makeRepo: () => CustomerPortalRepository,
  userId: string,
) {
  describe(`customer portal repository contract: ${name}`, () => {
    it("loads account snapshot, updates profile and manages addresses", async () => {
      const repo = makeRepo();
      const account = await repo.getAccountByUserId(userId);
      expect(account).toBeTruthy();
      if (!account) return;

      const snapshot = await repo.getSnapshot(account);
      expect(snapshot.profile.id).toBe(account.customerId);
      expect(snapshot).not.toHaveProperty("notes");

      const updated = await repo.updateCustomerProfile(account, {
        name: "Contract Customer",
        preferredLocale: "ja",
      });
      expect(updated.profile.name).toBe("Contract Customer");
      expect(updated.account.preferredLocale).toBe("ja");

      const address = await repo.createAddress(account, {
        recipientName: "Contract Customer",
        countryCode: "TW",
        line1: "Taipei",
      });
      expect(address.customerId).toBe(account.customerId);
      const changed = await repo.updateAddress(account, address.id, { line2: "2F" });
      expect(changed.line2).toBe("2F");
    });
  });
}
