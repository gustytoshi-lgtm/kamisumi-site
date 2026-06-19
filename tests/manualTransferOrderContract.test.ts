import { runManualTransferOrderContract } from "./manualTransferOrderContractRunner";
import { createMockManualTransferOrderRepository } from "@/lib/commerce/checkoutOrder";
import { mockContractActor } from "./repositoryContractFixtures";

runManualTransferOrderContract(
  "mock",
  () => createMockManualTransferOrderRepository(),
  mockContractActor,
);
