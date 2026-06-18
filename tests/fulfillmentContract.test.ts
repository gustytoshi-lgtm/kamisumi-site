import { createMockFulfillmentRepository } from "@/repositories/mock/mockFulfillmentRepository";
import { runFulfillmentContract } from "./fulfillmentContractRunner";

export { runFulfillmentContract };

runFulfillmentContract("mock", () => createMockFulfillmentRepository());
