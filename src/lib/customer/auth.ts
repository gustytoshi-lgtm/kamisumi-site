import type { Locale } from "@/config/site";
import { defaultLocale, isLocale } from "@/config/site";
import { getDataBackend } from "@/config/dataBackend";
import { MOCK_CUSTOMER_USER_ID } from "@/repositories/mock/mockCustomerPortalRepository";
import { getCustomerPortalRepository } from "@/repositories";

export type CustomerAuthMode = "mock" | "supabase";

export type CustomerSession = {
  userId: string;
  customerId: string;
  organizationId: string;
  preferredLocale: Locale;
};

export function getCustomerAuthMode(): CustomerAuthMode {
  const explicit = process.env.CUSTOMER_AUTH_MODE;
  if (explicit === "mock" || explicit === "supabase") return explicit;
  return getDataBackend() === "supabase" ? "supabase" : "mock";
}

async function getMockCustomerSession(): Promise<CustomerSession | null> {
  if (process.env.CUSTOMER_DEV_ENABLED === "false") return null;
  const userId = process.env.CUSTOMER_DEV_USER_ID ?? MOCK_CUSTOMER_USER_ID;
  const account = await getCustomerPortalRepository().getAccountByUserId(userId);
  if (!account) return null;
  return {
    userId: account.userId,
    customerId: account.customerId,
    organizationId: account.organizationId,
    preferredLocale: account.preferredLocale,
  };
}

async function getSupabaseCustomerSession(): Promise<CustomerSession | null> {
  const { getSupabaseServerAuthClient } = await import("@/lib/supabase/server");
  const supabase = await getSupabaseServerAuthClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;
  const account = await getCustomerPortalRepository().getAccountByUserId(userData.user.id);
  if (!account) return null;
  return {
    userId: account.userId,
    customerId: account.customerId,
    organizationId: account.organizationId,
    preferredLocale: account.preferredLocale,
  };
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  return getCustomerAuthMode() === "supabase" ? getSupabaseCustomerSession() : getMockCustomerSession();
}

export function resolveCustomerLocale(publicLocale?: string, session?: CustomerSession | null): Locale {
  if (session) return session.preferredLocale;
  return publicLocale && isLocale(publicLocale) ? publicLocale : defaultLocale;
}
