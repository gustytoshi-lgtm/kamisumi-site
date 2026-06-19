import { describe } from "vitest";
import { runManualTransferOrderContract } from "./manualTransferOrderContractRunner";
import { shouldRunSupabaseContract, supabaseContractActor } from "./repositoryContractFixtures";
import { supabaseCheckoutOrderRepository } from "@/repositories/supabase/supabaseCheckoutOrderRepository";

/**
 * Supabase 手動振込 注文台帳 repository の契約テスト（実 DB 必須・既定 skip）。
 * migrations 0001-0017 + seed（organizations の固定 org）を適用し、
 * RUN_SUPABASE_CONTRACT=1 + Supabase env を設定して実行する。
 */
if (shouldRunSupabaseContract()) {
  runManualTransferOrderContract(
    "supabase",
    () => supabaseCheckoutOrderRepository,
    supabaseContractActor,
  );
} else {
  describe.skip("manual transfer order contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env が未設定（資格情報なし）。
  });
}
