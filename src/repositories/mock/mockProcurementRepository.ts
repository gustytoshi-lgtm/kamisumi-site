import { siteConfig } from "@/config/site";
import type { ProcurementRepository } from "@/repositories/core/procurementRepository";
import {
  toPublicSupplier,
  type PublicSupplier,
  type SupplierRecord,
} from "@/repositories/core/procurementModels";
import { CommerceError, type ActorContext, type AuditEntry } from "@/repositories/core/writeModels";

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
  audit: AuditEntry[];
  counter: number;
};

function emptyStore(): Store {
  return { suppliers: new Map(), audit: [], counter: 0 };
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
  ): void => {
    store.audit.push({
      id: `audit-${store.audit.length + 1}`,
      actorId: ctx.userId,
      action,
      entityType: "supplier",
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
  };
}

/** アプリ既定の mock 調達 repository（プロセス内シングルトン、seed 済み）。 */
export const mockProcurementRepository: MockProcurementRepository = (() => {
  const repo = createMockProcurementRepository();
  repo.seed();
  return repo;
})();
