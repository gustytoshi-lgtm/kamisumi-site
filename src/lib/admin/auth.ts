import type { Locale } from "@/config/site";
import type { AdminLocale } from "@/dictionaries/admin";
import { getDataBackend } from "@/config/dataBackend";
import { ROLES, isRole, type Role } from "@/lib/commerce/rbac";

/**
 * 管理画面の認証アダプタ（サーバー専用）。呼び出し側は実装モードを意識しない。
 *
 * 2 モードを切り替える（getAdminAuthMode）:
 *   - "mock": 環境変数 ADMIN_DEV_ROLE で開発用セッションを返す（既定。実 DB 不要）。
 *   - "supabase": Supabase Auth の Cookie セッションから user を取り、user_roles / profiles を
 *     RLS（user_id = auth.uid() / id = auth.uid() の self-read ポリシー, 0004）で読んで返す。
 *
 * いずれのモードでも返り値は同じ AdminSession。これにより管理ルート・server action・
 * service・repository への認可フローは実装モードに依存しない。
 */
export type AdminSession = {
  userId: string;
  role: Role;
  adminLocale: AdminLocale;
};

export type AdminAuthMode = "mock" | "supabase";

// 組織 KAGURAKOJI の固定 UUID（supabase/seed.sql / docs/SUPABASE_SETUP.md と一致）。
const KAGURAKOJI_ORG_ID = "00000000-0000-0000-0000-0000000000a1";

/**
 * 認証モードの決定。明示の ADMIN_AUTH_MODE を最優先し、未指定なら
 * データバックエンドに追従する（supabase バックエンド時のみ Supabase Auth）。
 * これにより mock 開発では従来どおり ADMIN_DEV_ROLE で動作する。
 */
export function getAdminAuthMode(): AdminAuthMode {
  const explicit = process.env.ADMIN_AUTH_MODE;
  if (explicit === "supabase" || explicit === "mock") return explicit;
  return getDataBackend() === "supabase" ? "supabase" : "mock";
}

function getMockAdminSession(): AdminSession | null {
  const devRole = process.env.ADMIN_DEV_ROLE;
  if (devRole && isRole(devRole)) {
    // 管理画面の表示言語は利用者設定（profiles.admin_locale）。mock では ADMIN_DEV_LOCALE で
    // 切り替え可能にし、人間が日本語/繁體中文の両方を確認できるようにする（既定 ja）。
    const adminLocale: AdminLocale = process.env.ADMIN_DEV_LOCALE === "zh-tw" ? "zh-tw" : "ja";
    return { userId: "dev-user", role: devRole, adminLocale };
  }
  return null;
}

/** 複数ロールを持つ場合は最上位（ROLES の並び＝owner 優先）を採用する。 */
export function pickPrimaryRole(roles: readonly string[]): Role | null {
  const valid = roles.filter(isRole);
  if (valid.length === 0) return null;
  return valid.reduce((best, current) =>
    ROLES.indexOf(current) < ROLES.indexOf(best) ? current : best,
  );
}

async function getSupabaseAdminSession(): Promise<AdminSession | null> {
  // 動的 import: mock モードや env 未設定では supabase server client を読み込まない
  //（"server-only" 境界をテスト/ビルドで不必要に巻き込まない）。
  const { getSupabaseServerAuthClient } = await import("@/lib/supabase/server");
  const supabase = await getSupabaseServerAuthClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const userId = userData.user.id;

  // RLS の self-read で自分のロールのみ取得（service role を使わない）。
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", KAGURAKOJI_ORG_ID);
  const role = pickPrimaryRole((roleRows ?? []).map((row) => String(row.role)));
  if (!role) return null; // 認証済みでもロール未割当なら管理権限なし。

  const { data: profile } = await supabase
    .from("profiles")
    .select("admin_locale")
    .eq("id", userId)
    .maybeSingle();
  const adminLocale: AdminLocale = profile?.admin_locale === "zh-tw" ? "zh-tw" : "ja";

  return { userId, role, adminLocale };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (getAdminAuthMode() === "supabase") {
    return getSupabaseAdminSession();
  }
  return getMockAdminSession();
}

/** 公開 locale と セッションの admin_locale から、管理画面の表示言語を決める。 */
export function resolveAdminLocale(
  publicLocale: Locale,
  session: AdminSession | null,
): AdminLocale {
  if (session) return session.adminLocale;
  return publicLocale === "zh-tw" ? "zh-tw" : "ja";
}
