import { describe, expect, it } from "vitest";
import type { FulfillmentRepository } from "@/repositories/core/fulfillmentRepository";
import { type ActorContext } from "@/repositories/core/writeModels";

const ctx: ActorContext = { userId: "contract", role: "owner" };

/**
 * フルフィルメント repository 契約テスト本体（mock / Supabase 共通）。
 * vitest 収集対象外（`.test` ではない）。各テストファイルから import して使う。
 */
export function runFulfillmentContract(name: string, makeRepo: () => FulfillmentRepository) {
  describe(`fulfillment repository contract: ${name}`, () => {
    it("creates a shipment in preparing status and computes freight burden", async () => {
      const repo = makeRepo();
      const shipment = await repo.createShipment(
        { organizationId: "org-test", orderId: "o1", costCurrency: "TWD", actualCostMinor: 500, chargedCostMinor: 300 },
        ctx,
      );
      expect(shipment.status).toBe("preparing");
      expect(shipment.kamisumiBears).toEqual({ currency: "TWD", amountMinor: 200 });
    });

    it("records status changes with events and timestamps", async () => {
      const repo = makeRepo();
      const shipment = await repo.createShipment({ organizationId: "org-test", orderId: "o1" }, ctx);
      const shipped = await repo.changeShipmentStatus(shipment.id, "shipped", ctx, "handed to carrier");
      expect(shipped.status).toBe("shipped");
      expect(shipped.shippedOn).toBeTruthy();
      expect(shipped.statusUpdatedBy).toBe(ctx.userId);
      const events = await repo.listShipmentStatusEvents(shipment.id);
      expect(events.at(-1)).toMatchObject({ fromStatus: "preparing", toStatus: "shipped" });
    });

    it("updates shipment fields and lists by order", async () => {
      const repo = makeRepo();
      const a = await repo.createShipment({ organizationId: "org-test", orderId: "oA" }, ctx);
      await repo.createShipment({ organizationId: "org-test", orderId: "oB" }, ctx);
      await repo.updateShipment(a.id, { carrier: "Black Cat", trackingNumber: "TW123" }, ctx);
      const byOrder = await repo.listShipments({ orderId: "oA" });
      expect(byOrder).toHaveLength(1);
      expect(byOrder[0]).toMatchObject({ carrier: "Black Cat", trackingNumber: "TW123" });
    });

    it("rejects an unknown shipment id", async () => {
      const repo = makeRepo();
      await expect(repo.updateShipment("missing", { carrier: "x" }, ctx)).rejects.toMatchObject({
        code: "not_found",
      });
    });
  });
}
