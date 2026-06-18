import { describe } from "vitest";
import { runFulfillmentContract } from "./fulfillmentContractRunner";
import { supabaseFulfillmentRepository } from "@/repositories/supabase/supabaseFulfillmentRepository";

/**
 * Supabase フルフィルメント repository の契約テスト（mock と同一契約を流用）。
 * 実 DB が必要なため既定では SKIP（migrations 0001-0008 + RUN_SUPABASE_CONTRACT=1）。
 */
const SHOULD_RUN =
  process.env.RUN_SUPABASE_CONTRACT === "1" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (SHOULD_RUN) {
  runFulfillmentContract("supabase", () => supabaseFulfillmentRepository);
} else {
  describe.skip("fulfillment repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / seed が未設定。
  });
}
