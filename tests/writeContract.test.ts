import { describe, expect, it } from "vitest";
import type { CommerceWriteRepository } from "@/repositories/core/commerceWriteRepository";
import { createMockWriteRepository } from "@/repositories/mock/mockCommerceWriteRepository";
import { type ActorContext } from "@/repositories/core/writeModels";

const ctx: ActorContext = { userId: "contract", role: "owner" };

/**
 * repository 契約テスト。永続レベルの不変条件を検証する。
 * mock / Supabase の両実装で同じ assertion を満たすこと（Supabase 実装後に同関数を流用）。
 */
export function runWriteContract(name: string, makeRepo: () => CommerceWriteRepository) {
  describe(`write repository contract: ${name}`, () => {
    it("applies inventory movements and records audit", async () => {
      const repo = makeRepo();
      const item = await repo.createInventoryItem({ productId: "p1" }, ctx);
      await repo.applyInventoryMovement(item.id, { reason: "purchase_in", quantityDelta: 5 }, ctx);
      const after = await repo.getInventoryItem(item.id);
      expect(after?.quantity).toBe(5);
      expect((await repo.listAuditLogs()).length).toBeGreaterThan(0);
    });

    it("rejects negative quantity at the persistence boundary", async () => {
      const repo = makeRepo();
      const item = await repo.createInventoryItem({ productId: "p1" }, ctx);
      await expect(
        repo.applyInventoryMovement(item.id, { reason: "manual_adjust", quantityDelta: -1 }, ctx),
      ).rejects.toMatchObject({ code: "negative_stock" });
    });

    it("is idempotent for a repeated idempotency key", async () => {
      const repo = makeRepo();
      const item = await repo.createInventoryItem({ productId: "p1" }, ctx);
      await repo.applyInventoryMovement(item.id, { reason: "purchase_in", quantityDelta: 5 }, ctx);
      await repo.applyInventoryMovement(item.id, { reason: "purchase_in", quantityDelta: 5, idempotencyKey: "k1" }, ctx);
      await repo.applyInventoryMovement(item.id, { reason: "purchase_in", quantityDelta: 5, idempotencyKey: "k1" }, ctx);
      expect((await repo.getInventoryItem(item.id))?.quantity).toBe(10);
    });

    it("creates orders and changes status with events", async () => {
      const repo = makeRepo();
      const order = await repo.createOrder({ brandId: "b", storeId: "s", currency: "TWD" }, ctx);
      const updated = await repo.changeOrderStatus(order.id, "quote_preparing", ctx);
      expect(updated.status).toBe("quote_preparing");
    });
  });
}

runWriteContract("mock", () => {
  const repo = createMockWriteRepository();
  repo.seed();
  return repo;
});
