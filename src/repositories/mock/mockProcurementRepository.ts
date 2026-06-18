import { siteConfig } from "@/config/site";
import type { ProcurementRepository } from "@/repositories/core/procurementRepository";
import {
  purchaseAncillaryTotalMinor,
  purchaseItemNetMinor,
  toPublicSupplier,
  type CostAllocationRecord,
  type PublicSupplier,
  type PurchaseItemRecord,
  type PurchaseRecord,
  type SupplierRecord,
} from "@/repositories/core/procurementModels";
import { CommerceError, type ActorContext, type AuditEntry } from "@/repositories/core/writeModels";
import { allocateCost, toDbMethod, type AllocationBasis } from "@/lib/commerce/costAllocation";

const ORG = siteConfig.organization.id;

/**
 * 開発・テスト専用の in-memory 調達 repository。reset()/seed() で状態分離。
 * 注意: 開発サーバー再起動で状態は消える（本番DBの代替ではない）。
 */
export type MockProcurementRepository = ProcurementRepository & {
  reset(): void;
  seed(): void;
  listAuditLogs(): AuditEntry[];
};

type Store = {
  suppliers: Map<string, SupplierRecord>;
  purchases: Map<string, PurchaseRecord>;
  audit: AuditEntry[];
  counter: number;
};

function emptyStore(): Store {
  return { suppliers: new Map(), purchases: new Map(), audit: [], counter: 0 };
}

