import { describe } from "vitest";
import { runSettingsContract } from "./settingsContractRunner";
import { shouldRunSupabaseContract, supabaseContractActor } from "./repositoryContractFixtures";
import { supabaseSettingsRepository } from "@/repositories/supabase/supabaseSettingsRepository";

/**
 * Supabase 業務設定 repository の契約テスト（実 DB 必須・既定 skip）。
 * migrations 0001-0015 + seed を適用し、SUPABASE_CONTRACT_ACTOR_ID に profiles.id を指定して実行する。
 */
if (shouldRunSupabaseContract()) {
  runSettingsContract("supabase", () => supabaseSettingsRepository, supabaseContractActor());
} else {
  describe.skip("settings repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / contract actor が未設定。
  });
}
