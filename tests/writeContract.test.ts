import { createMockWriteRepository } from "@/repositories/mock/mockCommerceWriteRepository";
import { runWriteContract } from "./writeContractRunner";
import { mockContractActor } from "./repositoryContractFixtures";

/**
 * mock 書込 repository の契約テスト。共通ランナー（writeContractRunner）を流用する。
 * Supabase 実装の契約テストは writeContract.supabase.test.ts（実 DB 必須・既定 skip）。
 */
export { runWriteContract };

runWriteContract(
  "mock",
  () => {
    const repo = createMockWriteRepository();
    repo.seed();
    return repo;
  },
  mockContractActor(),
  { productId: "p1", brandId: "b", storeId: "s" },
);
