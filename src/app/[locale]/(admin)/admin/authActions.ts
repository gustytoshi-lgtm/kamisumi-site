"use server";

import { redirect } from "next/navigation";
import { isAdminEnabled } from "@/config/features";
import { getAdminAuthMode } from "@/lib/admin/auth";
import type { ActionState } from "@/lib/admin/actionState";

/**
 * 管理画面サインイン（Supabase Auth モードのみ）。email/password で signInWithPassword し、
 * 成功時に Cookie セッションを張って /admin へ遷移する。mock モードでは ADMIN_DEV_ROLE を使うため不要。
 * 失敗詳細はログのみ。UI へは汎用コードだけ返す（資格情報の有無を漏らさない）。
 */
export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isAdminEnabled()) return { ok: false, code: "invalidCredentials" };
  if (getAdminAuthMode() !== "supabase") return { ok: false, code: "invalidCredentials" };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ja");
  if (!email || !password) return { ok: false, code: "missingFields" };

  const { getSupabaseServerAuthClient } = await import("@/lib/supabase/server");
  const supabase = await getSupabaseServerAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("admin signIn failed");
    return { ok: false, code: "invalidCredentials" };
  }
  redirect(`/${locale}/admin`);
}

/** 管理画面サインアウト（Supabase セッション破棄）。 */
export async function signOutAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "ja");
  if (getAdminAuthMode() === "supabase") {
    const { getSupabaseServerAuthClient } = await import("@/lib/supabase/server");
    const supabase = await getSupabaseServerAuthClient();
    await supabase.auth.signOut();
  }
  redirect(`/${locale}/admin`);
}
