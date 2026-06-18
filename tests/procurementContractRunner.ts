import { describe, expect, it } from "vitest";
import type { ProcurementRepository } from "@/repositories/core/procurementRepository";
import { type ActorContext } from "@/repositories/core/writeModels";

const ctx: ActorContext = { userId: "contract", role: "owner" };

/**
 * 調達 repository 契約テスト本体（mock / Supabase 共通）。永続レベルの不変条件を検証する。
 * vitest の収集対象外（`.test` ではない）。各テストファイルから import して使う。
 */
export function runProcurementContract(name: string, makeRepo: () => ProcurementRepository) {
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
      await expect(repo.updateSupplier("does-not-exist", { name: "x" }, ctx)).rejects.toMatchObject({
        code: "not_found",
      });
    });
  });
}
