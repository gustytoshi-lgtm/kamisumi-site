import type { ActorContext } from "@/repositories/core/writeModels";

export const CONTRACT_ORG_ID = "00000000-0000-0000-0000-0000000000a1";
export const CONTRACT_BRAND_ID = "00000000-0000-0000-0000-0000000000b1";
export const CONTRACT_STORE_ID = "00000000-0000-0000-0000-0000000000d1";
export const CONTRACT_MATCHA_PRODUCT_ID = "00000000-0000-0000-0000-000000010001";
export const CONTRACT_CERAMIC_PRODUCT_ID = "00000000-0000-0000-0000-000000010002";

export function uniqueContractSuffix(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function mockContractActor(): ActorContext {
  return { userId: "contract", role: "owner" };
}

export function supabaseContractActor(): ActorContext {
  return { userId: process.env.SUPABASE_CONTRACT_ACTOR_ID ?? "", role: "owner" };
}

export function shouldRunSupabaseContract(): boolean {
  return (
    process.env.RUN_SUPABASE_CONTRACT === "1" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    Boolean(process.env.SUPABASE_CONTRACT_ACTOR_ID)
  );
}

export function shouldRunSupabaseCustomerContract(): boolean {
  return shouldRunSupabaseContract() && Boolean(process.env.SUPABASE_CUSTOMER_CONTRACT_USER_ID);
}
