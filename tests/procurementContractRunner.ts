import { describe, expect, it } from "vitest";
import type { ProcurementRepository } from "@/repositories/core/procurementRepository";
import { type ActorContext } from "@/repositories/core/writeModels";

/** 実在しない有効 UUID（not_found 検証用。実 DB の uuid 列でも型エラーにならない）。 */
const MISSING_ID = "99999999-9999-9999-9999-999999999999";

/**
 * 調達 repository 契約テスト本体（mock / Supabase 共通）。永続レベルの不変条件を検証する。
 * vitest の収集対象外（`.test` ではない）。各テストファイルから import して使う。
 * actor は呼び出し側が渡す（mock は任意文字列、Supabase は実 profiles.id UUID）。
 */
export function runProcurementContract(
  name: string,
  makeRepo: () => ProcurementRepository,
  ctx: ActorContext,
) {
  describe(`procurement repository contract: ${name}`, () => {
    it("creates, reads and lists suppliers", async () => {
      const repo = makeRepo();
      const created = await repo.createSupplier(
        { organizationId: "org-test", name: "Test Supplier", publicLevel: "private" },
        ctx,
      );
      expect(created.id).toBeTruthy();
      expect(await repo.getSupplier(created.id)).toMatchObject({ name: "Test Supplier" });
      const list = await repo.listSuppliers();
      expect(list.some((s) => s.id === created.id)).toBe(true);
    });

    it("updates a supplier and keeps id/organization stable", async () => {
      const repo = makeRepo();
      const created = await repo.createSupplier({ organizationId: "org-test", name: "Before" }, ctx);
      const updated = await repo.updateSupplier(created.id, { name: "After", region: "Uji" }, ctx);
      expect(updated.name).toBe("After");
      expect(updated.region).toBe("Uji");
      expect(updated.id).toBe(created.id);
      expect(updated.organizationId).toBe(created.organizationId);
    });

    it("soft-deletes then restores; default list excludes deleted", async () => {
      const repo = makeRepo();
      const created = await repo.createSupplier({ organizationId: "org-test", name: "Temp" }, ctx);
      await repo.softDeleteSupplier(created.id, ctx);
      expect((await repo.listSuppliers()).some((s) => s.id === created.id)).toBe(false);
      expect((await repo.listSuppliers({ includeDeleted: true })).some((s) => s.id === created.id)).toBe(true);
      const restored = await repo.restoreSupplier(created.id, ctx);
      expect(restored.deletedAt).toBeUndefined();
      expect((await repo.listSuppliers()).some((s) => s.id === created.id)).toBe(true);
    });

    it("public listing returns only public suppliers without internal fields", async () => {
      const repo = makeRepo();
      await repo.createSupplier(
        { organizationId: "org-test", name: "Public One", publicLevel: "public", note: "secret", contact: "x" },
        ctx,
      );
      await repo.createSupplier(
        { organizationId: "org-test", name: "Hidden", publicLevel: "private", note: "secret" },
        ctx,
      );
      const publicList = await repo.listPublicSuppliers();
      expect(publicList.some((s) => s.name === "Public One")).toBe(true);
      expect(publicList.some((s) => s.name === "Hidden")).toBe(false);
      // 公開投影に内部フィールドが含まれないこと。
      for (const s of publicList) {
        expect(s).not.toHaveProperty("note");
        expect(s).not.toHaveProperty("contact");
      }
    });

    it("rejects an unknown supplier id", async () => {
      const repo = makeRepo();
      await expect(repo.updateSupplier(MISSING_ID, { name: "x" }, ctx)).rejects.toMatchObject({
        code: "not_found",
      });
    });

    it("creates a purchase with items and lists it", async () => {
      const repo = makeRepo();
      const purchase = await repo.createPurchase(
        {
          organizationId: "org-test",
          purchasedOn: "2026-06-18",
          currency: "JPY",
          transportMinor: 1000,
          items: [
            { quantity: 2, unitPriceMinor: 500 },
            { quantity: 1, unitPriceMinor: 1500 },
          ],
        },
        ctx,
      );
      expect(purchase.items).toHaveLength(2);
      expect((await repo.listPurchases()).some((p) => p.id === purchase.id)).toBe(true);
    });

    it("allocates ancillary cost across items and preserves the total", async () => {
      const repo = makeRepo();
      const purchase = await repo.createPurchase(
        {
          organizationId: "org-test",
          purchasedOn: "2026-06-18",
          currency: "JPY",
          transportMinor: 900,
          items: [
            { quantity: 1, unitPriceMinor: 100 },
            { quantity: 2, unitPriceMinor: 100 },
          ],
        },
        ctx,
      );
      const allocations = await repo.allocatePurchaseCosts(purchase.id, "quantity", ctx);
      // 900 を数量 1:2 で配賦 → 300 / 600。
      expect(allocations.map((a) => a.allocatedAmountMinor).sort((a, b) => a - b)).toEqual([300, 600]);
      expect(allocations.reduce((s, a) => s + a.allocatedAmountMinor, 0)).toBe(900);
      // 再配賦は置き換え（重複しない）。
      const again = await repo.allocatePurchaseCosts(purchase.id, "purchase_value", ctx);
      expect(again).toHaveLength(2);
    });

    it("soft-deletes and restores a purchase", async () => {
      const repo = makeRepo();
      const purchase = await repo.createPurchase(
        { organizationId: "org-test", purchasedOn: "2026-06-18", currency: "JPY" },
        ctx,
      );
      await repo.softDeletePurchase(purchase.id, ctx);
      expect((await repo.listPurchases()).some((p) => p.id === purchase.id)).toBe(false);
      await repo.restorePurchase(purchase.id, ctx);
      expect((await repo.listPurchases()).some((p) => p.id === purchase.id)).toBe(true);
    });
  });
}
