import { runCustomerPortalContract } from "./customerPortalContractRunner";
import {
  createMockCustomerPortalRepository,
  MOCK_CUSTOMER_USER_ID,
} from "@/repositories/mock/mockCustomerPortalRepository";

runCustomerPortalContract("mock", () => createMockCustomerPortalRepository(), MOCK_CUSTOMER_USER_ID);