export function createMockProcurementRepository(): MockProcurementRepository {
  let store = emptyStore();
  const now = () => new Date().toISOString();
  const id = (prefix: string) => `${prefix}-${++store.counter}`;
  const audit = (
    ctx: ActorContext,
    action: string,
    entityId: string,
    summary?: string,
    entityType = "supplier",
  ): void => {
    store.audit.push({
      id: `audit-${store.audit.length + 1}`,
      actorId: ctx.userId,
      action,
      entityType,
      entityId,
      summary,
      createdAt: now(),
    });
  };

  function requireSupplier(supplierId: string): SupplierRecord {
    const supplier = store.suppliers.get(supplierId);
    if (!supplier) throw new CommerceError("not_found", `supplier ${supplierId} not found`);
    return supplier;
  }

  return {
    reset() {
      store = emptyStore();
    },
    seed() {
      store = emptyStore();
      const ts = now();
      const sample: SupplierRecord = {
        id: id("supplier"),
        organizationId: ORG,
        name: "宇治茶舗（サンプル）",
        region: "Uji",
        publicLevel: "public",
        countryCode: "JP",
        defaultCurrency: "JPY",
        createdAt: ts,
        updatedAt: ts,
      };
      store.suppliers.set(sample.id, sample);
      const privateSupplier: SupplierRecord = {
        id: id("supplier"),
        organizationId: ORG,
        name: "非公開ルート（サンプル）",
        region: "Kyoto",
        publicLevel: "private",
        note: "内部メモ: 公開しない",
        contact: "line:example",
        countryCode: "JP",
        defaultCurrency: "JPY",
        createdAt: ts,
        updatedAt: ts,
      };
      store.suppliers.set(privateSupplier.id, privateSupplier);
    },
    listAuditLogs() {
      return store.audit.slice();
    },

    async createSupplier(input, ctx) {
      const ts = now();
      const supplier: SupplierRecord = {
        id: id("supplier"),
        organizationId: input.organizationId || ORG,
        name: input.name,
        region: input.region,
        publicLevel: input.publicLevel ?? "private",
        note: input.note,
        contact: input.contact,
        defaultCurrency: input.defaultCurrency,
        countryCode: input.countryCode,
        brandId: input.brandId,
        createdAt: ts,
        updatedAt: ts,
      };
      store.suppliers.set(supplier.id, supplier);
      audit(ctx, "create", supplier.id, supplier.name);
      return supplier;
    },

    async updateSupplier(supplierId, patch, ctx) {
      const supplier = requireSupplier(supplierId);
      const next: SupplierRecord = {
        ...supplier,
        ...patch,
        // organizationId / id は変更不可。
        id: supplier.id,
        organizationId: supplier.organizationId,
        updatedAt: now(),
      };
      store.suppliers.set(supplierId, next);
      audit(ctx, "update", supplierId);
      return next;
    },

    async softDeleteSupplier(supplierId, ctx) {
      const supplier = requireSupplier(supplierId);
      const next = { ...supplier, deletedAt: now(), updatedAt: now() };
      store.suppliers.set(supplierId, next);
      audit(ctx, "delete", supplierId);
      return next;
    },

    async restoreSupplier(supplierId, ctx) {
      const supplier = requireSupplier(supplierId);
      const next = { ...supplier, deletedAt: undefined, updatedAt: now() };
      store.suppliers.set(supplierId, next);
      audit(ctx, "restore", supplierId);
      return next;
    },

    async getSupplier(supplierId) {
      return store.suppliers.get(supplierId) ?? null;
    },

    async listSuppliers(options) {
      const all = [...store.suppliers.values()];
      const filtered = options?.includeDeleted ? all : all.filter((s) => !s.deletedAt);
      return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async listPublicSuppliers(): Promise<PublicSupplier[]> {
      return [...store.suppliers.values()]
        .filter((s) => !s.deletedAt && s.publicLevel === "public")
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(toPublicSupplier);
    },

    async createPurchase(input, ctx) {
      const ts = now();
      const purchaseId = id("purchase");
      const items: PurchaseItemRecord[] = (input.items ?? []).map((item) => ({
        id: id("purchase-item"),
        purchaseId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        taxMinor: item.taxMinor ?? 0,
        discountMinor: item.discountMinor ?? 0,
      }));
      const record: PurchaseRecord = {
        id: purchaseId,
        organizationId: input.organizationId || ORG,
        supplierId: input.supplierId,
        scheduleId: input.scheduleId,
        purchasedOn: input.purchasedOn,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        domesticShippingMinor: input.domesticShippingMinor ?? 0,
        transportMinor: input.transportMinor ?? 0,
        parkingMinor: input.parkingMinor ?? 0,
        highwayMinor: input.highwayMinor ?? 0,
        otherExpenseMinor: input.otherExpenseMinor ?? 0,
        note: input.note,
        items,
        allocations: [],
        createdAt: ts,
        updatedAt: ts,
      };
      store.purchases.set(purchaseId, record);
      audit(ctx, "create", purchaseId, input.supplierId, "purchase");
      return record;
    },

    async getPurchase(purchaseId) {
      return store.purchases.get(purchaseId) ?? null;
    },

    async listPurchases(options) {
      const all = [...store.purchases.values()];
      const filtered = options?.includeDeleted ? all : all.filter((p) => !p.deletedAt);
      return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async softDeletePurchase(purchaseId, ctx) {
      const purchase = store.purchases.get(purchaseId);
      if (!purchase) throw new CommerceError("not_found", `purchase ${purchaseId} not found`);
      const next = { ...purchase, deletedAt: now(), updatedAt: now() };
      store.purchases.set(purchaseId, next);
      audit(ctx, "delete", purchaseId, undefined, "purchase");
      return next;
    },

    async restorePurchase(purchaseId, ctx) {
      const purchase = store.purchases.get(purchaseId);
      if (!purchase) throw new CommerceError("not_found", `purchase ${purchaseId} not found`);
      const next = { ...purchase, deletedAt: undefined, updatedAt: now() };
      store.purchases.set(purchaseId, next);
      audit(ctx, "restore", purchaseId, undefined, "purchase");
      return next;
    },

    async allocatePurchaseCosts(purchaseId, method, ctx) {
      const purchase = store.purchases.get(purchaseId);
      if (!purchase) throw new CommerceError("not_found", `purchase ${purchaseId} not found`);
      const totalMinor = purchaseAncillaryTotalMinor(purchase);
      const total = { currency: purchase.currency, amountMinor: totalMinor };
      const lines: AllocationBasis[] = purchase.items.map((item) => ({
        quantity: item.quantity,
        purchaseValueMinor: purchaseItemNetMinor(item),
      }));
      const allocated = allocateCost(total, method, lines);
      const records: CostAllocationRecord[] = allocated.map((amount, index) => ({
        id: id("cost-alloc"),
        purchaseId,
        purchaseItemId: purchase.items[index]?.id,
        method: toDbMethod(method),
        allocatedCurrency: amount.currency,
        allocatedAmountMinor: amount.amountMinor,
      }));
      const next = { ...purchase, allocations: records, updatedAt: now() };
      store.purchases.set(purchaseId, next);
      audit(ctx, "cost_allocation", purchaseId, method, "purchase");
      return records;
    },
  };
}

/** アプリ既定の mock 調達 repository（プロセス内シングルトン、seed 済み）。 */
export const mockProcurementRepository: MockProcurementRepository = (() => {
  const repo = createMockProcurementRepository();
  repo.seed();
  return repo;
})();
