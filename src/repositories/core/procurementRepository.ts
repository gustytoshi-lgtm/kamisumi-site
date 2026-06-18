import type { ActorContext } from "./writeModels";
import type {
  CostAllocationRecord,
  PublicSupplier,
  PurchaseCreateInput,
  PurchaseRecord,
  SupplierCreateInput,
  SupplierRecord,
  SupplierUpdateInput,
} from "./procurementModels";
import type { AllocationMethod } from "@/lib/commerce/costAllocation";

/**
 * Phase 2B 調達ドメインの書込/読取契約。mock / Supabase が同一契約を満たす（contract test で保証）。
 *
 * 責務分担（commerce 側と同じ）:
 *   - repository: 原子的な永続化 + 監査記録（操作ユーザー）。
 *   - 上位 procurementService: RBAC（purchase:manage 等）と業務ルール。
 *
 * 公開投影 listPublicSuppliers は内部情報（note/contact/原価）を含まない PublicSupplier のみ返す。
 */
export interface ProcurementRepository {
  // ---- 仕入先 ----
  createSupplier(input: SupplierCreateInput, ctx: ActorContext): Promise<SupplierRecord>;
  updateSupplier(
    id: string,
    patch: SupplierUpdateInput,
    ctx: ActorContext,
  ): Promise<SupplierRecord>;
  softDeleteSupplier(id: string, ctx: ActorContext): Promise<SupplierRecord>;
  restoreSupplier(id: string, ctx: ActorContext): Promise<SupplierRecord>;
  getSupplier(id: string): Promise<SupplierRecord | null>;
  /** 管理用一覧（既定で論理削除を除外）。内部情報を含む。 */
  listSuppliers(options?: { includeDeleted?: boolean }): Promise<SupplierRecord[]>;
  /** 公開用一覧（public_level='public' のみ・内部情報を落とす）。非公開を漏らさない。 */
  listPublicSuppliers(): Promise<PublicSupplier[]>;

  // ---- 仕入記録（買付） ----
  createPurchase(input: PurchaseCreateInput, ctx: ActorContext): Promise<PurchaseRecord>;
  getPurchase(id: string): Promise<PurchaseRecord | null>;
  listPurchases(options?: { includeDeleted?: boolean }): Promise<PurchaseRecord[]>;
  softDeletePurchase(id: string, ctx: ActorContext): Promise<PurchaseRecord>;
  restorePurchase(id: string, ctx: ActorContext): Promise<PurchaseRecord>;
  /**
   * 付帯費用を method で明細へ配賦して cost_allocations を置き換える。
   * allocations の合計は付帯費用合計に一致する（none を除く）。
   */
  allocatePurchaseCosts(
    id: string,
    method: AllocationMethod,
    ctx: ActorContext,
  ): Promise<CostAllocationRecord[]>;
}
