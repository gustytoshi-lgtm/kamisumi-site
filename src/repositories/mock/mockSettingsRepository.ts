import { siteConfig } from "@/config/site";
import type { SettingsRepository } from "@/repositories/core/settingsRepository";
import { EDITABLE_SETTINGS, type SettingHistoryEntry, type SettingRecord } from "@/repositories/core/settingsModels";
import type { ActorContext } from "@/repositories/core/writeModels";

/**
 * 開発・テスト用 in-memory 設定リポジトリ（reset/seed、fixture 非破壊）。
 * 既定値は siteConfig / env から seed する。変更履歴も保持する。
 */
export type MockSettingsRepository = SettingsRepository & { reset(): void; seed(): void };

function defaultValueFor(key: string): string {
  switch (key) {
    case "contact_email":
      return siteConfig.contact.email ?? "";
    case "social_threads":
      return siteConfig.socials.threads ?? "";
    case "social_instagram":
      return siteConfig.socials.instagram ?? "";
    case "hold_hours":
      return process.env.HOLD_DEFAULT_HOURS ?? "48";
    case "order_accepting":
      return "on";
    case "restock_accept":
      return "on";
    default:
      return "";
  }
}

export function createMockSettingsRepository(): MockSettingsRepository {
  let values = new Map<string, SettingRecord>();
  let history: SettingHistoryEntry[] = [];
  let counter = 0;
  const now = () => new Date().toISOString();

  function seed() {
    values = new Map();
    history = [];
    counter = 0;
    for (const def of EDITABLE_SETTINGS) {
      values.set(def.key, { key: def.key, value: defaultValueFor(def.key), updatedAt: now() });
    }
  }

  const repo: MockSettingsRepository = {
    reset() {
      values = new Map();
      history = [];
      counter = 0;
    },
    seed,
    async listSettings() {
      return [...values.values()];
    },
    async getSetting(key) {
      return values.get(key) ?? null;
    },
    async updateSetting(key, value, ctx: ActorContext) {
      const prev = values.get(key) ?? null;
      const record: SettingRecord = { key, value, updatedBy: ctx.userId, updatedAt: now() };
      values.set(key, record);
      history.push({
        id: `sh-${++counter}`,
        key,
        oldValue: prev?.value ?? null,
        newValue: value,
        changedBy: ctx.userId,
        changedAt: now(),
      });
      return record;
    },
    async listHistory(key) {
      const all = [...history].reverse();
      return key ? all.filter((h) => h.key === key) : all;
    },
  };

  return repo;
}

export const mockSettingsRepository = createMockSettingsRepository();
mockSettingsRepository.seed();
