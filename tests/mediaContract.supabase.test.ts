import { describe } from "vitest";
import { runMediaContract } from "./mediaContractRunner";
import { shouldRunSupabaseContract, supabaseContractActor } from "./repositoryContractFixtures";
import { supabaseMediaRepository } from "@/repositories/supabase/supabaseMediaRepository";

/**
 * Supabase メディア repository の契約テスト（実 DB 必須・既定 skip）。
 * migrations 0001-0014 + seed を適用し、SUPABASE_CONTRACT_ACTOR_ID に profiles.id を指定して実行する。
 * Storage への実ファイル upload は対象外で、media_assets メタデータ契約のみ検証する。
 */
if (shouldRunSupabaseContract()) {
  runMediaContract("supabase", () => supabaseMediaRepository, supabaseContractActor());
} else {
  describe.skip("media repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / contract actor が未設定。
  });
}
