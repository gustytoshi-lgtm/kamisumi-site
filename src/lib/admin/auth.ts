import type { Locale } from "@/config/site";
import type { AdminLocale } from "@/dictionaries/admin";
import { isRole, type Role } from "@/lib/commerce/rbac";

/**
 * 管理画面の認証アダプタ（サーバー専用）。
 *
 * 現在は mock 実装: 環境変数 ADMIN_DEV_ROLE（owner/front_staff/inventory_staff/editor）で
 * 開発用セッションを返す。未設定なら null（＝未ログイン）。
 *
 * Phase 2A 本実装では Supabase Auth の session から user_id と user_roles を取得して
 * 同じ AdminSession を返すよう、この関数だけを差し替える（呼び出し側は変更不要）。
 */
export type AdminSession = {
  userId: string;
  role: Role;
  adminLocale: AdminLocale;
};

export function getAdminSession(): AdminSession | null {
  const devRole = process.env.ADMIN_DEV_ROLE;
  if (devRole && isRole(devRole)) {
    return { userId: "dev-user", role: devRole, adminLocale: "ja" };
  }
  return null;
}

/** 公開 locale と セッションの admin_locale から、管理画面の表示言語を決める。 */
export function resolveAdminLocale(
  publicLocale: Locale,
  session: AdminSession | null,
): AdminLocale {
  if (session) return session.adminLocale;
  return publicLocale === "zh-tw" ? "zh-tw" : "ja";
}
