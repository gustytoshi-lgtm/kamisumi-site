import { siteConfig } from "@/config/site";
import type { MatchaLotRepository } from "@/repositories/core/matchaLotRepository";
import type {
  MatchaLotCreateInput,
  MatchaLotUpdateInput,
} from "@/repositories/core/matchaLotModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { can, type Permission } from "./rbac";

/**
 * 抹茶ロット業務サービス。読取は inventory:view_public、書込は inventory:manage に限定。
 * 数量は整数で扱い、非負は repository（永続層）が保証する。
 */
function assertCan(ctx: ActorContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${permission}`, { permission });
  }
}

export function createMatchaLotService(repo: MatchaLotRepository) {
  return {
    async listLots(ctx: ActorContext, options?: { productId?: string; includeDeleted?: boolean }) {
      assertCan(ctx, "inventory:view_public");
      return repo.listLots(options);
    },
    async getLot(ctx: ActorContext, id: string) {
      assertCan(ctx, "inventory:view_public");
      return repo.getLot(id);
    },
    async createLot(
      ctx: ActorContext,
      input: Omit<MatchaLotCreateInput, "organizationId"> & { organizationId?: string },
    ) {
      assertCan(ctx, "inventory:manage");
      if (!input.productId || input.productId.trim() === "") {
        throw new CommerceError("validation", "productId is required");
      }
      if (input.quantity !== undefined && (!Number.isInteger(input.quantity) || input.quantity < 0)) {
        throw new CommerceError("validation", "quantity must be a non-negative integer");
      }
      return repo.createLot(
        { ...input, organizationId: input.organizationId ?? siteConfig.organization.id },
        ctx,
      );
    },
    async updateLot(ctx: ActorContext, id: string, patch: MatchaLotUpdateInput) {
      assertCan(ctx, "inventory:manage");
      return repo.updateLot(id, patch, ctx);
    },
    async adjustQuantity(ctx: ActorContext, id: string, delta: number, note?: string) {
      assertCan(ctx, "inventory:manage");
      if (!Number.isInteger(delta) || delta === 0) {
        throw new CommerceError("validation", "delta must be a non-zero integer");
      }
      return repo.adjustQuantity(id, delta, ctx, note);
    },
    async deleteLot(ctx: ActorContext, id: string) {
      assertCan(ctx, "inventory:manage");
      return repo.softDeleteLot(id, ctx);
    },
    async restoreLot(ctx: ActorContext, id: string) {
      assertCan(ctx, "inventory:manage");
      return repo.restoreLot(id, ctx);
    },
  };
}

export type MatchaLotService = ReturnType<typeof createMatchaLotService>;
