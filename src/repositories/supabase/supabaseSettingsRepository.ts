import type { SettingsRepository } from "@/repositories/core/settingsRepository";

/**
 * Supabase 設定リポジトリのスケルトン。
 * site_settings（0002）を現在値、変更履歴は別表（追加 migration 予定）または audit_logs を想定。
 * 実 DB 接続時に実装する（mock と同契約）。未接続では factory が mock を返すため到達しない。
 */
function notImplemented(method: string): never {
  throw new Error(
    `SupabaseSettingsRepository.${method} is not implemented yet. Use mock mode (unset DATA_BACKEND).`,
  );
}

export const supabaseSettingsRepository: SettingsRepository = {
  async listSettings() {
    return notImplemented("listSettings");
  },
  async getSetting() {
    return notImplemented("getSetting");
  },
  async updateSetting() {
    return notImplemented("updateSetting");
  },
  async listHistory() {
    return notImplemented("listHistory");
  },
};
