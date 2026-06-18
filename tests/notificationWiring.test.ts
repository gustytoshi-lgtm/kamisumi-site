import { beforeEach, describe, expect, it } from "vitest";
import { createCommerceService } from "@/lib/commerce/commerceService";
import { createPaymentService } from "@/lib/commerce/paymentService";
import { createFulfillmentService } from "@/lib/commerce/fulfillmentService";
import { createMockWriteRepository, type MockWriteRepository } from "@/repositories/mock/mockCommerceWriteRepository";
import { createMockPaymentRepository } from "@/repositories/mock/mockPaymentRepository";
import { createMockFulfillmentRepository } from "@/repositories/mock/mockFulfillmentRepository";
import { createMockNotifier, type Notifier } from "@/lib/commerce/notifications";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "o1", role: "owner" };

describe("notification wiring (best-effort, non-blocking)", () => {
  let notifier: ReturnType<typeof createMockNotifier>;
  beforeEach(() => {
    notifier = createMockNotifier();
  });

  it("enqueues order_status notification on changeOrderStatus", async () => {
    const repo: MockWriteRepository = createMockWriteRepository();
    repo.seed();
    const service = createCommerceService(repo, notifier);
    const order = await service.createOrder(owner, { brandId: "b", storeId: "s", currency: "TWD" });
    await service.changeOrderStatus(owner, order.id, "quote_preparing");
    const sent = notifier.listSent();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.kind).toBe("order_status");
  });

  it("enqueues payment_received on recordReceipt", async () => {
    const repo = createMockPaymentRepository();
    const service = createPaymentService(repo, notifier);
    const payment = await service.createPayment(owner, { currency: "TWD", expectedAmountMinor: 1000 });
    await service.recordReceipt(owner, payment.id, { amountMinor: 1000 });
    expect(notifier.listSent().some((n) => n.kind === "payment_received")).toBe(true);
  });

  it("enqueues shipment_update on changeShipmentStatus", async () => {
    const repo = createMockFulfillmentRepository();
    const service = createFulfillmentService(repo, notifier);
    const shipment = await service.createShipment(owner, { carrier: "x" });
    await service.changeShipmentStatus(owner, shipment.id, "shipped");
    expect(notifier.listSent().some((n) => n.kind === "shipment_update")).toBe(true);
  });

  it("does not block the business op when notifier throws", async () => {
    const throwing: Notifier = {
      async send() {
        throw new Error("notifier down");
      },
    };
    const repo: MockWriteRepository = createMockWriteRepository();
    repo.seed();
    const service = createCommerceService(repo, throwing);
    const order = await service.createOrder(owner, { brandId: "b", storeId: "s", currency: "TWD" });
    // status change must still succeed despite notifier failure
    const updated = await service.changeOrderStatus(owner, order.id, "quote_preparing");
    expect(updated.status).toBe("quote_preparing");
  });

  it("works without a notifier (optional)", async () => {
    const repo: MockWriteRepository = createMockWriteRepository();
    repo.seed();
    const service = createCommerceService(repo);
    const order = await service.createOrder(owner, { brandId: "b", storeId: "s", currency: "TWD" });
    await expect(service.changeOrderStatus(owner, order.id, "quote_preparing")).resolves.toBeDefined();
  });
});
