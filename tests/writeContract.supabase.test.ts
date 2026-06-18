import { describe } from "vitest";
import { runWriteContract } from "./writeContractRunner";
import { supabaseCommerceWriteRepository } from "@/repositories/supabase/supabaseCommerceWriteRepository";

/**
 * Supabase 書込 repository の契約テスト（mock と同一契約 runWriteContract を流用）。
 *
 * 実 DB が必要なため既定では SKIP。実行するには:
 *   1. 開発用 Supabase project を用意（本番では実行しない＝破壊的）
 *   2. .env.local に以下を設定:
 *        NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 *        RUN_SUPABASE_CONTRACT=1
 *   3. migrations 0001-0005 + seed を適用（docs/SUPABASE_SETUP.md 参照）
 *   4. 実行:
 *        npm run test -- writeContract.supabase
 *
 * 注意: runWriteContract は productId "p1" 等のダミーIDを使うため、
 *       Supabase では FK 制約により createInventoryItem が失敗する。
 *       実 DB 実行時は seed 済みの実 product UUID を使う専用 setup へ差し替えること
 *       （TODO: seed の固定 UUID を使う supabase 専用 contract に拡張）。
 *       現段階ではこのファイルは「実行手順の記録」と describe.skip の枠を提供する。
 */
const SHOULD_RUN =
  process.env.RUN_SUPABASE_CONTRACT === "1" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (SHOULD_RUN) {
  // 実 DB 接続時のみ。runWriteContract は seed 済み UUID を前提に拡張予定（上記 TODO）。
  runWriteContract("supabase", () => supabaseCommerceWriteRepository);
} else {
  describe.skip("write repository contract: supabase (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / seed が未設定。
    // 設定後 RUN_SUPABASE_CONTRACT=1 で有効化（docs/SUPABASE_SETUP.md §9-2）。
  });
}
