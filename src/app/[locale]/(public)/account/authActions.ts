"use server";

import { redirect } from "next/navigation";
import { isCustomerPortalEnabled } from "@/config/features";
import { defaultLocale, isLocale } from "@/config/site";
import { getCustomerAuthMode } from "@/lib/customer/auth";
import type { ActionState } from "@/lib/admin/actionState";

/**
 * 顧客マイページのサインイン/サインアウト（Supabase Auth モードのみ）。
 * admin の authActions と同じ方針: flag/モードを再確認し、失敗詳細はログのみ・UI へは汎用コード。
 * mock モードは CUSTOMER_DEV_* を使うためサインイン不要。
 */
function parseLocale(formData: FormData) {
  const value = String(formData.get("locale") ?? "").trim();
  return isLocale(value) ? value : defaultLocale;
}

export async function customerSignInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isCustomerPortalEnabled()) return { ok: false, code: "invalidCredentials" };
  if (getCustomerAuthMode() !== "supabase") return { ok: false, code: "invalidCredentials" };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = parseLocale(formData);
  if (!email || !password) return { ok: false, code: "missingFields" };

  const { getSupabaseServerAuthClient } = await import("@/lib/supabase/server");
  const supabase = await getSupabaseServerAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("customer signIn failed");
    return { ok: false, code: "invalidCredentials" };
  }
  redirect(`/${locale}/account`);
}

export async function customerSignOutAction(formData: FormData): Promise<void> {
  const locale = parseLocale(formData);
  if (getCustomerAuthMode() === "supabase") {
    const { getSupabaseServerAuthClient } = await import("@/lib/supabase/server");
    const supabase = await getSupabaseServerAuthClient();
    await supabase.auth.signOut();
  }
  redirect(`/${locale}/account`);
}
