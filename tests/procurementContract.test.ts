import { createMockProcurementRepository } from "@/repositories/mock/mockProcurementRepository";
import { runProcurementContract } from "./procurementContractRunner";

/**
 * mock 調達 repository の契約テスト。Supabase 実装は procurementContract.supabase.test.ts
 * （実 DB 必須・既定 skip）で同じランナーを流用する。
 */
export { runProcurementContract };

runProcurementContract("mock", () => {
  const repo = createMockProcurementRepository();
  return repo;
});
