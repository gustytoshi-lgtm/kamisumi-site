import type { FulfillmentRepository } from "@/repositories/core/fulfillmentRepository";
import type {
  ShipmentCreateInput,
  ShipmentUpdateInput,
} from "@/repositories/core/fulfillmentModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { canTransitionShipment, isShipmentStatus, type ShipmentStatus } from "./shipmentStatus";
import { can, type Permission } from "./rbac";
import type { Notifier } from "./notifications";
import { notifyBestEffort } from "./notify";

/**
 * フルフィルメント（配送）業務サービス。RBAC と配送状態機械を強制し、検証後に repository へ委譲する。
 * 配送は組織メンバーの運用業務（RLS shipments_member, 0004）。order:update_status で扱う。
 * 送料の actual/charged は原価/利益（商品）ではなく運用情報のため front_staff も操作可。
 */
const SHIPMENT_PERMISSION: Permission = "order:update_status";

function assertCan(ctx: ActorContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${permission}`, { permission });
  }
}

export function createFulfillmentService(repo: FulfillmentRepository, notifier?: Notifier) {
  return {
    async createShipment(ctx: ActorContext, input: ShipmentCreateInput) {
      assertCan(ctx, SHIPMENT_PERMISSION);
      return repo.createShipment(input, ctx);
    },

    async updateShipment(ctx: ActorContext, id: string, patch: ShipmentUpdateInput) {
      assertCan(ctx, SHIPMENT_PERMISSION);
      return repo.updateShipment(id, patch, ctx);
    },

    async changeShipmentStatus(
      ctx: ActorContext,
      id: string,
      toStatus: ShipmentStatus,
      note?: string,
    ) {
      assertCan(ctx, SHIPMENT_PERMISSION);
      if (!isShipmentStatus(toStatus)) {
        throw new CommerceError("validation", `invalid shipment status: ${toStatus}`);
      }
      const shipment = await repo.getShipment(id);
      if (!shipment) throw new CommerceError("not_found", `shipment ${id} not found`);
      if (!canTransitionShipment(shipment.status, toStatus)) {
        throw new CommerceError(
          "invalid_transition",
          `shipment ${shipment.status} -> ${toStatus} not allowed`,
          { from: shipment.status, to: toStatus },
        );
      }
      const updated = await repo.changeShipmentStatus(id, toStatus, ctx, note);
      await notifyBestEffort(notifier, {
        channel: "in_app",
        kind: "shipment_update",
        to: updated.orderId ?? `shipment:${updated.id}`,
        body: `shipment ${updated.id}: ${shipment.status} -> ${toStatus}`,
      });
      return updated;
    },

    async getShipment(ctx: ActorContext, id: string) {
      assertCan(ctx, SHIPMENT_PERMISSION);
      return repo.getShipment(id);
    },

    async listShipments(ctx: ActorContext, options?: { orderId?: string }) {
      assertCan(ctx, SHIPMENT_PERMISSION);
      return repo.listShipments(options);
    },

    async listShipmentStatusEvents(ctx: ActorContext, shipmentId: string) {
      assertCan(ctx, SHIPMENT_PERMISSION);
      return repo.listShipmentStatusEvents(shipmentId);
    },
  };
}

export type FulfillmentService = ReturnType<typeof createFulfillmentService>;
