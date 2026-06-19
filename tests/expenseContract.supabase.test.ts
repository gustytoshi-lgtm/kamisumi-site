import { describe } from "vitest";
import { runExpenseContract } from "./expenseContractRunner";
import { shouldRunSupabaseContract, supabaseContractActor } from "./repositoryContractFixtures";
import { supabaseExpenseRepository } from "@/repositories/supabase/supabaseExpenseRepository";

/**
 * Supabase 経費 repository の契約テスト（実 DB 必須・既定 skip）。
 * migrations 0001-0012 + seed を適用し、SUPABASE_CONTRACT_ACTOR_ID に profiles.id を指定して実行する。
 */
if (shouldRunSupabaseContract()) {
  runExpenseContract("supabase", () => supabaseExpenseRepository, supabaseContractActor());
} else {
  describe.skip("expense repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / contract actor が未設定。
  });
}
