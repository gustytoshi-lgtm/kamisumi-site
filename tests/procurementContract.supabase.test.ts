import { describe } from "vitest";
import { runProcurementContract } from "./procurementContractRunner";
import { shouldRunSupabaseContract, supabaseContractActor } from "./repositoryContractFixtures";
import { supabaseProcurementRepository } from "@/repositories/supabase/supabaseProcurementRepository";

/**
 * Supabase 調達 repository の契約テスト（mock と同一契約を流用）。
 * 実 DB が必要なため既定では SKIP。実行するには docs/SUPABASE_SETUP.md の手順 + 以下:
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RUN_SUPABASE_CONTRACT=1 / SUPABASE_CONTRACT_ACTOR_ID
 *   migrations 0001-0007 適用済みの開発 project（本番では実行しない＝破壊的）。
 *   org は service と同様に slug/未指定でも実 UUID へ解決される（resolveOrgId）。
 */
if (shouldRunSupabaseContract()) {
  runProcurementContract("supabase", () => supabaseProcurementRepository, supabaseContractActor());
} else {
  describe.skip("procurement repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / contract actor が未設定。
  });
}
