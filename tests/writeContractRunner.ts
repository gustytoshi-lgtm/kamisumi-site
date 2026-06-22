import { describe, expect, it } from "vitest";
import type { CommerceWriteRepository } from "@/repositories/core/commerceWriteRepository";
import { type ActorContext } from "@/repositories/core/writeModels";

/** 既存エンティティ参照に使う ID（mock は任意文字列、Supabase は seed 済み UUID）。 */
export type WriteContractFixtures = {
  productId: string;
  brandId: string;
  storeId: string;
};

/**
 * repository 契約テスト本体（mock / Supabase 共通）。永続レベルの不変条件を検証する。
 * vitest の収集対象外（`.test` ではない）。各テストファイルから import して使う。
 * actor と既存エンティティ ID は呼び出し側が渡す（Supabase は実 profiles.id / seed UUID）。
 */
export function runWriteContract(
  name: string,
  makeRepo: () => CommerceWriteRepository,
  ctx: ActorContext,
  fx: WriteContractFixtures,
) {
  describe(`write repository contract: ${name}`, () => {
    it("applies inventory movements and records audit", async () => {
      const repo = makeRepo();
      const item = await repo.createInventoryItem({ productId: fx.productId }, ctx);
      await repo.applyInventoryMovement(item.id, { reason: "purchase_in", quantityDelta: 5 }, ctx);
      const after = await repo.getInventoryItem(item.id);
      expect(after?.quantity).toBe(5);
      expect((await repo.listAuditLogs()).length).toBeGreaterThan(0);
    });

    it("rejects negative quantity at the persistence boundary", async () => {
      const repo = makeRepo();
      const item = await repo.createInventoryItem({ productId: fx.productId }, ctx);
      await expect(
        repo.applyInventoryMovement(item.id, { reason: "manual_adjust", quantityDelta: -1 }, ctx),
      ).rejects.toMatchObject({ code: "negative_stock" });
    });

    it("is idempotent for a repeated idempotency key", async () => {
      const repo = makeRepo();
      const item = await repo.createInventoryItem({ productId: fx.productId }, ctx);
      // 共有 DB（Supabase）で再実行しても衝突しないよう毎回ユニークなキーにする。
      const idemKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await repo.applyInventoryMovement(item.id, { reason: "purchase_in", quantityDelta: 5 }, ctx);
      await repo.applyInventoryMovement(item.id, { reason: "purchase_in", quantityDelta: 5, idempotencyKey: idemKey }, ctx);
      await repo.applyInventoryMovement(item.id, { reason: "purchase_in", quantityDelta: 5, idempotencyKey: idemKey }, ctx);
      expect((await repo.getInventoryItem(item.id))?.quantity).toBe(10);
    });

    it("creates orders and changes status with events", async () => {
      const repo = makeRepo();
      const order = await repo.createOrder({ brandId: fx.brandId, storeId: fx.storeId, currency: "TWD" }, ctx);
      const updated = await repo.changeOrderStatus(order.id, "quote_preparing", ctx);
      expect(updated.status).toBe("quote_preparing");
    });

    it("persists order notes and leaves unspecified notes untouched (0006)", async () => {
      const repo = makeRepo();
      const order = await repo.createOrder({ brandId: fx.brandId, storeId: fx.storeId, currency: "TWD" }, ctx);

      const withCustomer = await repo.setOrderNotes(order.id, { customerNote: "発送は来週希望" }, ctx);
      expect(withCustomer.customerNote).toBe("発送は来週希望");

      // internalNote のみ更新しても customerNote は据え置き（undefined は上書きしない）。
      const withInternal = await repo.setOrderNotes(order.id, { internalNote: "入金確認待ち" }, ctx);
      expect(withInternal.internalNote).toBe("入金確認待ち");
      expect(withInternal.customerNote).toBe("発送は来週希望");

      const reloaded = await repo.getOrder(order.id);
      expect(reloaded?.customerNote).toBe("発送は来週希望");
      expect(reloaded?.internalNote).toBe("入金確認待ち");
    });
  });
}
