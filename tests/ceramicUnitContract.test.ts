import { runCeramicUnitContract } from "./ceramicUnitContractRunner";
import { mockContractActor } from "./repositoryContractFixtures";
import { createMockCeramicUnitRepository } from "@/repositories/mock/mockCeramicUnitRepository";

runCeramicUnitContract("mock", () => createMockCeramicUnitRepository(), mockContractActor());
