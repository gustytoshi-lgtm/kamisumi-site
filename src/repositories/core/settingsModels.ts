/**
 * 編集可能な業務設定（§8）。管理画面から安全に変更できる項目のみをホワイトリストで定義する。
 *
 * ここに無いキー（API鍵・service role・DB接続・実口座番号・RLS・migration 等）は
 * 管理 UI から変更させない（§14）。検証・履歴・操作者・更新日時を必須とする。
 */
export type SettingType = "email" | "url" | "text" | "int" | "bool";

export type SettingGroup = "brand" | "sales" | "content";

export type SettingDefinition = {
  key: string;
  group: SettingGroup;
  type: SettingType;
  required: boolean;
  /** 確定済みでない（仮の）値か。UI で「未確定」を区別表示する。 */
  provisional?: boolean;
  min?: number;
};

/** 管理画面で編集してよい設定のホワイトリスト。 */
export const EDITABLE_SETTINGS: readonly SettingDefinition[] = [
  { key: "contact_email", group: "brand", type: "email", required: false, provisional: true },
  { key: "social_threads", group: "brand", type: "url", required: false, provisional: true },
  { key: "social_instagram", group: "brand", type: "url", required: false, provisional: true },
  { key: "hold_hours", group: "sales", type: "int", required: true, min: 1 },
  { key: "order_accepting", group: "sales", type: "bool", required: true },
  { key: "restock_accept", group: "sales", type: "bool", required: true },
];

export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return EDITABLE_SETTINGS.find((s) => s.key === key);
}

export function isEditableSettingKey(key: string): boolean {
  return EDITABLE_SETTINGS.some((s) => s.key === key);
}

export type SettingRecord = {
  key: string;
  value: string;
  updatedBy?: string;
  updatedAt: string;
};

export type SettingHistoryEntry = {
  id: string;
  key: string;
  oldValue: string | null;
  newValue: string;
  changedBy: string;
  changedAt: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 設定値の検証。型に合わなければエラーメッセージを返す（null なら OK）。 */
export function validateSettingValue(def: SettingDefinition, value: string): string | null {
  const v = value.trim();
  if (def.required && v === "") return "required";
  if (v === "" && !def.required) return null;
  switch (def.type) {
    case "email":
      return EMAIL_RE.test(v) ? null : "invalid_email";
    case "url":
      return /^https?:\/\/.+/.test(v) ? null : "invalid_url";
    case "int": {
      const n = Number(v);
      if (!Number.isInteger(n)) return "invalid_int";
      if (def.min !== undefined && n < def.min) return "too_small";
      return null;
    }
    case "bool":
      return v === "on" || v === "off" ? null : "invalid_bool";
    case "text":
    default:
      return null;
  }
}
