import { describe, expect, it } from "vitest";
import type { FulfillmentRepository } from "@/repositories/core/fulfillmentRepository";
import { type ActorContext } from "@/repositories/core/writeModels";

/** 実在しない有効 UUID（not_found 検証用）。 */
const MISSING_ID = "99999999-9999-9999-9999-999999999999";

/**
 * 既存エンティティ参照。`nextOrderId` は呼ぶたびに新しい order id を返す
 * （mock は任意文字列、Supabase は実 provisional_orders を作成してその UUID を返す）。
 * 共有 DB でも list-by-order が衝突しないよう毎回ユニークにする。
 */
export type FulfillmentContractFixtures = {
  organizationId: string;
  nextOrderId: () => Promise<string>;
};

/**
 * フルフィルメント repository 契約テスト本体（mock / Supabase 共通）。
 * vitest 収集対象外（`.test` ではない）。各テストファイルから import して使う。
 */
export function runFulfillmentContract(
  name: string,
  makeRepo: () => FulfillmentRepository,
  ctx: ActorContext,
  fx: FulfillmentContractFixtures,
) {
  describe(`fulfillment repository contract: ${name}`, () => {
    it("creates a shipment in preparing status and computes freight burden", async () => {
      const repo = makeRepo();
      const shipment = await repo.createShipment(
        {
          organizationId: fx.organizationId,
          orderId: await fx.nextOrderId(),
          costCurrency: "TWD",
          actualCostMinor: 500,
          chargedCostMinor: 300,
        },
        ctx,
      );
      expect(shipment.status).toBe("preparing");
      expect(shipment.kamisumiBears).toEqual({ currency: "TWD", amountMinor: 200 });
    });

    it("records status changes with events and timestamps", async () => {
      const repo = makeRepo();
      const shipment = await repo.createShipment(
        { organizationId: fx.organizationId, orderId: await fx.nextOrderId() },
        ctx,
      );
      const shipped = await repo.changeShipmentStatus(shipment.id, "shipped", ctx, "handed to carrier");
      expect(shipped.status).toBe("shipped");
      expect(shipped.shippedOn).toBeTruthy();
      expect(shipped.statusUpdatedBy).toBe(ctx.userId);
      const events = await repo.listShipmentStatusEvents(shipment.id);
      expect(events.at(-1)).toMatchObject({ fromStatus: "preparing", toStatus: "shipped" });
    });

    it("updates shipment fields and lists by order", async () => {
      const repo = makeRepo();
      const orderA = await fx.nextOrderId();
      const orderB = await fx.nextOrderId();
      const a = await repo.createShipment({ organizationId: fx.organizationId, orderId: orderA }, ctx);
      await repo.createShipment({ organizationId: fx.organizationId, orderId: orderB }, ctx);
      await repo.updateShipment(a.id, { carrier: "Black Cat", trackingNumber: "TW123" }, ctx);
      const byOrder = await repo.listShipments({ orderId: orderA });
      expect(byOrder).toHaveLength(1);
      expect(byOrder[0]).toMatchObject({ carrier: "Black Cat", trackingNumber: "TW123" });
    });

    it("rejects an unknown shipment id", async () => {
      const repo = makeRepo();
      await expect(repo.updateShipment(MISSING_ID, { carrier: "x" }, ctx)).rejects.toMatchObject({
        code: "not_found",
      });
    });
  });
}
