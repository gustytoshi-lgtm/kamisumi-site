import type { MatchaLotRepository } from "@/repositories/core/matchaLotRepository";

/**
 * Supabase 抹茶ロット repository のスケルトン。
 * matcha_lots（0001 + 0010 quantity/updated_at/deleted_at）に対する実装は実 DB 接続時に行う（mock と同契約）。
 * 数量調整は行ロック + 非負ガード（apply_inventory_movement に倣い）または UPDATE ... where で実装する想定。
 * 未接続では factory が mock を返すため到達しない。
 */
function notImplemented(method: string): never {
  throw new Error(
    `SupabaseMatchaLotRepository.${method} is not implemented yet. Use mock mode (unset DATA_BACKEND).`,
  );
}

export const supabaseMatchaLotRepository: MatchaLotRepository = {
  async listLots() {
    return notImplemented("listLots");
  },
  async getLot() {
    return notImplemented("getLot");
  },
  async createLot() {
    return notImplemented("createLot");
  },
  async updateLot() {
    return notImplemented("updateLot");
  },
  async adjustQuantity() {
    return notImplemented("adjustQuantity");
  },
  async softDeleteLot() {
    return notImplemented("softDeleteLot");
  },
  async restoreLot() {
    return notImplemented("restoreLot");
  },
};
