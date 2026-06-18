import { describe } from "vitest";
import { runProcurementContract } from "./procurementContractRunner";
import { supabaseProcurementRepository } from "@/repositories/supabase/supabaseProcurementRepository";

/**
 * Supabase 調達 repository の契約テスト（mock と同一契約を流用）。
 * 実 DB が必要なため既定では SKIP。実行するには docs/SUPABASE_SETUP.md の手順 + 以下:
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RUN_SUPABASE_CONTRACT=1
 *   migrations 0001-0007 適用済みの開発 project（本番では実行しない＝破壊的）。
 */
const SHOULD_RUN =
  process.env.RUN_SUPABASE_CONTRACT === "1" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (SHOULD_RUN) {
  runProcurementContract("supabase", () => supabaseProcurementRepository);
} else {
  describe.skip("procurement repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / seed が未設定。
  });
}
