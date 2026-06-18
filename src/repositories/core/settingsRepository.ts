import type { ActorContext } from "./writeModels";
import type { SettingHistoryEntry, SettingRecord } from "./settingsModels";

/**
 * 業務設定の書込/読取契約。mock / Supabase が同一契約を満たす。
 * 値の検証・権限は上位 settingsService が担う。repository は永続化と履歴記録のみ。
 */
export interface SettingsRepository {
  listSettings(): Promise<SettingRecord[]>;
  getSetting(key: string): Promise<SettingRecord | null>;
  /** 値を更新し、変更前後を履歴に記録する。 */
  updateSetting(key: string, value: string, ctx: ActorContext): Promise<SettingRecord>;
  listHistory(key?: string): Promise<SettingHistoryEntry[]>;
}
