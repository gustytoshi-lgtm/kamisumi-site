import type { SettingsRepository } from "@/repositories/core/settingsRepository";
import {
  getSettingDefinition,
  isEditableSettingKey,
  validateSettingValue,
} from "@/repositories/core/settingsModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { can, type Permission } from "./rbac";

/**
 * 業務設定サービス。settings:manage（owner）に限定し、ホワイトリスト外キーと不正値を拒否する。
 * API鍵・口座・RLS・migration はホワイトリストに無いため、ここを通しても変更できない（§14）。
 */
const SETTINGS_PERMISSION: Permission = "settings:manage";

function assertCan(ctx: ActorContext): void {
  if (!can(ctx.role, SETTINGS_PERMISSION)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${SETTINGS_PERMISSION}`);
  }
}

export function createSettingsService(repo: SettingsRepository) {
  return {
    async listSettings(ctx: ActorContext) {
      assertCan(ctx);
      return repo.listSettings();
    },
    async getSetting(ctx: ActorContext, key: string) {
      assertCan(ctx);
      return repo.getSetting(key);
    },
    async updateSetting(ctx: ActorContext, key: string, value: string) {
      assertCan(ctx);
      const def = getSettingDefinition(key);
      if (!def || !isEditableSettingKey(key)) {
        throw new CommerceError("forbidden", `setting ${key} is not editable from admin`);
      }
      const error = validateSettingValue(def, value);
      if (error) {
        throw new CommerceError("validation", `invalid value for ${key}: ${error}`, { key, error });
      }
      return repo.updateSetting(key, value.trim(), ctx);
    },
    async listHistory(ctx: ActorContext, key?: string) {
      assertCan(ctx);
      return repo.listHistory(key);
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
