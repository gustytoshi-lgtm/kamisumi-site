import type { Locale } from "@/config/site";
import type { CommerceWriteRepository } from "@/repositories/core/commerceWriteRepository";
import {
  CommerceError,
  type ActorContext,
  type ProductCreateInput,
  type ProductStatus,
  type ProductUpdateInput,
} from "@/repositories/core/writeModels";
import { canTransitionInventory } from "./inventoryStatus";
import { canTransitionOrder, type OrderStatus } from "./orderStatus";
import { can, type Permission } from "./rbac";
import { isPurchasableStatus } from "@/lib/status";
import type { Notifier } from "./notifications";
import { notifyBestEffort } from "./notify";

/**
 * 業務サービス層。RBAC と状態遷移・購入可否などの業務ルールを一元的に強制し、
 * 検証後に書込 repository（mock / Supabase 共通契約）へ委譲する。
 * repository は永続レベルの不変条件（在庫非負・冪等・監査）を担う。
 * 状態変化時は notifier（任意）へ best-effort で通知を enqueue する（失敗は業務処理を止めない）。
 */
function assertCan(ctx: ActorContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${permission}`, { permission });
  }
}

export function createCommerceService(repo: CommerceWriteRepository, notifier?: Notifier) {
  return {
    // ===== 商品 =====
    async createProduct(ctx: ActorContext, input: ProductCreateInput) {
      assertCan(ctx, "product:manage");
      return repo.createProduct(input, ctx);
    },
    async updateProduct(ctx: ActorContext, id: string, patch: ProductUpdateInput) {
      assertCan(ctx, "product:manage");
      return repo.updateProduct(id, patch, ctx);
    },
    async setProductStatus(ctx: ActorContext, id: string, status: ProductStatus) {
      assertCan(ctx, "product:manage_status");
      return repo.setProductStatus(id, status, ctx);
    },
    async updateProductTranslation(
      ctx: ActorContext,
      id: string,
      locale: Locale,
      fields: { title?: string; shortDescription?: string; description?: string; story?: string },
    ) {
      assertCan(ctx, "product:edit_translation");
      return repo.upsertProductTranslation(id, locale, fields, ctx);
    },
    async deleteProduct(ctx: ActorContext, id: string) {
      assertCan(ctx, "product:manage");
      return repo.softDeleteProduct(id, ctx);
    },
    async restoreProduct(ctx: ActorContext, id: string) {
      assertCan(ctx, "product:manage");
      return repo.restoreProduct(id, ctx);
    },

    // ===== 在庫（すべて inventory_movements 経由）=====
    async receiveStock(ctx: ActorContext, itemId: string, quantity: number, opts: { idempotencyKey?: string; note?: string } = {}) {
      assertCan(ctx, "inventory:manage");
      assertPositive(quantity);
      return repo.applyInventoryMovement(
        itemId,
        { reason: "purchase_in", quantityDelta: quantity, ...opts },
        ctx,
      );
    },
    async adjustStock(ctx: ActorContext, itemId: string, delta: number, opts: { idempotencyKey?: string; note?: string } = {}) {
      assertCan(ctx, "inventory:manage");
      return repo.applyInventoryMovement(itemId, { reason: "manual_adjust", quantityDelta: delta, ...opts }, ctx);
    },
    async reserveStock(ctx: ActorContext, itemId: string, quantity: number, opts: { idempotencyKey?: string } = {}) {
      assertCan(ctx, "provisional_order:manage");
      assertPositive(quantity);
      const item = await repo.getInventoryItem(itemId);
      if (!item) throw new CommerceError("not_found", `inventory ${itemId} not found`);
      const product = await repo.getProductById(item.productId);
      if (product && !isPurchasableStatus(product.publicStatus)) {
        throw new CommerceError("not_purchasable", `product ${item.productId} is not purchasable`, {
          status: product.publicStatus,
        });
      }
      return repo.applyInventoryMovement(itemId, { reason: "reserve", reservedDelta: quantity, ...opts }, ctx);
    },
    async releaseReservation(ctx: ActorContext, itemId: string, quantity: number, opts: { idempotencyKey?: string } = {}) {
      assertCan(ctx, "provisional_order:manage");
      assertPositive(quantity);
      return repo.applyInventoryMovement(itemId, { reason: "release_reservation", reservedDelta: -quantity, ...opts }, ctx);
    },
    async holdStock(ctx: ActorContext, itemId: string, quantity: number, opts: { idempotencyKey?: string } = {}) {
      assertCan(ctx, "inventory:manage");
      assertPositive(quantity);
      return repo.applyInventoryMovement(itemId, { reason: "hold", heldDelta: quantity, ...opts }, ctx);
    },
    async releaseHold(ctx: ActorContext, itemId: string, quantity: number, opts: { idempotencyKey?: string } = {}) {
      assertCan(ctx, "inventory:manage");
      assertPositive(quantity);
      return repo.applyInventoryMovement(itemId, { reason: "release_hold", heldDelta: -quantity, ...opts }, ctx);
    },
    async shipAllocate(ctx: ActorContext, itemId: string, quantity: number, opts: { idempotencyKey?: string } = {}) {
      assertCan(ctx, "inventory:move");
      assertPositive(quantity);
      const item = await repo.getInventoryItem(itemId);
      if (!item) throw new CommerceError("not_found", `inventory ${itemId} not found`);
      if (item.reserved < quantity) {
        throw new CommerceError("conflict", "cannot ship more than reserved", { reserved: item.reserved });
      }
      // 予約済みを出荷: 物理在庫と予約を同時に減らす（原子的に repo が適用）。
      return repo.applyInventoryMovement(
        itemId,
        { reason: "ship_out", quantityDelta: -quantity, reservedDelta: -quantity, ...opts },
        ctx,
      );
    },
    async cancelShip(ctx: ActorContext, itemId: string, quantity: number, opts: { idempotencyKey?: string } = {}) {
      assertCan(ctx, "inventory:move");
      assertPositive(quantity);
      return repo.applyInventoryMovement(
        itemId,
        { reason: "return_in", quantityDelta: quantity, reservedDelta: quantity, ...opts },
        ctx,
      );
    },
    async setInventoryStatus(ctx: ActorContext, itemId: string, status: Parameters<CommerceWriteRepository["setInventoryStatus"]>[1]) {
      assertCan(ctx, "inventory:manage");
      const item = await repo.getInventoryItem(itemId);
      if (!item) throw new CommerceError("not_found", `inventory ${itemId} not found`);
      if (!canTransitionInventory(item.status, status)) {
        throw new CommerceError("invalid_transition", `inventory ${item.status} -> ${status}`, {
          from: item.status,
          to: status,
        });
      }
      return repo.setInventoryStatus(itemId, status, ctx);
    },

    // ===== 注文 =====
    async createOrder(ctx: ActorContext, input: Parameters<CommerceWriteRepository["createOrder"]>[0]) {
      assertCan(ctx, "provisional_order:manage");
      return repo.createOrder(input, ctx);
    },
    async updateOrder(ctx: ActorContext, id: string, patch: Parameters<CommerceWriteRepository["updateOrder"]>[1]) {
      assertCan(ctx, "provisional_order:manage");
      return repo.updateOrder(id, patch, ctx);
    },
    async changeOrderStatus(ctx: ActorContext, id: string, toStatus: OrderStatus, note?: string) {
      assertCan(ctx, "order:update_status");
      const order = await repo.getOrder(id);
      if (!order) throw new CommerceError("not_found", `order ${id} not found`);
      if (!canTransitionOrder(order.status, toStatus)) {
        throw new CommerceError("invalid_transition", `order ${order.status} -> ${toStatus}`, {
          from: order.status,
          to: toStatus,
        });
      }
      const updated = await repo.changeOrderStatus(id, toStatus, ctx, note);
      await notifyBestEffort(notifier, {
        channel: "in_app",
        kind: "order_status",
        to: updated.customerId ?? `order:${updated.id}`,
        body: `order ${updated.id}: ${order.status} -> ${toStatus}`,
      });
      return updated;
    },
    async cancelOrder(ctx: ActorContext, id: string, note?: string) {
      return this.changeOrderStatus(ctx, id, "cancelled", note);
    },
    /**
     * 取消注文の再開（業務判断 PM-010）: cancelled のみ inquiry_received へ戻せる。
     * 通常の前進フローはバイパスせず、再開専用の限定遷移として扱う。
     */
    async reopenOrder(ctx: ActorContext, id: string, note?: string) {
      assertCan(ctx, "order:update_status");
      const order = await repo.getOrder(id);
      if (!order) throw new CommerceError("not_found", `order ${id} not found`);
      if (order.status !== "cancelled") {
        throw new CommerceError("invalid_transition", "only cancelled orders can be reopened", {
          from: order.status,
        });
      }
      return repo.changeOrderStatus(id, "inquiry_received", ctx, note ?? "reopened");
    },
    async setOrderNotes(ctx: ActorContext, id: string, notes: { customerNote?: string; internalNote?: string }) {
      assertCan(ctx, "order:update_status");
      return repo.setOrderNotes(id, notes, ctx);
    },

    // ===== 買付依頼 =====
    async createSourcingRequest(ctx: ActorContext, input: Parameters<CommerceWriteRepository["createSourcingRequest"]>[0]) {
      assertCan(ctx, "sourcing_request:manage");
      return repo.createSourcingRequest(input, ctx);
    },
    async updateSourcingRequestStatus(ctx: ActorContext, id: string, status: Parameters<CommerceWriteRepository["setSourcingRequestStatus"]>[1]) {
      assertCan(ctx, "sourcing_request:manage");
      return repo.setSourcingRequestStatus(id, status, ctx);
    },
    async linkSourcingRequestToSchedule(ctx: ActorContext, id: string, scheduleId: string) {
      assertCan(ctx, "sourcing_request:manage");
      return repo.linkSourcingRequestToSchedule(id, scheduleId, ctx);
    },

    // ===== Journal =====
    async createJournalDraft(ctx: ActorContext, input: Parameters<CommerceWriteRepository["createJournalDraft"]>[0]) {
      assertCan(ctx, "journal:manage");
      return repo.createJournalDraft(input, ctx);
    },
    async updateJournalTranslation(ctx: ActorContext, id: string, locale: Locale, fields: { title: string; excerpt?: string }) {
      assertCan(ctx, "journal:manage");
      return repo.upsertJournalTranslation(id, locale, fields, ctx);
    },
    async publishJournal(ctx: ActorContext, id: string) {
      assertCan(ctx, "journal:manage");
      return repo.setJournalStatus(id, "published", ctx);
    },
    async unpublishJournal(ctx: ActorContext, id: string) {
      assertCan(ctx, "journal:manage");
      return repo.setJournalStatus(id, "unlisted", ctx);
    },
    async deleteJournal(ctx: ActorContext, id: string) {
      assertCan(ctx, "journal:manage");
      return repo.softDeleteJournal(id, ctx);
    },
  };
}

export type CommerceService = ReturnType<typeof createCommerceService>;

function assertPositive(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new CommerceError("validation", `quantity must be a positive integer (got ${quantity})`);
  }
}
