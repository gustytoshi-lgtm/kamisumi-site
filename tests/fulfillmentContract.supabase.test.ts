import { describe } from "vitest";
import { runFulfillmentContract } from "./fulfillmentContractRunner";
import {
  CONTRACT_BRAND_ID,
  CONTRACT_ORG_ID,
  CONTRACT_STORE_ID,
  shouldRunSupabaseContract,
  supabaseContractActor,
} from "./repositoryContractFixtures";
import { supabaseFulfillmentRepository } from "@/repositories/supabase/supabaseFulfillmentRepository";
import { supabaseCommerceWriteRepository } from "@/repositories/supabase/supabaseCommerceWriteRepository";

/**
 * Supabase フルフィルメント repository の契約テスト（mock と同一契約を流用）。
 * 実 DB が必要なため既定では SKIP（migrations 0001-0008 + RUN_SUPABASE_CONTRACT=1 + SUPABASE_CONTRACT_ACTOR_ID）。
 * shipments.order_id は provisional_orders への FK のため、呼出ごとに実 order を作成して UUID を渡す。
 */
if (shouldRunSupabaseContract()) {
  runFulfillmentContract("supabase", () => supabaseFulfillmentRepository, supabaseContractActor(), {
    organizationId: CONTRACT_ORG_ID,
    nextOrderId: async () => {
      const order = await supabaseCommerceWriteRepository.createOrder(
        { brandId: CONTRACT_BRAND_ID, storeId: CONTRACT_STORE_ID, currency: "TWD" },
        supabaseContractActor(),
      );
      return order.id;
    },
  });
} else {
  describe.skip("fulfillment repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / contract actor が未設定。
  });
}
