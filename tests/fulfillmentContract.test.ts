import { createMockFulfillmentRepository } from "@/repositories/mock/mockFulfillmentRepository";
import { runFulfillmentContract } from "./fulfillmentContractRunner";
import { mockContractActor } from "./repositoryContractFixtures";

export { runFulfillmentContract };

let mockOrderSeq = 0;
runFulfillmentContract("mock", () => createMockFulfillmentRepository(), mockContractActor(), {
  organizationId: "org-test",
  nextOrderId: async () => `order-${++mockOrderSeq}`,
});
