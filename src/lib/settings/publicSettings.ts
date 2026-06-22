import { siteConfig } from "@/config/site";
import { getSettingsRepository } from "@/repositories";

/**
 * 公開サイトが参照してよい業務設定の実効値（owner 編集値 → siteConfig 既定値の順にフォールバック）。
 *
 * EDITABLE_SETTINGS のうち公開面に関わるキーのみを投影する。API 鍵・口座番号などは
 * そもそも EDITABLE_SETTINGS に無く、ここにも現れない。owner 限定の運用値（hold_hours 等）は
 * 機密ではないため公開導線の案内に利用してよい。
 */
export type PublicSettings = {
  contactEmail: string;
  socialThreads: string;
  socialInstagram: string;
  orderAccepting: boolean;
  holdHours: number;
};

/** 公開前の仮メール（デモ用プレースホルダ）。これと空文字は「未確定」とみなし表示しない。 */
const PLACEHOLDER_EMAIL = "hello@example.com";

/**
 * 業務設定リポジトリから公開向け実効値を読む（owner 編集が同一バックエンドへ反映される）。
 * 既定は mock。DATA_BACKEND=supabase のときは設定リポジトリ（実 DB）から読む。
 */
export async function getPublicSettings(): Promise<PublicSettings> {
  const records = await getSettingsRepository().listSettings();
  const values = new Map(records.map((record) => [record.key, record.value]));
  const get = (key: string, fallback: string) => {
    const value = values.get(key);
    return value === undefined ? fallback : value;
  };

  return {
    contactEmail: get("contact_email", siteConfig.contact.email ?? ""),
    socialThreads: get("social_threads", siteConfig.socials.threads ?? ""),
    socialInstagram: get("social_instagram", siteConfig.socials.instagram ?? ""),
    orderAccepting: get("order_accepting", "on") !== "off",
    holdHours: toPositiveInt(get("hold_hours", "48"), 48),
  };
}

/** 公開表示してよい確定メールか（空・プレースホルダは表示しない）。 */
export function hasPublicContactEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed !== "" && trimmed !== PLACEHOLDER_EMAIL;
}

/** http(s) で始まる確定 URL のみ公開リンクにする。 */
export function isPublicUrl(value: string): boolean {
  return /^https?:\/\/.+/.test(value.trim());
}

function toPositiveInt(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
