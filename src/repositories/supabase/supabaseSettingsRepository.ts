import { siteConfig } from "@/config/site";
import type { SettingsRepository } from "@/repositories/core/settingsRepository";
import type { SettingHistoryEntry, SettingRecord } from "@/repositories/core/settingsModels";
import type { ActorContext } from "@/repositories/core/writeModels";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase 業務設定 repository（site_settings 現在値 = 0002 / setting_history 履歴 = 0015）。
 * 値は site_settings.value(jsonb) に文字列として保持する。RBAC/編集可否は settingsService（owner）が担う。
 */
const ORG = siteConfig.organization.id;

type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
}

function mapSetting(row: Record<string, unknown>): SettingRecord {
  return {
    key: row.key as string,
    value: asString(row.value),
    updatedBy: (row.updated_by as string | null) ?? undefined,
    updatedAt: (row.updated_at as string) ?? "",
  };
}

export const supabaseSettingsRepository: SettingsRepository = {
  async listSettings() {
    const client = db();
    const { data, error } = await client
      .from("site_settings")
      .select("key, value, updated_by, updated_at")
      .eq("organization_id", ORG);
    if (error) throwCommerce(error);
    return (data ?? []).map((r) => mapSetting(r as Record<string, unknown>));
  },
  async getSetting(key) {
    const client = db();
    const { data, error } = await client
      .from("site_settings")
      .select("key, value, updated_by, updated_at")
      .eq("organization_id", ORG)
      .eq("key", key)
      .maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapSetting(data as Record<string, unknown>) : null;
  },
  async updateSetting(key, value, ctx: ActorContext) {
    const client = db();
    // 変更前値（履歴用）
    const prev = await this.getSetting(key);
    const { data, error } = await client
      .from("site_settings")
      .upsert(
        {
          organization_id: ORG,
          key,
          value,
          updated_by: ctx.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,key" },
      )
      .select("key, value, updated_by, updated_at")
      .single();
    if (error) throwCommerce(error);
    const { error: histError } = await client.from("setting_history").insert({
      organization_id: ORG,
      key,
      old_value: prev?.value ?? null,
      new_value: value,
      changed_by: ctx.userId,
    });
    if (histError) throwCommerce(histError);
    return mapSetting(data as Record<string, unknown>);
  },
  async listHistory(key) {
    const client = db();
    let query = client
      .from("setting_history")
      .select("*")
      .eq("organization_id", ORG)
      .order("changed_at", { ascending: false });
    if (key) query = query.eq("key", key);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map(
      (row): SettingHistoryEntry => ({
        id: (row as Record<string, unknown>).id as string,
        key: (row as Record<string, unknown>).key as string,
        oldValue: ((row as Record<string, unknown>).old_value as string | null) ?? null,
        newValue: (row as Record<string, unknown>).new_value as string,
        changedBy: ((row as Record<string, unknown>).changed_by as string | null) ?? "",
        changedAt: (row as Record<string, unknown>).changed_at as string,
      }),
    );
  },
};
