import { describe, expect, it } from "vitest";
import { createFulfillmentService } from "@/lib/commerce/fulfillmentService";
import { createMockFulfillmentRepository } from "@/repositories/mock/mockFulfillmentRepository";
import type { ActorContext } from "@/repositories/core/writeModels";

const frontStaff: ActorContext = { userId: "fs", role: "front_staff" };
const editor: ActorContext = { userId: "ed", role: "editor" };

function service() {
  return createFulfillmentService(createMockFulfillmentRepository());
}

describe("fulfillmentService", () => {
  it("lets fulfillment roles create and advance shipments", async () => {
    const svc = service();
    const shipment = await svc.createShipment(frontStaff, { orderId: "o1" });
    const shipped = await svc.changeShipmentStatus(frontStaff, shipment.id, "shipped");
    expect(shipped.status).toBe("shipped");
    const delivered = await svc.changeShipmentStatus(frontStaff, shipment.id, "delivered");
    expect(delivered.status).toBe("delivered");
  });

  it("rejects invalid status transitions", async () => {
    const svc = service();
    const shipment = await svc.createShipment(frontStaff, { orderId: "o1" });
    await expect(svc.changeShipmentStatus(frontStaff, shipment.id, "delivered")).rejects.toMatchObject({
      code: "invalid_transition",
    });
  });

  it("forbids roles without order:update_status (e.g. editor)", async () => {
    const svc = service();
    await expect(svc.createShipment(editor, { orderId: "o1" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("returns not_found for an unknown shipment status change", async () => {
    const svc = service();
    await expect(svc.changeShipmentStatus(frontStaff, "nope", "shipped")).rejects.toMatchObject({
      code: "not_found",
    });
  });
});
