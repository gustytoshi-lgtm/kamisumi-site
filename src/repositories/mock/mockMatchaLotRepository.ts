import { siteConfig } from "@/config/site";
import type { MatchaLotRepository } from "@/repositories/core/matchaLotRepository";
import type {
  MatchaLotCreateInput,
  MatchaLotRecord,
  MatchaLotUpdateInput,
} from "@/repositories/core/matchaLotModels";
import { CommerceError } from "@/repositories/core/writeModels";

/**
 * 開発・テスト用 in-memory 抹茶ロット repository（reset/seed、fixture 非破壊）。
 * 数量更新は adjustQuantity 経由で非負を保証する。
 */
export type MockMatchaLotRepository = MatchaLotRepository & { reset(): void; seed(): void };

const ORG = siteConfig.organization.id;

export function createMockMatchaLotRepository(): MockMatchaLotRepository {
  let lots = new Map<string, MatchaLotRecord>();
  let counter = 0;
  let seq = 0;
  const now = () => new Date().toISOString();

  function seed() {
    lots = new Map();
    counter = 0;
    seq = 0;
  }

  function require(id: string): MatchaLotRecord {
    const lot = lots.get(id);
    if (!lot) throw new CommerceError("not_found", `matcha lot ${id} not found`);
    return lot;
  }

  const repo: MockMatchaLotRepository = {
    reset() {
      lots = new Map();
      counter = 0;
      seq = 0;
    },
    seed,
    async listLots(options) {
      let all = [...lots.values()];
      if (options?.productId) all = all.filter((l) => l.productId === options.productId);
      if (!options?.includeDeleted) all = all.filter((l) => !l.deletedAt);
      return all;
    },
    async getLot(id) {
      return lots.get(id) ?? null;
    },
    async createLot(input: MatchaLotCreateInput, _ctx) {
      void _ctx;
      const id = `lot-${++counter}`;
      const quantity = input.quantity ?? 0;
      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new CommerceError("validation", "quantity must be a non-negative integer");
      }
      const record: MatchaLotRecord = {
        id,
        organizationId: input.organizationId ?? ORG,
        productId: input.productId,
        lotCode: input.lotCode,
        teaHouse: input.teaHouse,
        bestBefore: input.bestBefore,
        purchasedOn: input.purchasedOn,
        storageLocation: input.storageLocation,
        quantity,
        reserved: 0,
        incoming: 0,
        fifoSeq: ++seq,
        createdAt: now(),
        updatedAt: now(),
      };
      lots.set(id, record);
      return record;
    },
    async updateLot(id, patch: MatchaLotUpdateInput, _ctx) {
      void _ctx;
      const lot = require(id);
      const updated = { ...lot, ...patch, updatedAt: now() };
      lots.set(id, updated);
      return updated;
    },
    async adjustQuantity(id, delta, _ctx) {
      void _ctx;
      const lot = require(id);
      const nextQuantity = lot.quantity + delta;
      if (nextQuantity < 0) {
        throw new CommerceError("negative_stock", "lot quantity would go negative", { id });
      }
      if (nextQuantity - lot.reserved < 0) {
        throw new CommerceError("insufficient_stock", "lot available would go negative", { id });
      }
      const updated = { ...lot, quantity: nextQuantity, updatedAt: now() };
      lots.set(id, updated);
      return updated;
    },
    async softDeleteLot(id, _ctx) {
      void _ctx;
      const lot = require(id);
      const updated = { ...lot, deletedAt: now() };
      lots.set(id, updated);
      return updated;
    },
    async restoreLot(id, _ctx) {
      void _ctx;
      const lot = require(id);
      const updated = { ...lot };
      delete updated.deletedAt;
      lots.set(id, updated);
      return updated;
    },
  };

  return repo;
}

export const mockMatchaLotRepository = createMockMatchaLotRepository();
mockMatchaLotRepository.seed();
