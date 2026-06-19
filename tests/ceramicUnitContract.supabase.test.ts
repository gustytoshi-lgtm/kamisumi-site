import { describe } from "vitest";
import { runCeramicUnitContract } from "./ceramicUnitContractRunner";
import { shouldRunSupabaseContract, supabaseContractActor } from "./repositoryContractFixtures";
import { supabaseCeramicUnitRepository } from "@/repositories/supabase/supabaseCeramicUnitRepository";

/**
 * Supabase 陶器個体 repository の契約テスト（実 DB 必須・既定 skip）。
 * migrations 0001-0011 + seed を適用し、SUPABASE_CONTRACT_ACTOR_ID に profiles.id を指定して実行する。
 */
if (shouldRunSupabaseContract()) {
  runCeramicUnitContract("supabase", () => supabaseCeramicUnitRepository, supabaseContractActor());
} else {
  describe.skip("ceramic unit repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / contract actor が未設定。
  });
}
