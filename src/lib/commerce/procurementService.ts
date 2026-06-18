import { siteConfig } from "@/config/site";
import type { ProcurementRepository } from "@/repositories/core/procurementRepository";
import {
  isSupplierPublicLevel,
  type PurchaseCreateInput,
  type SupplierCreateInput,
  type SupplierUpdateInput,
} from "@/repositories/core/procurementModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import type { AllocationMethod } from "./costAllocation";
import { can, type Permission } from "./rbac";

/**
 * 調達ドメインの業務サービス。RBAC と入力検証を一元化し、検証後に repository へ委譲する。
 * 仕入先は原価/取引先という機微情報を含むため、書込・内部閲覧は purchase:manage（owner）に限定。
 * 公開一覧 listPublicSuppliers は権限不要（内部情報を含まない投影のみ返す）。
 */
function assertCan(ctx: ActorContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${permission}`, { permission });
  }
}

function assertValidSupplierInput(input: Partial<SupplierCreateInput>): void {
  if (input.name !== undefined && input.name.trim() === "") {
    throw new CommerceError("validation", "supplier name must not be empty");
  }
  if (input.publicLevel !== undefined && !isSupplierPublicLevel(input.publicLevel)) {
    throw new CommerceError("validation", `invalid public level: ${input.publicLevel}`);
  }
}

export function createProcurementService(repo: ProcurementRepository) {
  return {
    async createSupplier(
      ctx: ActorContext,
      input: Omit<SupplierCreateInput, "organizationId"> & { organizationId?: string },
    ) {
      assertCan(ctx, "purchase:manage");
      if (!input.name || input.name.trim() === "") {
        throw new CommerceError("validation", "supplier name is required");
      }
      assertValidSupplierInput(input);
      return repo.createSupplier(
        { ...input, organizationId: input.organizationId ?? siteConfig.organization.id },
        ctx,
      );
    },

    async updateSupplier(ctx: ActorContext, id: string, patch: SupplierUpdateInput) {
      assertCan(ctx, "purchase:manage");
      assertValidSupplierInput(patch);
      return repo.updateSupplier(id, patch, ctx);
    },

    async deleteSupplier(ctx: ActorContext, id: string) {
      assertCan(ctx, "purchase:manage");
      return repo.softDeleteSupplier(id, ctx);
    },

    async restoreSupplier(ctx: ActorContext, id: string) {
      assertCan(ctx, "purchase:manage");
      return repo.restoreSupplier(id, ctx);
    },

    async getSupplier(ctx: ActorContext, id: string) {
      assertCan(ctx, "purchase:manage");
      return repo.getSupplier(id);
    },

    async listSuppliers(ctx: ActorContext, options?: { includeDeleted?: boolean }) {
      assertCan(ctx, "purchase:manage");
      return repo.listSuppliers(options);
    },

    /** 公開投影（権限不要・内部情報なし）。 */
    async listPublicSuppliers() {
      return repo.listPublicSuppliers();
    },

    // ---- 仕入記録（買付） ----
    async createPurchase(
      ctx: ActorContext,
      input: Omit<PurchaseCreateInput, "organizationId"> & { organizationId?: string },
    ) {
      assertCan(ctx, "purchase:manage");
      if (!input.purchasedOn) {
        throw new CommerceError("validation", "purchasedOn is required");
      }
      for (const item of input.items ?? []) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new CommerceError("validation", "purchase item quantity must be a positive integer");
        }
        if (!Number.isInteger(item.unitPriceMinor) || item.unitPriceMinor < 0) {
          throw new CommerceError("validation", "purchase item unit price must be a non-negative integer");
        }
      }
      return repo.createPurchase(
        { ...input, organizationId: input.organizationId ?? siteConfig.organization.id },
        ctx,
      );
    },

    async getPurchase(ctx: ActorContext, id: string) {
      assertCan(ctx, "purchase:manage");
      return repo.getPurchase(id);
    },

    async listPurchases(ctx: ActorContext, options?: { includeDeleted?: boolean }) {
      assertCan(ctx, "purchase:manage");
      return repo.listPurchases(options);
    },

    async deletePurchase(ctx: ActorContext, id: string) {
      assertCan(ctx, "purchase:manage");
      return repo.softDeletePurchase(id, ctx);
    },

    async restorePurchase(ctx: ActorContext, id: string) {
      assertCan(ctx, "purchase:manage");
      return repo.restorePurchase(id, ctx);
    },

    async allocatePurchaseCosts(ctx: ActorContext, id: string, method: AllocationMethod) {
      assertCan(ctx, "purchase:manage");
      return repo.allocatePurchaseCosts(id, method, ctx);
    },
  };
}

export type ProcurementService = ReturnType<typeof createProcurementService>;
