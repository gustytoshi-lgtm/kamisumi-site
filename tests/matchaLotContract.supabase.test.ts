import { describe } from "vitest";
import { runMatchaLotContract } from "./matchaLotContractRunner";
import { shouldRunSupabaseContract, supabaseContractActor } from "./repositoryContractFixtures";
import { supabaseMatchaLotRepository } from "@/repositories/supabase/supabaseMatchaLotRepository";

/**
 * Supabase 抹茶ロット repository の契約テスト（実 DB 必須・既定 skip）。
 * migrations 0001-0010 + seed を適用し、SUPABASE_CONTRACT_ACTOR_ID に profiles.id を指定して実行する。
 */
if (shouldRunSupabaseContract()) {
  runMatchaLotContract("supabase", () => supabaseMatchaLotRepository, supabaseContractActor());
} else {
  describe.skip("matcha lot repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / contract actor が未設定。
  });
}
