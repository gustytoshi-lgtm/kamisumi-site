import { describe } from "vitest";
import { runCustomerPortalContract } from "./customerPortalContractRunner";
import { shouldRunSupabaseCustomerContract } from "./repositoryContractFixtures";
import { supabaseCustomerPortalRepository } from "@/repositories/supabase/supabaseCustomerPortalRepository";

/**
 * Supabase 顧客マイページ repository の契約テスト（実 DB 必須・既定 skip）。
 * migrations 0001-0016 + seed を適用し、SUPABASE_CUSTOMER_CONTRACT_USER_ID に
 * customer_accounts へリンク済みの profiles.id を指定して実行する。
 */
if (shouldRunSupabaseCustomerContract()) {
  runCustomerPortalContract(
    "supabase",
    () => supabaseCustomerPortalRepository,
    process.env.SUPABASE_CUSTOMER_CONTRACT_USER_ID ?? "",
  );
} else {
  describe.skip("customer portal repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / customer account fixture が未設定。
  });
}
