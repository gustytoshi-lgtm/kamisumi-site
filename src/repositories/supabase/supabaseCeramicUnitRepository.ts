import type { CeramicUnitRepository } from "@/repositories/core/ceramicUnitRepository";

/**
 * Supabase 陶器個体 repository のスケルトン。
 * ceramic_units（0003 + 0011 status/updated_at/deleted_at）への実装は実 DB 接続時に行う（mock と同契約）。
 * 未接続では factory が mock を返すため到達しない。
 */
function notImplemented(method: string): never {
  throw new Error(
    `SupabaseCeramicUnitRepository.${method} is not implemented yet. Use mock mode (unset DATA_BACKEND).`,
  );
}

export const supabaseCeramicUnitRepository: CeramicUnitRepository = {
  async listUnits() {
    return notImplemented("listUnits");
  },
  async getUnit() {
    return notImplemented("getUnit");
  },
  async createUnit() {
    return notImplemented("createUnit");
  },
  async updateUnit() {
    return notImplemented("updateUnit");
  },
  async setStatus() {
    return notImplemented("setStatus");
  },
  async softDeleteUnit() {
    return notImplemented("softDeleteUnit");
  },
  async restoreUnit() {
    return notImplemented("restoreUnit");
  },
};
