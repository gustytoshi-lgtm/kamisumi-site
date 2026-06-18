import type { CeramicUnitRepository } from "@/repositories/core/ceramicUnitRepository";
import type {
  CeramicUnitCreateInput,
  CeramicUnitRecord,
  CeramicUnitStatus,
  CeramicUnitUpdateInput,
} from "@/repositories/core/ceramicUnitModels";
import { CommerceError } from "@/repositories/core/writeModels";

/** 開発・テスト用 in-memory 陶器個体 repository（reset/seed, fixture 非破壊）。 */
export type MockCeramicUnitRepository = CeramicUnitRepository & { reset(): void; seed(): void };

export function createMockCeramicUnitRepository(): MockCeramicUnitRepository {
  let units = new Map<string, CeramicUnitRecord>();
  let counter = 0;
  const now = () => new Date().toISOString();

  function req(id: string): CeramicUnitRecord {
    const u = units.get(id);
    if (!u) throw new CommerceError("not_found", `ceramic unit ${id} not found`);
    return u;
  }

  const repo: MockCeramicUnitRepository = {
    reset() {
      units = new Map();
      counter = 0;
    },
    seed() {
      units = new Map();
      counter = 0;
    },
    async listUnits(options) {
      let all = [...units.values()];
      if (options?.productId) all = all.filter((u) => u.productId === options.productId);
      if (!options?.includeDeleted) all = all.filter((u) => !u.deletedAt);
      return all;
    },
    async getUnit(id) {
      return units.get(id) ?? null;
    },
    async createUnit(input: CeramicUnitCreateInput, _ctx) {
      void _ctx;
      if (!input.productId || !input.unitCode) {
        throw new CommerceError("validation", "productId and unitCode are required");
      }
      if (input.costMinor !== undefined && (!Number.isInteger(input.costMinor) || input.costMinor < 0)) {
        throw new CommerceError("validation", "costMinor must be a non-negative integer");
      }
      const id = `cer-${++counter}`;
      const record: CeramicUnitRecord = {
        id,
        productId: input.productId,
        unitCode: input.unitCode,
        status: "available",
        cost:
          input.costMinor !== undefined
            ? { currency: input.costCurrency ?? "TWD", amountMinor: input.costMinor }
            : undefined,
        dimensions: input.dimensions,
        weightGrams: input.weightGrams,
        glaze: input.glaze,
        condition: input.condition,
        variationNote: input.variationNote,
        boxIncluded: input.boxIncluded,
        inspectionResult: input.inspectionResult,
        createdAt: now(),
        updatedAt: now(),
      };
      units.set(id, record);
      return record;
    },
    async updateUnit(id, patch: CeramicUnitUpdateInput, _ctx) {
      void _ctx;
      const u = req(id);
      const updated = { ...u, ...patch, updatedAt: now() };
      units.set(id, updated);
      return updated;
    },
    async setStatus(id, status: CeramicUnitStatus, _ctx) {
      void _ctx;
      const u = req(id);
      const updated = { ...u, status, updatedAt: now() };
      units.set(id, updated);
      return updated;
    },
    async softDeleteUnit(id, _ctx) {
      void _ctx;
      const u = req(id);
      const updated = { ...u, deletedAt: now() };
      units.set(id, updated);
      return updated;
    },
    async restoreUnit(id, _ctx) {
      void _ctx;
      const u = req(id);
      const updated = { ...u };
      delete updated.deletedAt;
      units.set(id, updated);
      return updated;
    },
  };

  return repo;
}

export const mockCeramicUnitRepository = createMockCeramicUnitRepository();
mockCeramicUnitRepository.seed();
