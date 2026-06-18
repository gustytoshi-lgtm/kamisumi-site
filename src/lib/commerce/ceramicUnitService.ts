import type { CeramicUnitRepository } from "@/repositories/core/ceramicUnitRepository";
import {
  isCeramicUnitStatus,
  stripCost,
  type CeramicUnitCreateInput,
  type CeramicUnitStatus,
  type CeramicUnitUpdateInput,
} from "@/repositories/core/ceramicUnitModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { can, type Permission } from "./rbac";

/**
 * 陶器個体サービス。読取=inventory:view_public、書込=inventory:manage。
 * 原価(cost)は cost:view（owner）を持つロールにのみ返す（front_staff/inventory_staff には落とす）。
 */
function assertCan(ctx: ActorContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${permission}`, { permission });
  }
}

export function createCeramicUnitService(repo: CeramicUnitRepository) {
  return {
    async listUnits(ctx: ActorContext, options?: { productId?: string; includeDeleted?: boolean }) {
      assertCan(ctx, "inventory:view_public");
      const records = await repo.listUnits(options);
      const showCost = can(ctx.role, "cost:view");
      return showCost ? records : records.map(stripCost);
    },
    async getUnit(ctx: ActorContext, id: string) {
      assertCan(ctx, "inventory:view_public");
      const record = await repo.getUnit(id);
      if (!record) return null;
      return can(ctx.role, "cost:view") ? record : stripCost(record);
    },
    async createUnit(
      ctx: ActorContext,
      input: CeramicUnitCreateInput,
    ) {
      assertCan(ctx, "inventory:manage");
      if (input.costMinor !== undefined && !can(ctx.role, "cost:view")) {
        throw new CommerceError("forbidden", "setting cost requires cost:view (owner)");
      }
      const created = await repo.createUnit(input, ctx);
      return can(ctx.role, "cost:view") ? created : stripCost(created);
    },
    async updateUnit(ctx: ActorContext, id: string, patch: CeramicUnitUpdateInput) {
      assertCan(ctx, "inventory:manage");
      const updated = await repo.updateUnit(id, patch, ctx);
      return can(ctx.role, "cost:view") ? updated : stripCost(updated);
    },
    async setStatus(ctx: ActorContext, id: string, status: CeramicUnitStatus) {
      assertCan(ctx, "inventory:manage");
      if (!isCeramicUnitStatus(status)) {
        throw new CommerceError("validation", `invalid ceramic unit status: ${status}`);
      }
      const updated = await repo.setStatus(id, status, ctx);
      return can(ctx.role, "cost:view") ? updated : stripCost(updated);
    },
    async deleteUnit(ctx: ActorContext, id: string) {
      assertCan(ctx, "inventory:manage");
      return repo.softDeleteUnit(id, ctx);
    },
    async restoreUnit(ctx: ActorContext, id: string) {
      assertCan(ctx, "inventory:manage");
      return repo.restoreUnit(id, ctx);
    },
  };
}

export type CeramicUnitService = ReturnType<typeof createCeramicUnitService>;
