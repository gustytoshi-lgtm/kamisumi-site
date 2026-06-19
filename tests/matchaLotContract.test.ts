import { runMatchaLotContract } from "./matchaLotContractRunner";
import { mockContractActor } from "./repositoryContractFixtures";
import { createMockMatchaLotRepository } from "@/repositories/mock/mockMatchaLotRepository";

runMatchaLotContract("mock", () => createMockMatchaLotRepository(), mockContractActor());
